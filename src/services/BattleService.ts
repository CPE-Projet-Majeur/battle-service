import BattleDAO from "../dao/BattleDAO";
import Battle from "../model/Battle";
import SpellDAO from "../dao/SpellDAO";
import {BattleEndData, BattleSendData} from "../sockets/battleSocket";
import UserDAO from "../dao/UserDAO";
import User from "../model/User";

class BattleService {

    public static readonly PLAYER_COUNT: number = 2;
    public static readonly TEAM_SIZE: number = 1;

    private _waitingPlayersId: Battle[] = [];

    /**
     * Handles joining a battle out of a tournament
     * @param id
     * @param weather
     */
    public handleWaiting(id : number, weather: number): number {
        // If game is available to join
        const user: User | undefined = UserDAO.getUserById(id);
        if (!user) return -1;
        if (this._waitingPlayersId.length >= 1 ) {
            const battle: Battle = this._waitingPlayersId.pop()!;
            battle.addPlayer(user);
            return battle.id;
        }
        // Else, create game for others to join
        const battle: Battle = BattleDAO.save(new Battle(-1, -1, weather))
        battle.addPlayer(user);
        this._waitingPlayersId.push(battle);
        return battle.id;
    }

    /**
     * Handles joining a tournament's battle.
     * @param id
     * @param battleId
     */
    public handleJoining(id: number, battleId: number): number{
        const user: User | undefined = UserDAO.getUserById(id);
        if (!user) return -1
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId);
        if (!battle) return -1
        if (!battle.players.has(id)) return -1; // Player not allowed in this pre-made battle
        battle.addPlayer(user);
        return battle.id;
    }

    /**
     * Check if a given battle is ready
     * @param battleId
     */
    public isBattleReady(battleId: number): boolean {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
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
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId);
        if (!battle) return false;
        // @ts-ignore
        battle.players.get(userId).spell = SpellDAO.getSpellById(spellId)
        // @ts-ignore
        battle.players.get(userId).accuracy = accuracy
        return true;
    }

    /**
     * Process user actions for a game where players act at the same time.
     * Defeated users are removed from the match.
     * @param battleId
     */
    public processActions(battleId: number): BattleSendData[] {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId);
        if (!battle) return [];
        const result: BattleSendData[] = [];
        //const defeated: number[] = []
        // Handle damage for all players remaining
        battle.players.forEach(player => {
            // final : damage * affinité de type par rapport à maison * météo
            if (!player.spell) return;
            const damage : number = player.spell.damage * player.accuracy;
            battle.players.forEach(target => {
                if (target.user.id === player.user.id) return
                target.hp = target.hp - damage;
                if (target.hp <= 0 ) {
                    //defeated.push(target.user.id)
                    player.status = "defeated";
                }
                result.push({
                    targetId: target.user.id,
                    damage: damage,
                    accuracy: player.accuracy,
                    // @ts-ignore
                    spellName: player.spell.name,
                    remainingHp: target.hp
                })
            })
        })
        // Handle defeats and update
        //defeated.forEach(playerId => battle.players.delete(playerId))
        return result
    }

    public isRoundOver(battleId: number): boolean {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        let ret : boolean = true;
        battle.players.forEach(player => {
            if (!player.spell) ret = false;
        })
        return ret;
    }

    public newRound(battleId: number) : boolean {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        battle.players.forEach(player => player.spell = null);
        battle.round ++;
        return true;
    }

    public isBattleOver(battleId: number): boolean {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        let numberFighting: number = battle.players.size;
        battle.players.forEach(player => {
            if (player.status == "defeated") numberFighting--;
        })
        return numberFighting <= BattleService.TEAM_SIZE;
    }

    public getWinners(battleId: number): BattleEndData[] {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return [];
        if (!this.isBattleOver(battleId)) return [];
        // Compute winners
        battle.players.forEach(player => {
            if (player.status != "defeated") battle.winners.push(player.user.id);
        })
        const draw: boolean = battle.winners.length == 0;
        // TODO : check that winners.length < NUMBER OF PLAYERS THAT CAN WIN
        // Prepare data
        const data: BattleEndData[] = []
        battle.players.forEach(player => {
            let status : string = player.status;
            if (battle.winners.includes(player.user.id)) status = "won";
            data.push({
                userId: player.user.id,
                status: draw ? "draw" : status
            })
        })
        return data;
    }

    public getPlayers(battleId: number): User[]{
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return [];
        const result: User[] = [];
        battle.players.forEach(player => {
            result.push(player.user);
        })
        return result;
    }

    public getWeather(battleId: number): number{
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return -1;
        return battle.weather;
    }

    /**
     * Handle player disconnection
     * @param battleId Id of the battle for this user
     * @param userId User's Id
     * @return true if the player was disconnected from a match, false otherwise
     */
    public playerDisconnect(battleId: number, userId: number): boolean {
        const battle: Battle | undefined = BattleDAO.getBattleById(battleId)
        if (!battle) return false;
        return battle.players.delete(userId);
    }

    public deleteBattle(battleId: number): boolean {
        return BattleDAO.delete(battleId);
    }
}

export default new BattleService();