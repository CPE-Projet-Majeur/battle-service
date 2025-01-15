import {Server, Socket} from "socket.io";
import eventBus from "../bus/TournamentEventListener";
import {EEvents} from "./events/EEvents";
import {ETournamentActions} from "./events/ETournamentActions";
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
    tree: Map<number, TournamentNode[]>;
}

type TournamentEndData = {
    winnersIds: number[];
}

class TournamentSocket {

    public setSocket(io: Server, wrapper: SocketWrapper) {
        //eventBus.on(EEvents.BRACKET_UPDATE, (data: BracketUpdateDate)=> {
        // eventBus.on(EEvents.BRACKET_UPDATE, (data: BracketUpdateDate)=> {
        //     console.log(`Battle ${data.battleId} updated for tournament ${data.tournamentId}'s current bracket!`);
        //     const tournament: Tournament | undefined = TournamentService.getTournament(data.tournamentId);
        //     if (!tournament) return
        //     const update : boolean = TournamentService.updateTournamentBattle(tournament, data.battleId, data.winnerIds)
        //     if (!update) return
        //     // If tournament is over
        //     if(TournamentService.isTournamentOver(tournament)) {
        //         console.log(`Tournament ${tournament.id} is over ! Winners : ${tournament.winners}`)
        //         const data : TournamentEndData = {
        //             winnersIds: tournament.winners
        //         }
        //         //io.to(`tournament_${tournament.id}`).emit(ETournamentActions.TOURNAMENT_OVER, data);
        //         //wrapper.socket.emit(ETournamentActions.TOURNAMENT_OVER, data);
        //         // tournament.usersId.forEach((id: number) => {
        //         //     const user: User | undefined = UserDAO.getUserById(id)
        //         //     if (!user) return;
        //         //     io.to(user.tournamentSocketId).emit(ETournamentActions.TOURNAMENT_OVER, data)
        //         // })
        //         wrapper.socket.emit(ETournamentActions.TOURNAMENT_OVER, data);
        //         return
        //     }
        //     // Else, if current bracket is over
        //     if(TournamentService.isCurrentBracketOver(tournament.id)){
        //         console.log(`Tournament ${tournament.id}'s current bracket (${tournament.currentBracket}) is over.`)
        //         const newBracket : TournamentNode[] | null = TournamentService.createNewBracket(tournament)
        //         if (!newBracket) return; // error
        //         newBracket.forEach((node: TournamentNode) => {
        //             node.userIds.forEach((id: number) => {
        //                 if (id != wrapper.userId) return
        //                 const user: User | undefined = userDAO.getUserById(id);
        //                 if (!user) return;
        //                 const data: BracketStartData = {
        //                     battleId : node.battleId,
        //                     userIds : node.userIds,
        //                     tree : tournament.tree,
        //                 }
        //                 // io.to(user.tournamentSocketId).emit(ETournamentActions.TOURNAMENT_BRACKET_START,data)4
        //                 console.log("broadcasting...")
        //                 wrapper.socket.broadcast.emit(ETournamentActions.TOURNAMENT_BRACKET_START,data);
        //             })
        //         })
        //     }
        //     // Else, do nothing
        // })

        wrapper.socket.on(ETournamentActions.TOURNAMENT_CREATION, (name: string) => {
            console.log(`Creating tournament named ${name}`)
            const tournament: Tournament = TournamentService.createTournament(name, wrapper.userId);
            const data : TournamentCreationData = {
                tournamentId: tournament.id,
                code: tournament.code
            }
            wrapper.socket.join(`tournament_${tournament.id}`)
            io.to(wrapper.socket.id).emit(ETournamentActions.TOURNAMENT_CREATED, data);
        })

        wrapper.socket.on(ETournamentActions.TOURNAMENT_JOIN, (code: string) => {
            const tournament: Tournament | null = TournamentService.joinTournament(code, wrapper.userId);
            if (!tournament) {
                // send error code
                return
            }
            console.log(`User ${wrapper.userId} joined the tournament ${tournament.id}.`)
            wrapper.socket.join(`tournament_${tournament.id}`)
            console.log("Rooms for socket:", wrapper.socket.rooms);
            // Get participants
            const participants: TournamentParticipant[] = TournamentService.getParticipants(tournament);
            // Send data to all participants
            tournament.usersId.forEach((id: number) => {
                const user: User | undefined = UserDAO.getUserById(id)
                if (!user) return;
                const data: TournamentJoinedData = {
                    tournamentId : tournament.id,
                    tournamentName: tournament.name,
                    tournamentParticipants: participants
                }
                io.to(user.tournamentSocketId).emit(ETournamentActions.TOURNAMENT_JOINED, data)
            })
        })

        wrapper.socket.on(ETournamentActions.TOURNAMENT_START, (tournamentId: number) => {
            const tournament: Tournament | undefined = TournamentService.getTournament(tournamentId);
            if (!tournament) return
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
                        //userNames: truc
                        tree : tournament.tree,
                    }
                    io.to(user.tournamentSocketId).emit(ETournamentActions.TOURNAMENT_BRACKET_START,data)
                })
            })
        })

        wrapper.socket.on(ETournamentActions.TOURNAMENT_UPDATE, (tournamentId: number) => {
            const tournament: Tournament | undefined = TournamentService.getTournament(tournamentId);
            if (!tournament) return
            console.log(`Tournament ${tournament.id} was queried for update.`)
            wrapper.socket.emit(ETournamentActions.TOURNAMENT_UPDATED, {tree: tournament.serializeTree()})
        })
    }
    //
    // const tournament: Tournament | undefined = TournamentDAO.getTournamentById(tournamentId);
    // if (!tournament) return false;

    handleDisconnect(): void {
        // tournamnt id = -1 ?

    }
}

export default new TournamentSocket();