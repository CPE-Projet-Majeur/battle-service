import BattleDAO from "../dao/BattleDAO";
import Battle from "../model/Battle";
import SpellDAO from "../dao/SpellDAO";
import {BattleEndData, BattleSendData} from "../sockets/BattleSocket";
import UserDAO from "../dao/UserDAO";
import User from "../model/User";
import Spell from "../model/Spell";

class BattleService {

    public static readonly PLAYER_COUNT: number = 2;
    public static readonly TEAM_SIZE: number = 1;

    private _waitingPlayersId: Battle[] = [];

    public getBattle(battleId: number): Battle | undefined {
        return BattleDAO.getBattleById(battleId);
    }

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
     * @param battle
     */
    public handleJoining(id: number, battle: Battle): number{
        const user: User | undefined = UserDAO.getUserById(id);
        if (!user) return -1
        if (!battle.players.has(id)) return -1; // Player not allowed in this pre-made battle
        battle.addPlayer(user);
        return battle.id;
    }

    /**
     * Check if a given battle is ready
     * @param battle
     */
    public isBattleReady(battle: Battle): boolean {
        let playerCount: number = 0;
        battle.players.forEach(player => {
            if (player) playerCount++;
        })
        return playerCount === BattleService.PLAYER_COUNT;
        //return battle.players.size == BattleService.PLAYER_COUNT;
    }

    /**
     *
     * @param spellId
     * @param battle
     * @param accuracy
     * @param userId
     * @return boolean if the action succeeded
     */
    public async handleAction(spellId: number, battle: Battle, accuracy: number, userId: number): Promise<boolean> {
        const spell: Spell | undefined = await SpellDAO.getSpellById(spellId)
        if (!spell) return false;
        // @ts-ignore
        battle.players.get(userId).spell = spell
        // @ts-ignore
        battle.players.get(userId).accuracy = accuracy
        return true;
    }

    /**
     * Process user actions for a game where players act at the same time.
     * Defeated users are removed from the match.
     * @param battle
     */
    public processActions(battle: Battle): BattleSendData[] {
        const result: BattleSendData[] = [];
        battle.players.forEach(player => {
            if (!player) return;
            // final : damage * affinité de type par rapport à maison * météo
            if (!player.spell) return;
            const damage : number = player.spell.damage * player.accuracy;
            battle.players.forEach(target => {
                if (!target) return;
                // If same team, return
                if (target.user.id === player.user.id) return
                target.hp = target.hp - damage;
                if (target.hp <= 0 ) target.status = "defeated";
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
        return result
    }

    public processWinners(battle: Battle): BattleEndData[] {
        if (!this.isBattleOver(battle)) return [];
        // Compute winners
        battle.players.forEach(player => {
            if (!player) return;
            if (player.status != "defeated") battle.winners.push(player.user.id);
        })
        const draw: boolean = battle.winners.length == 0;
        // TODO : check that winners.length < NUMBER OF PLAYERS THAT CAN WIN
        // Prepare data
        const data: BattleEndData[] = []
        battle.players.forEach(player => {
            if (!player) return;
            let status : string = player.status;
            if (battle.winners.includes(player.user.id)) status = "won";
            data.push({
                userId: player.user.id,
                status: draw ? "draw" : status
            })
        })
        return data;
    }

    public isRoundOver(battle: Battle): boolean {
        let ret : boolean = true;
        battle.players.forEach(player => {
            if (!player) return;
            if (!player.spell) ret = false;
        })
        return ret;
    }

    public newRound(battle: Battle) : boolean {
        battle.players.forEach(player => {
            if (!player) return;
            player.spell = null
        });
        battle.round ++;
        return true;
    }

    public isBattleOver(battle: Battle): boolean {
        let numberFighting: number = battle.players.size;
        battle.players.forEach(player => {
            if (!player) return;
            if (player.status == "defeated") numberFighting--;
        })
        return numberFighting <= BattleService.TEAM_SIZE;
    }

    public getPlayers(battle: Battle): User[]{
        const result: User[] = [];
        battle.players.forEach(player => {
            if (player) result.push(player.user);
        })
        return result;
    }

    public isPlayerInBattle(battle: Battle, userId: number): boolean {
        let result: boolean = false;
        battle.players.forEach(player => {
            if (!player) return;
            if (player.user.id === userId) result = true;
        })
        return result;
    }

    public getWeather(battle: Battle): number{
        return battle.weather;
    }

    /**
     * Handle player disconnection
     * @param battle Id of the battle for this user
     * @param userId User's Id
     * @return true if the player was disconnected from a match, false otherwise
     */
    public playerDisconnect(battle: Battle, userId: number): boolean {
        return battle.players.delete(userId);
    }

    public deleteBattle(battle: Battle): boolean {
        return BattleDAO.delete(battle);
    }

    public createBattle(tournamentId: number, playerIds: number[]): number {
        // WEATHER
        const battle: Battle = new Battle(-1, tournamentId, 0);
        const sBattle: Battle = BattleDAO.save(battle);
        playerIds.forEach(id => {
            sBattle.players.set(id, null)
        })
        return sBattle.id;
    }
}

// TODO : WEATHER IS GIVEN EACH ACTION

export default new BattleService();