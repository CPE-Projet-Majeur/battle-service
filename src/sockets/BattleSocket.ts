import {Server} from "socket.io";
import {EBattleActions} from "./events/EBattleActions";
import SocketWrapper from "./SocketWrapper";
import battleService from "../services/BattleService";
import User from "../model/User";
import BattleService from "../services/BattleService";
import UserDAO from "../dao/UserDAO";
import {eventBus} from "../bus/eventBus";
import Battle from "../model/Battle";
import {EEvents} from "./events/EEvents";
import TournamentService from "../services/TournamentService";
import Tournament from "../model/Tournament";

type WaitingData = {
    battleId: number;
    weather: number;
}

export type BattleStartData = {
    players: User[];
    weather: string;
    battleId: number;
}

type BattleReceiveData = {
    spellId: number;
    accuracy: number;
}

export type BattleSendData = {
    targetId: number;
    damage: number;
    accuracy: number;
    spellName: string;
    remainingHp: number;
}

export type BattleEndData = {
    userId: number;
    status: string | undefined;
}

// TODO : REWORK

class BattleSocket  {
    public setSocket(io: Server, wrapper: SocketWrapper): void {
        // Handle connection
        wrapper.socket.on(EBattleActions.BATTLE_WAITING, (data: WaitingData) => {
            // TODO : handle scenario when user is waiting multiple times
            // if (socketWrapper.battleId != -1) {
            //     console.log(`User ${socketWrapper.userId} is already waiting or in battle`);
            //     return;
            // }
            let battleId: number = data.battleId;
            const userId: number = wrapper.userId;
            const weather: number = typeof data.weather !== "undefined" ? data.weather : 0;
            const battleExists: boolean = typeof battleId !== "undefined";
            // Tournament mode : battle already exists
            if (battleExists) {
                const battle: Battle | undefined = BattleService.getBattle(battleId);
                if (!battle) return;
                if (battle.tournamentId == -1) return; // Wrong scenario : battle tried to be joined but has no tournament
                wrapper.socket.join(`tournament_${battle.tournamentId}`)
                console.log(`Battle ID: ${battleId}`);
                //socketWrapper.tournament = true;
                if (battleService.handleJoining(userId, battle) == -1) {
                    console.log(`User ${userId} failed to join the battle of id ${battleId}`)
                    return;
                }
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            // Outside of tournament mode : user is waiting in queue (this._waitingPlayers)
            else {
                battleId = battleService.handleWaiting(userId, weather)
                if (battleId == -1) {
                    console.log(`User ${userId} failed to wait for a battle`)
                    return;
                }
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            // Check if battle is ready to start
            const battle: Battle | undefined = BattleService.getBattle(battleId);
            if (!battle) return;
            wrapper.battleId = battleId;
            if (battleService.isBattleReady(battle)){
                console.log(`Battle ID: ${battleId} is starting !`);
                battleService.getPlayers(battle).forEach(player => {
                    // Send data to battle socket
                    // TODO : Create export type (here, we are sending socket ids !!!)
                    io.to(player.battleSocketId).emit(EBattleActions.BATTLE_START,
                        {
                            players: battleService.getPlayers(battle),
                            weather: battleService.getWeather(battle),
                            battleId: battleId
                        })
                    // Send data to tournament socket
                    if (battleExists) { // TODO : SRP... Battle should not handle tournament logic, use emitBus
                        io.to(player.tournamentSocketId).emit(EBattleActions.BATTLE_START,
                            {
                                players: battleService.getPlayers(battle),
                                weather: battleService.getWeather(battle),
                                battleId: battleId
                            })
                    }
                })
            }
        })
        // Handle actions
        wrapper.socket.on(EBattleActions.BATTLE_RECEIVE_ACTION, (data: BattleReceiveData) => {
            // TODO : Handle scenario when player tries to attack without beeing in a game (if !gameReady...)
            const accuracy: number = data.accuracy;
            const spellId: number = data.spellId;
            const battle: Battle | undefined = BattleService.getBattle(wrapper.battleId);
            if (!battle) return;
            console.log(`Received action from user ${wrapper.userId} for battle ${battle.id} : spell ${spellId} / accuracy ${accuracy}`);
            BattleService.handleAction(spellId, battle, accuracy, wrapper.userId)
            if (BattleService.isRoundOver(battle)) {
                // Send new game status to users
                console.log(`Battle ${battle.id}'s round is over`);
                const sendData: BattleSendData[] = BattleService.processActions(battle);
                BattleService.getPlayers(battle).forEach((player: User): void => {
                    const user: User | undefined = UserDAO.getUserById(player.id);
                    if (!user) return;
                    io.to(user.battleSocketId).emit(EBattleActions.BATTLE_SEND_ACTION, sendData);
                    if (wrapper.tournament) io.to(user.tournamentSocketId).emit(EBattleActions.BATTLE_RECEIVE_ACTION, sendData);
                })
                BattleService.newRound(battle);
                if (battleService.isBattleOver(battle)) {
                    // Send game ending event to users
                    console.log(`Battle ${battle.id} is over`);
                    const results: BattleEndData[] = BattleService.getWinners(battle);
                    results.forEach(resultData => {
                        const user: User | undefined = UserDAO.getUserById(resultData.userId);
                        if (!user) return;
                        io.to(user.battleSocketId).emit(EBattleActions.BATTLE_OVER, resultData)
                        if (wrapper.tournament) io.to(user.tournamentSocketId).emit(EBattleActions.BATTLE_OVER, resultData);
                    })
                    // If battle is part of a tournament, send event to tournament socket
                    if (battle.tournamentId != -1) {
                        console.log(`Notifiying tournament ${battle.tournamentId} is notified.`)
                        eventBus.emit(EEvents.BRACKET_UPDATE, {
                            battleId: battle.id,
                            winnerIds: battle.winners,
                            tournamentId: battle.tournamentId
                        })
                    }
                    // TODO : Delete game from DAO...
                }
            }
        })
    }

    handleDisconnect(io: Server, socket: SocketWrapper): void {
        // Si l'user se déconnecte, la partie est annulée
        if (socket.battleId != -1){
            const battle: Battle | undefined = BattleService.getBattle(socket.battleId);
            if (!battle) return
            if (BattleService.playerDisconnect(battle, socket.userId)) {
                BattleService.getPlayers(battle).forEach(player => {
                    io.emit(EBattleActions.BATTLE_OVER, {
                        userId: player.id,
                        status: "forfeited"
                    })
                });
            }
        }
    }
}

export default new BattleSocket()