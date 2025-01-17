import Tournament from "../model/Tournament";
import AbstractDAO from "./AbstractDAO";

class TournamentDAO extends AbstractDAO {

    private _tournaments: Tournament[] = [];

    private generateCode(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }
        return result;
    }

    public save(tournament: Tournament): Tournament {
        const id: number = this.generateId()
        const code: string = this.generateCode(8)
        const sTournament = new Tournament(id, tournament.name, code)
        this._tournaments.push(sTournament);
        return sTournament;
    }

    public getTournamentById(id: number): Tournament | undefined {
        return this._tournaments.find(tournament => tournament.id === id);
    }

    public getTournamentByCode(code: string): Tournament | undefined {
        return this._tournaments.find(tournament => tournament.code === code);
    }

    public deleteTournament(tournament: Tournament): boolean {
        const index: number = this._tournaments.findIndex(t => t.id === tournament.id);
        if (index === -1) return false;
        this._tournaments.splice(index, 1);
        return true;
    }
}

export default new TournamentDAO();