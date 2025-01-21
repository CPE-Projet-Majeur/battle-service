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
        if (user.battleId != -1) return -2;
        // Find a suitable battle to join
        for(let i: number = 0; i < this._waitingPlayersId.length; i ++){
            const battle: Battle = this._waitingPlayersId[i];
            if(battle.players.size <= BattleService.PLAYER_COUNT) {
                battle.addPlayer(user);
                user.battleId = battle.id;
                return battle.id;
            }
        }
        // Else, create game for others to join
        const battle: Battle = BattleDAO.save(new Battle(-1, -1, weather))
        battle.addPlayer(user);
        user.battleId = battle.id;
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
     * @return error code or 1 if handling was successful
     */
    public async handleAction(spellId: number, battle: Battle, accuracy: number, userId: number): Promise<number> {
        if(!this.isBattleReady(battle)) return -1;
        const player: Player | undefined | null = battle.players.get(userId);
        if (!player) return -3;
        const spell: Spell | undefined = await SpellDAO.getSpellById(spellId)
        if (!spell || spell.name === undefined) return -2;
        player.spell = spell;
        player.accuracy = accuracy;
        console.log(`User ${player.user.id} spell : 
            ID: ${spell.id} 
            damage: ${spell.damage} 
            accuracy: ${player.accuracy} 
            affinity: ${spell.affinity} 
            type: ${spell.type}`);
        return 1;
    }

    public handleBattleStart(battle: Battle): void {
        this.newRound(battle);
        const index: number = this._waitingPlayersId.indexOf(battle);
        this._waitingPlayersId.splice(index, 1);
    }

    public handleDisconnect(userId: number): void {
        const user: User | undefined = UserDAO.getUserById(userId);
        if (!user) return;
        if (user.battleId == -1) return;
        const battle: Battle | undefined = BattleDAO.getBattleById(user.battleId);
        if (!battle) return;
        // If battle started, send forfeit
        if(this.isBattleReady(battle)){
            battle.players.forEach((player: Player | null) => {
                if(!player) return;
                if(player.user.id == user.id) player.status = "forfeited";
            })
            console.log(`User ${user.id} left an ongoing battle (Id : ${battle.id}). Forfeiting...`)
        }
        // Else, remove user from battle
        else {
            battle.players.delete(user.id);
            console.log(`User ${user.id} left a battle about to start (Id : ${battle.id}). Leaving...`)
        }
        user.battleId = -1;
    }

    /**
     * Process user actions for a game where players act at the same time.
     * @param battle
     */
    public processActions(battle: Battle): BattleSendData[] {
        const result: BattleSendData[] = [];
        // Handle pre-damage spells
        const debufMap: Map<number, number> = new Map<number, number>()
        const damageMap: Map<number, number> = new Map<number, number>();
        battle.players.forEach(player => {
            if(!player) return;
            if(!this.isPlayerAlive(player)) return;
            if(!player.spell) return;
            const spell: Spell = player.spell;
            switch(spell.type) {
                case EType.DEFENSE:
                    player.defenseMultiplier = 1 - (spell.damage * player.accuracy / 100); // use Map aswell
                    console.log(`User ${player.user.id} used a defence spell : ${spell.damage * player.accuracy}% damage reduction.`)
                    break;
                case EType.HEAL:
                    player.hp += Math.min(100, Math.round(spell.damage * player.accuracy));
                    console.log(`User ${player.user.id} used a healing spell : healed ${Math.round(spell.damage * player.accuracy)} hp.`)
                    break;
                case EType.AILMENT:
                    //Will lower opponent accuracy on attacks
                    debufMap.set(player.user.id, 1 - (spell.damage * player.accuracy / 100));
                    console.log(`User ${player.user.id} used an ailment spell : ${spell.damage * player.accuracy}% accuracy for all oponent for this turn.`)
                    break;
            }
        })
        // Compute damage dealt by each player
        battle.players.forEach(player => {
            if(!player) return;
            if(!this.isPlayerAlive(player)) return;
            damageMap.set(player.user.id, 0);
            if(!player.spell) return;
            //if(player.spell.type != EType.ATTACK) return;
            const affinityRecord : Record<EAffinity, number> = BattleProcessor.affinityMultipliers[player.spell.affinity];
            const houseMultiplier : 1.5 | 1 = BattleProcessor.houseAffinities[player.user.house as EHouse] == player.spell.affinity ? 1.5 : 1;
            const baseDamage : number = player.spell.damage * player.accuracy
            let debuffMultiplier : number = 1;
            // Player is not affected by its own ailment spell
            debufMap.forEach((value: number, key: number) => {if(key != player.user.id) debuffMultiplier *= value;})
            // All enemies are attacked
            battle.players.forEach(target => {
                if(!player.spell) return;
                if (!target) return;
                if (!this.isPlayerAlive(target)) return;
                if (target.user.id === player.user.id) return;
                if (!target.spell) return;
                // if same team, pass
                if(player.spell.type == EType.ATTACK) {
                    const typeMultiplier: number = affinityRecord[target.spell.affinity];
                    const finalDamage: number = Math.round(baseDamage * typeMultiplier * houseMultiplier * debuffMultiplier * target.defenseMultiplier);
                    console.log(`User ${player.user.id} targeting user ${target.user.id} :
                        baseDamage: ${baseDamage}
                        typeMultiplier: ${typeMultiplier} (${player.spell.affinity}/${target.spell.affinity})
                        houseMultiplier: ${houseMultiplier} 
                        target's defenseMultiplier: ${target.defenseMultiplier}
                        debuffMultiplier: ${debuffMultiplier}
                        finalDamage: ${finalDamage}`);
                    if (finalDamage > player.highestDamage) player.highestDamage = finalDamage; // For draw resolution
                    // Push results
                    target.hp = Math.max(0, target.hp - finalDamage);
                    result.push({
                        targetId: target.user.id,
                        damage: finalDamage,
                        accuracy: player.accuracy,
                        // @ts-ignore
                        spellName: player.spell.name,
                        remainingHp: target.hp
                    })
                    return;
                }
                // Else, if spell is not an attack
                result.push({
                    targetId: target.user.id,
                    damage: 0,
                    accuracy: player.accuracy,
                    // @ts-ignore
                    spellName: player.spell.name,
                    remainingHp: target.hp
                })
            })
        })
        // Process defeats
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
            if (this.isPlayerAlive(player)) battle.winners.push(player.user.id)
            else if (player.highestDamage > highestDamage) {
                highestDamage = player.highestDamage;
                highestDamagePlayerId = player.user.id;
            }
        })
        // Handle draw the best we can for now
        if(battle.winners.length == 0){
            console.log(`Battle of ID ${battle.id} resulted in a draw. Winners are decided over highestDamage. => User ${highestDamagePlayerId} won!`)
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
            player.highestDamage = 0;
            player.defenseMultiplier = 1;
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
        if (this.isBattleOver(battle)) return true;
        let ret : boolean = true;
        battle.players.forEach(player => {
            if (!player) return;
            if (!player.spell) ret = false;
        })
        return ret;
    }

    public isBattleOver(battle: Battle): boolean {
        let numberFighting: number = battle.players.size;
        battle.players.forEach((player: Player | null) => {
            if (!player) return;
            if (!this.isPlayerAlive(player)) numberFighting--;
        })
        return numberFighting <= BattleService.TEAM_SIZE;
    }

    private isPlayerAlive(player: Player): boolean {
        return player.status == "alive";
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