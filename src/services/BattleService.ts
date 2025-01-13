import BattleDAO from "../dao/BattleDAO";
import Battle from "../model/Battle";
import Spell from "../model/Spell";
import SpellDAO from "../dao/SpellDAO";
import {BattleSendData, BattleStartData} from "../sockets/battleSocket";
import UserDAO from "../dao/UserDAO";
import {EWeather} from "../model/EWeather";
import User from "../model/User";

class BattleService {

    public static readonly PLAYER_COUNT: number = 2;

    private _waitingPlayersId: Map<number, Battle> = new Map();

    /**
     * Handles joining a battle out of a tournament
     * @param id
     * @param weather
     */
    public handleWaiting(id : number, weather: number): number {
        // If game is available to join
        const user: User = UserDAO.getUserById(id);
        if (user == null) return -1;
        if (this._waitingPlayersId.size >= 1 ) {
            const targetId: number = this._waitingPlayersId.keys().next().value;
            const battle: Battle = this._waitingPlayersId.get(targetId);
            battle.addPlayer(user);
            return battle.id;
        }
        // Else, create game for others to join
        const battle: Battle = BattleDAO.save(new Battle(null, null, weather))
        battle.addPlayer(user);
        return battle.id;
    }

    /**
     * Handles joining a tournament's battle.
     * @param id
     * @param battleId
     */
    public handleJoining(id: number, battleId: number): number{
        const user: User = UserDAO.getUserById(id);
        if (user == null) return -1;
        const battle: Battle = BattleDAO.getBattleById(battleId);
        if (!battle.players.has(id)) return -1; // Player not allowed in this pre-made battle
        battle.addPlayer(user);
        return battle.id;
    }

    /**
     * Check if a given battle is ready
     * @param battleId
     */
    public isBattleReady(battleId: number): boolean {
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        return battle.players.size == BattleService.PLAYER_COUNT;
    }

    /**
     *
     * @param spellId
     * @param battleId
     * @param accuracy
     * @param userId
     * @return boolean if the action succeeded
     */
    public handleAction(spellId: number, battleId: number, accuracy: number, userId: number): boolean {
        const battle: Battle = BattleDAO.getBattleById(battleId);
        if (!battle) return false;
        battle.players.get(userId).spell = SpellDAO.getSpellById(spellId)
        battle.players.get(userId).accuracy = accuracy
        return true;
    }

    /**
     * Process user actions for a game where players act at the same time.
     * @param battleId
     */
    public processActions(battleId: number): BattleSendData[] {
        const battle: Battle = BattleDAO.getBattleById(battleId);
        if (!battle) return null;
        const result: BattleSendData[] = [];
        const defeated: number[] = []
        // Handle damage for all players remaining
        battle.players.forEach(player => {
            // final : damage * affinité de type par rapport à maison * météo
            const damage : number = player.spell.damage * player.accuracy;
            battle.players.forEach(target => {
                if (target.user.id === player.user.id) return
                target.hp = target.hp - damage;
                if (target.hp <= 0 ) {
                    defeated.push(target.user.id)
                }
                result.push({
                    targetId: target.user.id,
                    damage: damage,
                    accuracy: player.accuracy,
                    spellName: player.spell.name,
                    remainingHp: target.hp
                })
            })
        })
        // Handle victory
        defeated.forEach(playerId => battle.players.delete(playerId))
        if (battle.players.size === 0) battle.winner = Battle.DRAW;
        else if (battle.players.size === 1) battle.winner = battle.players.keys().next().value
        return result
    }

    public isRoundOver(battleId: number): boolean {
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        battle.players.forEach(player => {if(player.spell == null) return false;})
        return true;
    }

    private isBattleOver(battleId: number): boolean {
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        battle.players.forEach(player => {if(player.hp <= 0) return true;})
        return false;
    }

    public getWinner(battleId: number): number {
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return -1;
        if (this.isBattleOver(battleId)) {
            return battle.winner;
        }
        return -1;
    }

    public getPlayers(battleId: number): User[]{
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return null;
        const result: User[] = [];
        battle.players.forEach(player => {
            result.push(player.user);
        })
        return result;
    }

    public getWeather(battleId: number): number{
        const battle: Battle = BattleDAO.getBattleById(battleId)
        if (!battle) return -1;
        return battle.weather;
    }
}

export default new BattleService();