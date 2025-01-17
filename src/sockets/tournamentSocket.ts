import {Server, Socket} from "socket.io";
import eventBus from "../bus/TournamentEventListener";
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

type TournamentEndData = {
    winnersIds: number[];
}

class TournamentSocket {

    public setSocket(io: Server, wrapper: SocketWrapper) {
        wrapper.socket.on(ETournamentEvents.TOURNAMENT_CREATION, (name: string) => {
            console.log(`Creating tournament named ${name}`)
            const tournament: Tournament = TournamentService.createTournament(name, wrapper.userId);
            const data : TournamentCreationData = {
                tournamentId: tournament.id,
                code: tournament.code
            }
            wrapper.socket.join(`tournament_${tournament.id}`)
            io.to(wrapper.socket.id).emit(ETournamentEvents.TOURNAMENT_CREATED, data);
        })

        wrapper.socket.on(ETournamentEvents.TOURNAMENT_JOIN, (code: string) => {
            const tournament: Tournament | null = TournamentService.joinTournament(code, wrapper.userId);
            if (!tournament) {
                // send error code
                return
            }
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
                io.to(user.tournamentSocketId).emit(ETournamentEvents.TOURNAMENT_JOINED, data)
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
                console.log(`Tournament ${tournamentId} could not be started`)
                // Send error
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
                    io.to(user.tournamentSocketId).emit(ETournamentEvents.TOURNAMENT_BRACKET_START,data)
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

    handleDisconnect(): void {
        // tournamnt id = -1 ?

    }
}

export default new TournamentSocket();