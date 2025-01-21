import {Server, Socket} from "socket.io";
import {ESharedEvents} from "./events/ESharedEvents";
import {ETournamentEvents} from "./events/ETournamentEvents";
import SocketWrapper from "./SocketWrapper";
import Tournament from "../model/Tournament";
import TournamentService from "../services/TournamentService";
import UserDAO from "../dao/UserDAO";
import User from "../model/User";
import TournamentNode from "../model/TournamentNode";
import userDAO from "../dao/UserDAO";
import TournamentDAO from "../dao/TournamentDAO";
import BattleService from "../services/BattleService";

type BracketUpdateDate = {
    battleId: number;
    winnerIds: number[];
    tournamentId: number;
}

type TournamentCreationData = {
    tournamentId: number;
    code: string;
}

type TournamentJoinedData = {
    tournamentId: number;
    tournamentName: string;
    tournamentParticipants: TournamentParticipant[];
}

export type TournamentParticipant = {
    name: string;
    id: number;
}

type BracketStartData = {
    battleId: number;
    userIds: number[];
    tree: string;
}

class TournamentSocket {

    public setSocket(io: Server, wrapper: SocketWrapper) {
        wrapper.socket.on(ETournamentEvents.TOURNAMENT_CREATION, (name: string) => {
            console.log(`Creating tournament named ${name}`)
            const tournament: Tournament | null = TournamentService.createTournament(name, wrapper.userId);
            if(!tournament) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: "User could not be found."
                })
                return;
            }
            const data : TournamentCreationData = {
                tournamentId: tournament.id,
                code: tournament.code
            }
            wrapper.socket.join(`tournament_${tournament.id}`)
            io.to(wrapper.socket.id).emit(ETournamentEvents.TOURNAMENT_CREATED, data);
        })

        wrapper.socket.on(ETournamentEvents.TOURNAMENT_JOIN, (code: string) => {
            const  {tournament, retCode} = TournamentService.joinTournament(code, wrapper.userId);
            // Error handling (switch case ?)
            let errorMessage: string = "";
            if (retCode == -1) errorMessage = "User not found."
            else if (retCode == -2) errorMessage = "User already in another tournament."
            else if (retCode == -3 || !tournament) errorMessage = "Tournament not found."
            else if (retCode == -4) errorMessage = "Tournament is full."
            else if (retCode == -5) errorMessage = "User is already inside the tournament."
            else if (retCode == -6) errorMessage = "Tournament has already started."
            if (retCode != 1) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: retCode,
                    message: errorMessage
                });
                return;
            }
            if (!tournament) return; // For ts compiler
            console.log(`User ${wrapper.userId} joined the tournament ${tournament.id}.`)
            wrapper.socket.join(`tournament_${tournament.id}`)
            // Send data to all participants
            const participants: TournamentParticipant[] = TournamentService.getParticipants(tournament);
            tournament.usersId.forEach((id: number) => {
                const user: User | undefined = UserDAO.getUserById(id)
                if (!user) return;
                const data: TournamentJoinedData = {
                    tournamentId : tournament.id,
                    tournamentName: tournament.name,
                    tournamentParticipants: participants
                }
                io.to(`user_${user.id}`).emit(ETournamentEvents.TOURNAMENT_JOINED, data)
            })
        })

        wrapper.socket.on(ETournamentEvents.TOURNAMENT_START, (tournamentId: number) => {
            const tournament: Tournament | undefined = TournamentService.getTournament(tournamentId);
            if (!tournament) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: "Tournament not found."
                })
                return;
            }
            const firstBracket: TournamentNode[] | null = TournamentService.startTournament(tournament);
            if (!firstBracket) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 2,
                    message: "Bracket failed to be computed."
                })
                return;
            }
            console.log(`Tournament ${tournament.id} is starting !`)
            firstBracket.forEach((node: TournamentNode) => {
                node.userIds.forEach((id: number) => {
                    const user: User | undefined = userDAO.getUserById(id);
                    if (!user) return;
                    const data: BracketStartData = {
                        battleId : node.battleId,
                        userIds : node.userIds,
                        tree : tournament.serializeTree(),
                    }
                    //io.to(user.tournamentSocketId).emit(ETournamentEvents.TOURNAMENT_BRACKET_START,data)
                    io.to(`user_${user.id}`).emit(ETournamentEvents.TOURNAMENT_BRACKET_START, data)
                })
            })
        })

        wrapper.socket.on(ETournamentEvents.TOURNAMENT_UPDATE, (tournamentId: number) => {
            const tournament: Tournament | undefined = TournamentService.getTournament(tournamentId);
            if (!tournament) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: "Tournament not found."
                })
                return;
            }
            console.log(`Tournament ${tournament.id} was queried for update.`)
            wrapper.socket.emit(ETournamentEvents.TOURNAMENT_UPDATED, {tree: tournament.serializeTree()})
        })
    }

    handleDisconnect(io: Server, socket: SocketWrapper): void {
        // Check if player not in tournament, and if so, disconnect him.
        const user: User | undefined = UserDAO.getUserById(socket.userId);
        if (!user) return;
        if (user.tournamentId == -1) return;
        const tournament: Tournament | null = TournamentService.handleDisconnect(socket.userId);
        // Warn other players
        if (!tournament) return;
        const participants: TournamentParticipant[] = TournamentService.getParticipants(tournament);
        tournament.usersId.forEach((id: number) => {
            const user: User | undefined = UserDAO.getUserById(id)
            if (!user) return;
            const data: TournamentJoinedData = {
                tournamentId : tournament.id,
                tournamentName: tournament.name,
                tournamentParticipants: participants
            }
            io.to(`user_${user.id}`).emit(ETournamentEvents.TOURNAMENT_JOINED, data)
        })
    }
}

export default new TournamentSocket();