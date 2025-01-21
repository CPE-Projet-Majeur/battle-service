import {ESharedEvents} from "../sockets/events/ESharedEvents";
import Tournament from "../model/Tournament";
import TournamentService from "../services/TournamentService";
import {ETournamentEvents} from "../sockets/events/ETournamentEvents";
import TournamentNode from "../model/TournamentNode";
import User from "../model/User";
import userDAO from "../dao/UserDAO";
import {Server} from "socket.io";
import {eventBus} from "./eventBus";
import UserDAO from "../dao/UserDAO";

type BracketUpdateDate = {
    battleId: number;
    winnerIds: number[];
    tournamentId: number;
}

/**
 * Sets the eventBus for communication between battleService/Socket and Tournament
 */
export default class TournamentEventListener {

    constructor(io: Server) {
        eventBus.on(ESharedEvents.BRACKET_UPDATE, (data: BracketUpdateDate)=> {
            console.log(`EVENT LISTENER : Battle ${data.battleId} updated for tournament ${data.tournamentId}'s current bracket!`);
            const tournament: Tournament | undefined = TournamentService.getTournament(data.tournamentId);
            if (!tournament) return
            const roomName: string = `tournament_${tournament.id}`
            const update : boolean = TournamentService.updateTournamentBattle(tournament, data.battleId, data.winnerIds)
            if (!update) return
            // If tournament is over
            if(TournamentService.isTournamentOver(tournament)) {
                console.log(`Tournament ${tournament.id} is over ! Winners : ${tournament.winners}`)
                // TODO : Get winners names (very ugly to do that here, rework architecture if time allows)
                const winnersNames: string[] = [];
                tournament.winners.forEach((id: number) => {
                    const user: User | undefined = UserDAO.getUserById(id);
                    if (!user) return;
                    winnersNames.push(user.firstName);
                })
                tournament.usersId.forEach((id: number) => {
                    const user: User | undefined = UserDAO.getUserById(id);
                    if (!user) return;
                    user.tournamentId = -1;
                    io.to(`user_${id}`).emit(ETournamentEvents.TOURNAMENT_OVER, {
                        winnersIds: tournament.winners,
                        winnersNames: winnersNames,
                        tree: tournament.serializeTree()
                    });
                })
                return
            }
            // Else, if current bracket is over
            if(TournamentService.isCurrentBracketOver(tournament.id)){
                console.log(`Tournament ${tournament.id}'s current bracket (${tournament.currentBracket}) is over.`)
                const newBracket : TournamentNode[] | null = TournamentService.createNewBracket(tournament)
                if (!newBracket) {
                    io.to(roomName).emit(ESharedEvents.ERROR, {
                        code: 1,
                        message: `Tournament ${tournament.id}'s new bracket could not be computed.`,
                    })
                    return;
                }
                newBracket.forEach((node: TournamentNode) => {
                    node.userIds.forEach((id: number) => {
                        //if (id != wrapper.userId) return
                        const user: User | undefined = userDAO.getUserById(id);
                        if (!user) return;
                        const data = { // : BracketStartData
                            battleId : node.battleId,
                            userIds : node.userIds,
                            tree : tournament.serializeTree(),
                        }
                        const roomName = `user_${user.id}`
                        console.log(`Sending to sockets in room ${roomName}`) // Non tournament socket linked to users will also receive it...
                        io.to(roomName).emit(ETournamentEvents.TOURNAMENT_BRACKET_START,data);
                    })
                })
            }
            // Else, do nothing
        })
    }

}