// ----------------------------------------
// FICHIER: BattleService.test.ts
// ----------------------------------------
import { jest } from "@jest/globals";
import BattleService from "../../src/services/BattleService";
import Battle from "../../src/model/Battle";
import BattleDAO from "../../src/dao/BattleDAO";
import UserDAO from "../../src/dao/UserDAO";
import User from "../../src/model/User";
import SpellDAO from "../../src/dao/SpellDAO";
import Spell from "../../src/model/Spell";
import {EAffinity} from "../../src/model/enums/EAffinity";
import {EType} from "../../src/model/enums/EType";
import Player from "../../src/model/Player";
import {BattleEndData, BattleSendData} from "../../src/sockets/BattleSocket";

describe("BattleService", () => {

    let mockSpell: Spell;
    let mockSpell2: Spell;
    let mockSpell3: Spell;
    let mockBattle: Battle;
    let mockTournamentBattle: Battle;
    let mockUser: User;
    let mockUser2: User;
    let mockUser3: User;

    beforeEach(() => {
        mockSpell = new Spell(1, "Aguamenti", "Plouf l'eau", "WIND", "ATTACK", 20, 2);
        mockSpell2 = new Spell(2, "Agidyne", "Ca brule", "FIRE", "ATTACK", 20, 2);
        mockSpell3 = new Spell(3, "Healing", "soin", "NEUTRAL", "HEAL", 20, 1);
        mockUser = new User(1, "McFlopper", "Floppa", 0);
        mockUser2 = new User(2, "Shadow", "The Hedgehog", 2);
        mockUser3 = new User(3, "Mew", "Two", 3);
        mockBattle = new Battle(1, -1, 0);
        mockTournamentBattle = new Battle(2, 1, 0);
        // Cast BattleService as any to bypass _waitingPlayersId private scope (ugly but needed)
        (BattleService as any)._waitingPlayersId = [] // Empty waiting queue
        jest.clearAllMocks();
    })
    /////////////////////////////////////////////////////////////////////
    describe("handleWaiting", () => {
        it("should return a battle if a player is already waiting", () => {
            // When getUserById is called from UserDAO in this test, return mockUser instead of calling the method
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser);
            jest.spyOn(BattleDAO, "save").mockReturnValueOnce(mockBattle);
            BattleService.handleWaiting(1, 0);
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser2);
            const result: number = BattleService.handleWaiting(2, 0);
            expect(result).toBe(1);
        })
        it("should add a new battle, with the waiting user as one of the player, in the queue", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser);
            jest.spyOn(BattleDAO, "save").mockReturnValueOnce(mockBattle);
            const result: number = BattleService.handleWaiting(1, 0);
            expect(result).toBe(1);
            expect(mockUser.battleId).toBe(1);
            expect((BattleService as any)._waitingPlayersId.length).toBe(1);
            const battle: Battle = (BattleService as any)._waitingPlayersId.pop();
            const maybePlayer : Player | null | undefined = battle.players.get(1);
            expect(maybePlayer).toBeDefined();
            const player: Player = maybePlayer!;
            expect(player.user).toEqual(mockUser);
        })
        it("should return -1 if the user could not be found", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(undefined);
            const result: number = BattleService.handleWaiting(1, 0);
            expect(result).toBe(-1);
        })
        it("should return -2 if a user trying to join a battle mutliple times", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValue(mockUser);
            jest.spyOn(BattleDAO, "save").mockReturnValue(mockBattle);
            const preResult: number = BattleService.handleWaiting(1, 0);
            expect(preResult).toBe(1);
            expect(mockUser.battleId).toBe(1);
            const result: number = BattleService.handleWaiting(1, 0);
            expect(result).toBe(-2);
            expect(mockBattle.players.size).toBe(1);
            const maybePlayer : Player | null | undefined = mockBattle.players.get(1);
            expect(maybePlayer).toBeDefined();
            const player: Player = maybePlayer!;
            expect(player.user).toEqual(mockUser);
        })
        afterEach(()=> {
            jest.resetAllMocks();
        })
    })
    /////////////////////////////////////////////////////////////////////
    describe('handleJoining', () => {
        beforeEach(() => {
            mockBattle.addPlayer(mockUser);
            mockBattle.players.set(2, null); //
        })
        it("should return the id of the battle the player is trying to join if the battle exists and he is allowed to", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser2);
            const result: number = BattleService.handleJoining(2, mockBattle);
            expect(result).toBe(1);
            expect(mockBattle.players.get(2)).toBeDefined();
        })
        it("should return an error code if the user could not be found", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(undefined);
            const result: number = BattleService.handleJoining(2, mockBattle);
            expect(result).toBe(-1);
            expect(mockBattle.players.get(2)).toBeNull();
        })
        it("sould return an error code if the user is not allowed in the given battle", () => {
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser3);
            const result: number = BattleService.handleJoining(3, mockBattle);
            expect(result).toBe(-2);
            expect(mockBattle.players.get(2)).toBeNull();
        })
    });
    /////////////////////////////////////////////////////////////////////
    describe("handleAction", ()=>{
        beforeEach(() => {
            mockBattle.addPlayer(mockUser);
        })
        it("should return 1 if the action could be processed", async ()=>{
            jest.spyOn(SpellDAO, "getSpellById").mockReturnValueOnce(Promise.resolve(mockSpell));
            mockBattle.addPlayer(mockUser2); // Make battle ready with enough players
            const result: number = await BattleService.handleAction(1, mockBattle, 0.8, 1)
            expect(SpellDAO.getSpellById).toHaveBeenCalledWith(1);
            expect(SpellDAO.getSpellById).toHaveReturnedTimes(1);
            expect(result).toBe(1);
        })
        it("should return -1 if the battle could not be started yet", async () => {
            jest.spyOn(SpellDAO, "getSpellById").mockResolvedValueOnce(mockSpell);
            const result: number = await BattleService.handleAction(1, mockBattle, 0.8, 1)
            expect(SpellDAO.getSpellById).toHaveReturnedTimes(0);
            expect(result).toBe(-1);
        })
        it("should return -2 if the spell could not be found", async () => {
            jest.spyOn(SpellDAO, "getSpellById").mockResolvedValueOnce(undefined);
            jest.spyOn(UserDAO, "getUserById").mockReturnValueOnce(mockUser);
            mockBattle.addPlayer(mockUser2); // Make battle ready with enough players
            const result: number = await BattleService.handleAction(1, mockBattle, 0.8, 1)
            expect(SpellDAO.getSpellById).toHaveBeenCalledWith(1);
            expect(SpellDAO.getSpellById).toHaveReturnedTimes(1);
            expect(result).toBe(-2);
        })
        it("should return -3 if the player could not be found", async () => {
            jest.spyOn(SpellDAO, "getSpellById").mockResolvedValueOnce(mockSpell);
            jest.spyOn(mockBattle.players, "get").mockReturnValueOnce(undefined);
            mockBattle.addPlayer(mockUser2); // Make battle ready with enough players
            const result: number = await BattleService.handleAction(1, mockBattle, 0.8, 1)
            expect(SpellDAO.getSpellById).toHaveReturnedTimes(0);
            expect(result).toBe(-3);
        })
    })
    /////////////////////////////////////////////////////////////////////
    describe("processActions", () => {
        beforeEach(() => {
            mockBattle.addPlayer(mockUser);
            // @ts-ignore
            mockBattle.players.get(1).spell = mockSpell;
            // @ts-ignore
            mockBattle.players.get(1).accuracy = 0.8;
            mockBattle.addPlayer(mockUser2);
            // @ts-ignore
            mockBattle.players.get(2).spell = mockSpell2;
            // @ts-ignore
            mockBattle.players.get(2).accuracy = 0.8;
        })
        it("should compute compute correct damage.", () => {
            const data: BattleSendData[] = BattleService.processActions(mockBattle);
            /**
             * User 1 is from house gryffindor and used a wind spell against fire
             * User 2 is from house Slytherin and used a fire spell against wind
             * Fire against Wind = 1.2 ; Wind against Fire = 0.8
             * User 1 : {houseMultiplier: 1, affinityMutliplier: 0.8, accuracy: 0.8}
             * => Damage = round(20 * 1 * 0.8 * 0.8) = round(12.8) = 13
             * User 2 : {houseMultiplier: 1, affinityMultiplier: 1.2, accuracy: 0.8}
             * => Damage = round(20 * 1 * 1.2 * 0.8) = round(19.2) = 19
             */
            const user1Damage: number = 100 - data[0].remainingHp;
            const user2Damage: number = 100 - data[1].remainingHp;
            expect(user1Damage).toBe(13);
            expect(user2Damage).toBe(19);
        })
        // it("should heal when a healing spell is used", () => {
        //     // @ts-ignore
        //     mockBattle.players.get(2).spell = mockSpell3;
        //     // @ts-ignore
        //     mockBattle.players.get(2).accuracy = 0.8;
        //     // @ts-ignore
        //     mockBattle.players.get(2).hp = 80;
        //     const healing: number = mockSpell3.damage * 0.8; // Healing = spell damage * accuracy
        //     const data: BattleSendData[] = BattleService.processActions(mockBattle);
        // })
        it("should not attack forfeited or defeated players", () => {
            // @ts-ignore
            mockBattle.players.get(2).status = "defeated";
            let data: BattleSendData[] = BattleService.processActions(mockBattle);
            expect(data.length).toBe(0);
            // @ts-ignore
            mockBattle.players.get(2).status = "forfeited";
            data = BattleService.processActions(mockBattle);
            expect(data.length).toBe(0);
            // @ts-ignore
            mockBattle.players.get(2).status = "alive";
            data = BattleService.processActions(mockBattle);
            expect(data.length).toBe(2);
        })
    })
    /////////////////////////////////////////////////////////////////////
    describe("processWinners", () => {
        it("should return winners", () => {

        })
        it("should handle the scenario where one player forfeited", () => {

        })
    })
    /////////////////////////////////////////////////////////////////////
    describe("isBattleReady", () => {
        it("should return true if the battle is ready", () => {
            mockBattle.addPlayer(mockUser);
            mockBattle.addPlayer(mockUser2);
            const result: boolean = BattleService.isBattleReady(mockBattle);
            expect(result).toBe(true);
        })
        it("should return false if the battle is not ready", ()=>{
            mockBattle.addPlayer(mockUser);
            const result: boolean = BattleService.isBattleReady(mockBattle);
            expect(result).toBe(false);
        })
    })
    /////////////////////////////////////////////////////////////////////
    describe("isBattleOver", () => {
        beforeEach(() => {
            mockBattle.addPlayer(mockUser);
            mockBattle.addPlayer(mockUser2);
        })
        it("should return true if the battle is over", () => {
            // @ts-ignore
            mockBattle.players.get(1).status = "defeated";
            const result: boolean = BattleService.isBattleOver(mockBattle);
            expect(result).toBe(true);
        })
        it("should return false if the players are still alive", () => {
            // @ts-ignore
            const result: boolean = BattleService.isBattleOver(mockBattle);
            expect(result).toBe(false);
        })
        it("should handle the scenario where user forfeited", () => {
            // @ts-ignore
            mockBattle.players.get(1).status = "forfeited";
            const result: boolean = BattleService.isBattleOver(mockBattle);
            expect(result).toBe(true);
        })
    })
    /////////////////////////////////////////////////////////////////////
})
