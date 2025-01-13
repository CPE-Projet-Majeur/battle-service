import Tournament from "../model/Tournament";

class TournamentDAO {

    private _tournaments: Tournament[] = [];

    public getTournamentById(id: number): Tournament {
        return this._tournaments.find(tournament => tournament.id === id);
    }
}