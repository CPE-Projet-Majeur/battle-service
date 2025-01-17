import Battle from "../model/Battle";
import AbstractDAO from "./AbstractDAO";
import User from "../model/User";

class BattleDAO extends AbstractDAO {

    private _battles: Battle[] = [];

    public save(battle: Battle): Battle {
        const id: number = this.generateId();
        const sBattle = new Battle(id, battle.tournamentId, battle.weather)
        this._battles.push(sBattle);
        return sBattle;
    }

    public getBattleById(id: number): Battle | undefined {
        return this._battles.find(battle => battle.id === id);
    }

    public delete(battle: Battle): boolean {
        const index: number = this._battles.findIndex(b => b.id === battle.id);
        if (index === -1) return false;
        this._battles.splice(index, 1);
        return true;
    }
}

export default new BattleDAO();