import Battle from "../model/Battle";
import ADAO from "./ADAO";
import User from "../model/User";

class BattleDAO extends ADAO {

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

    public delete(id: number): boolean {
        const erase : Battle[] = this._battles.splice(id, 1);
        return erase.length !== 0;
    }
}

export default new BattleDAO();