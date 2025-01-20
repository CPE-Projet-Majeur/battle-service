import BattleDAO from "../dao/BattleDAO";
import Battle from "../model/Battle";
import SpellDAO from "../dao/SpellDAO";
import {BattleEndData, BattleSendData} from "../sockets/BattleSocket";
import UserDAO from "../dao/UserDAO";
import User from "../model/User";
import Spell from "../model/Spell";
import {BattleProcessor} from "./BattleAffinityProcessor";
import {EAffinity} from "../model/enums/EAffinity";
import {EHouse} from "../model/enums/EHouse";
import {EType} from "../model/enums/EType";
import Player from "../model/Player";

class BattleService {

    public static readonly PLAYER_COUNT: number = 2;
    public static readonly TEAM_SIZE: number = 1;

    private _waitingPlayersId: Battle[] = [];

    public getBattle(battleId: number): Battle | undefined {
        return BattleDAO.getBattleById(battleId);
    }

    //////////////////// HANDLING EVENTS METHODS ////////////////////

    /**
     * Handles joining a random battle in an arena.
     * @param id userId
     * @param weather
     * @return The ID of the battle the waiting player has joined, -1 is failure
     */
    public handleWaiting(id : number, weather: number): number {
        // If game is available to join
        const user: User | undefined = UserDAO.getUserById(id);
        if (!user) return -1;
        // Find a suitable battle to join
        for(let i: number = 0; i < this._waitingPlayersId.length; i ++){
            const battle: Battle = this._waitingPlayersId[i];
            if(battle.players.size <= BattleService.PLAYER_COUNT) {
                battle.addPlayer(user);
                return battle.id;
            }
        }
        // Else, create game for others to join
        const battle: Battle = BattleDAO.save(new Battle(-1, -1, weather))
        battle.addPlayer(user);
        this._waitingPlayersId.push(battle);
        return battle.id;
    }

    /**
     * Handles joining a tournament's battle.
     * @param id UserId
     * @param battle Battle
     * @returns An Integer :
     * - the Id of the battle if joining it was successful
     * - -1 if the user could not be found
     * - -2 if the user is not part of the battle
     */
    public handleJoining(id: number, battle: Battle): number{
        const user: User | undefined = UserDAO.getUserById(id);
        if (!user) return -1
        if (!battle.players.has(user.id)) return -2; // Player not allowed in this pre-made battle
        battle.addPlayer(user);
        return battle.id;
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
        if (!spell || spell.name === undefined) return false;
        const player: Player | undefined | null = battle.players.get(userId);
        if (!player) return false;
        player.spell = spell;
        player.accuracy = accuracy;
        if(spell.type == EType.DEFENCE) player.defenseMultiplier = 1 - (spell.damage / 100);
        if(spell.type == EType.HEAL) player.hp += spell.damage;
        // if(spell AILEMNT ALL OTHER PLAYERS HAVE MINUS ON ACCURACY)
        return true;
    }

    public handleBattleStart(battle: Battle): void {
        this.newRound(battle);
        const index: number = this._waitingPlayersId.indexOf(battle);
        this._waitingPlayersId.splice(index, 1);
    }

    /**
     * Process user actions for a game where players act at the same time.
     * Defeated users are removed from the match.
     * @param battle
     */
    public processActions(battle: Battle): BattleSendData[] {
        const result: BattleSendData[] = [];
        // Compute damage dealt by each player
        battle.players.forEach(player => {
            if(!player) return;
            if(player.status == "defeated") return;
            if(!player.spell) return;
            if(player.spell.type == EType.ATTACK) return;
            const affinityRecord : Record<EAffinity, number> = BattleProcessor.affinityMultipliers[player.spell.affinity];
            const houseMultiplier : 1.5 | 1 = BattleProcessor.houseAffinities[player.user.house as EHouse] == player.spell.affinity ? 1.5 : 1;
            const baseDamage : number = player.spell.damage * player.accuracy;
            // All enemies are attacked
            battle.players.forEach(target => {
                if (!target) return;
                if (target.status == "defeated") return;
                if (target.user.id === player.user.id) return;
                if (!target.spell) return;
                // if same team, pass
                const typeMultiplier: number = affinityRecord[target.spell.affinity];
                const finalDamage: number = Math.round(baseDamage * typeMultiplier * houseMultiplier);
                console.log(`user ${player.user.id} targeting user ${target.user.id} => typeMultiplier: ${typeMultiplier}, houseMultiplier: ${houseMultiplier}`);

                target.hp = Math.max(0, target.hp - finalDamage);
                result.push({
                    targetId: target.user.id,
                    damage: finalDamage,
                    accuracy: player.accuracy,
                    // @ts-ignore
                    spellName: player.spell.name,
                    remainingHp: target.hp
                })
            })
        })
        battle.players.forEach(player => {
            if(!player) return;
            if(player.hp <= 0) player.status = "defeated";
        })
        return result
    }

    //////////////////// ROUND PROCESSING METHODS /////////////////////

    public processWinners(battle: Battle): BattleEndData[] {
        if (!this.isBattleOver(battle)) return [];
        // Compute winners
        let highestDamage: number = 0;
        let highestDamagePlayerId: number = 0;
        battle.players.forEach(player => {
            if (!player) return;
            if (player.status != "defeated") battle.winners.push(player.user.id)
            else if (player.damage > highestDamage) {
                highestDamage = player.damage;
                highestDamagePlayerId = player.user.id;
            }
        })
        // Handle draw the best we can for now
        if(battle.winners.length == 0){
            console.log(`Battle of ID ${battle.id} resulted in a draw. Winners are decided over highestDamage.`)
            battle.winners.push(highestDamagePlayerId);
        }
        // TODO : check that winners.length < NUMBER OF PLAYERS THAT CAN WIN
        // Prepare data
        const data: BattleEndData[] = []
        battle.players.forEach(player => {
            if (!player) return;
            data.push({
                userId: player.user.id,
                status: battle.winners.includes(player.user.id) ? "won" : player.status,
            })
        })
        return data;
    }

    public newRound(battle: Battle) : boolean {
        battle.players.forEach(player => {
            if (!player) return;
            player.spell = null
            player.damage = 0;
        });
        battle.round ++;
        return true;
    }

    //////////////////// BOOLEAN METHODS ////////////////////

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

    public isRoundOver(battle: Battle): boolean {
        let ret : boolean = true;
        battle.players.forEach(player => {
            if (!player) return;
            if (!player.spell) ret = false;
        })
        return ret;
    }

    public isBattleOver(battle: Battle): boolean {
        let numberFighting: number = battle.players.size;
        battle.players.forEach(player => {
            if (!player) return;
            if (player.status == "defeated") numberFighting--;
        })
        return numberFighting <= BattleService.TEAM_SIZE;
    }

    public isPlayerInBattle(battle: Battle, userId: number): boolean {
        let result: boolean = false;
        battle.players.forEach(player => {
            if (!player) return;
            if (player.user.id === userId) result = true;
        })
        return result;
    }

    ///////////////////////// GETTERS /////////////////////////////

    public getPlayers(battle: Battle): User[]{
        const result: User[] = [];
        battle.players.forEach(player => {
            if (player) result.push(player.user);
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