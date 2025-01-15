import TournamentNode from "../model/TournamentNode";
import Tournament from "../model/Tournament";
import TournamentDAO from "../dao/TournamentDAO";
import BattleService from "./BattleService";
import {TournamentParticipant} from "../sockets/tournamentSocket";
import UserDAO from "../dao/UserDAO";
import User from "../model/User";

class TournamentService {

    // TODO : the socekt calls getTournament, and then all methods take tournament as input

    private static readonly _PLAYERS_PER_FIGHT = 2;
    private static readonly  _MAX_PLAYERS = 16;

    public getTournament(tournamentId: number): Tournament | undefined {
        return TournamentDAO.getTournamentById(tournamentId);
    }

    //////////////////// TOURNAMENT HANDLING ///////////////////
    public createTournament(name: string, userId: number): Tournament {
        const tournament: Tournament = TournamentDAO.save(new Tournament(-1, name, ''));
        tournament.usersId.push(userId);
        return tournament;
    }

    public joinTournament(code: string, userId: number): Tournament | null {
        const tournament: Tournament | undefined = TournamentDAO.getTournamentByCode(code);
        if (!tournament) return null;
        if (tournament.usersId.length >= TournamentService._MAX_PLAYERS) return null;
        if (tournament.usersId.findIndex(id => id === userId) > -1) return null; // User already in
        tournament.usersId.push(userId);
        return tournament;
    }

    public startTournament(tournament: Tournament): TournamentNode[] | null {
        if (tournament.active) return null; // Already started
        const bracket: TournamentNode[] | null = this.computeInitBracket(tournament);
        if (!bracket) return null;
        tournament.currentBracket = 0;
        tournament.tree.set(0, bracket);
        tournament.active = true;
        return bracket
    }

    /**
     * Update Battle in current bracket.
     * @param tournament
     * @param battleId
     * @param winners
     */
    public updateTournamentBattle(tournament: Tournament, battleId: number, winners: number[]): boolean {
        const currentBracket: TournamentNode[] | undefined = tournament.tree.get(tournament.currentBracket);
        if (!currentBracket) return false;
        const node : TournamentNode | undefined = currentBracket.find((t: TournamentNode) => t.battleId == battleId );
        if (!node) return false; // Battle not in bracket
        node.status = "finished";
        node.winners = winners;
        console.log(`Battle ${battleId} updated for tournament ${tournament.id}`)
        return true;
    }

    /**
     * Create new bracket for tournament
     * @param tournament
     */
    public createNewBracket(tournament: Tournament): TournamentNode[] | null {
        const newBracket: TournamentNode[] | null = this.computeNewBracket(tournament);
        if (!newBracket) return null;
        tournament.currentBracket ++
        tournament.tree.set(tournament.currentBracket, newBracket);
        return newBracket;
    }

    /**
     * Check if the current bracket is over
     * @param tournamentId
     */
    public isCurrentBracketOver(tournamentId: number): boolean {
        const tournament: Tournament | undefined = TournamentDAO.getTournamentById(tournamentId);
        if (!tournament) return false;
        const currentBracket: TournamentNode[] | undefined = tournament.tree.get(tournament.currentBracket);
        if (!currentBracket) return false;
        let ret: boolean = true;
        currentBracket.forEach((node: TournamentNode) => {
            if (node.status != "finished") ret = false;
        })
        return ret;
    }

    /**
     * Check if tournament is over and computes the winners if it is.
     * @param tournament
     */
    public isTournamentOver(tournament: Tournament): boolean {
        const currentBracket: TournamentNode[] | undefined = tournament.tree.get(tournament.currentBracket);
        if (!currentBracket) return false;
        if (currentBracket.length == 1 && currentBracket[0].status === "finished") {
            tournament.winners = currentBracket[0].winners;
            return true;
        }
        return false;
    }

    /**
     * Return winners of the tournament
     * @param tournament
     */
    public getWinners(tournament: Tournament): number[] {
        if (!tournament) return []
        const currentBracket: TournamentNode[] | undefined = tournament.tree.get(tournament.currentBracket)
        if (!currentBracket) return [];
        const winners: number[] = currentBracket[0].winners;
        if (winners.length > TournamentService._PLAYERS_PER_FIGHT) return []; // TODO : throw errors
        return winners;
    }

    public getParticipants(tournament: Tournament): TournamentParticipant[] {
        const participants: TournamentParticipant[] = [];
        tournament.usersId.forEach((id: number) => {
            const user: User | undefined = UserDAO.getUserById(id);
            if (!user) return;
            // TODO : remove user ?
            participants.push({
                name: user.firstName,
                id: user.id
            })
        })
        return participants;
    }

    public deleteTournament(tournament: Tournament): boolean {
        return TournamentDAO.deleteTournament(tournament)
    }

    ////////////// TOURNAMENT TREE METHODS ///////////////////
    private computeNewNode(tournament: Tournament, left: TournamentNode, right: TournamentNode): TournamentNode | null {
        const participants: number[] = left.winners.concat(right.winners);
        if (participants.length != TournamentService._PLAYERS_PER_FIGHT) {
            console.log(`Error : number of participant ${participants.length} is not matching requested number ${TournamentService._PLAYERS_PER_FIGHT}`);
            return null;
        }
        // Create battle for the given node
        const battleId: number = BattleService.createBattle(tournament.id, participants);
        return new TournamentNode(participants, left, right, battleId);
    }

    private computeInitBracket(tournament: Tournament): TournamentNode[] | null {
        if (!tournament.usersId || tournament.usersId.length === 0) return null;
        if (tournament.usersId.length % (TournamentService._PLAYERS_PER_FIGHT * 2) != 0) {
            console.log(`Number of players must be a multiple of ${TournamentService._PLAYERS_PER_FIGHT * 2} but is ${tournament.usersId.length}`)
            return null;
        }
        const bracket: TournamentNode[] = [];
        for(let i: number = 0; i < tournament.usersId.length; i = i + TournamentService._PLAYERS_PER_FIGHT){
            const participants : number[] = tournament.usersId.slice(i, i + TournamentService._PLAYERS_PER_FIGHT);
            const battleId: number = BattleService.createBattle(tournament.id, participants);
            bracket.push(new TournamentNode(participants, null, null, battleId));
        }
        return bracket;
    }

    private computeNewBracket(tournament:Tournament): TournamentNode[] | null {
        // Get current bracket
        const currentBracket: TournamentNode[] | undefined = tournament.tree.get(tournament.currentBracket)
        if (!currentBracket) return null;
        if (currentBracket.length % 2 !== 0) {
            console.log(`Error : number of battles in the current bracket is not even. (it is ${currentBracket.length})`)
            return null;
        }
        // Create new node
        const newBracket: TournamentNode[] = [];
        for (let i: number = 0; i < currentBracket.length; i = i + 2) {
            const newNode: TournamentNode | null = this.computeNewNode(tournament, currentBracket[i], currentBracket[i+1])
            if (!newNode) {
                console.log(`Failed to create new node for tournament ${tournament.id}`);
                return null;
            }
            newBracket.push(newNode);
        }
        return newBracket;
    }
}

export default new TournamentService();