import {Server} from "socket.io";
import ISocket from "./ISocket";
import {EBattleActions} from "./EBattleActions";
import SocketWrapper from "./SocketWrapper";
import battleService from "../services/BattleService";
import User from "../model/User";
import BattleService from "../services/BattleService";
import UserDAO from "../dao/UserDAO";

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

class BattleSocket  {
    public setSocket(io: Server, socketWrapper: SocketWrapper): void {
        // Handle connection
        socketWrapper.socket.on(EBattleActions.BATTLE_WAITING, (data: WaitingData) => {
            // TODO : handle scenario when user is waiting multiple times
            // if (socketWrapper.battleId != -1) {
            //     console.log(`User ${socketWrapper.userId} is already waiting or in battle`);
            //     return;
            // }
            let battleId: number = data.battleId;
            const userId: number = socketWrapper.userId;
            const weather: number = typeof data.weather !== "undefined" ? data.weather : 0;
            const battleExists: boolean = typeof battleId !== "undefined";
            // Tournament mode : battle already exists
            if (battleExists) {
                console.log(`Battle ID: ${battleId}`);
                socketWrapper.tournament = true;
                if (battleService.handleJoining(userId, battleId) == -1) {
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
            socketWrapper.battleId = battleId;
            if (battleService.isBattleReady(battleId)){
                console.log(`Battle ID: ${battleId} is starting !`);
                battleService.getPlayers(battleId).forEach(player => {
                    // Send data to battle socket
                    // TODO : Create export type (here, we are sending socket ids !!!)
                    io.to(player.battleSocketId).emit(EBattleActions.BATTLE_START,
                        {
                            players: battleService.getPlayers(battleId),
                            weather: battleService.getWeather(battleId),
                            battleId: battleId
                        })
                    // Send data to tournament socket
                    if (battleExists) { // TODO : SRP... Battle should not handle tournament logic
                        io.to(player.tournamentSocketId).emit(EBattleActions.BATTLE_START,
                            {
                                players: battleService.getPlayers(battleId),
                                weather: battleService.getWeather(battleId),
                                battleId: battleId
                            })
                    }
                })
            }
        })
        // Handle actions
        socketWrapper.socket.on(EBattleActions.BATTLE_RECEIVE_ACTION, (data: BattleReceiveData) => {
            const accuracy: number = data.accuracy;
            const spellId: number = data.spellId;
            const battleId: number = socketWrapper.battleId
            console.log(`Received action from user ${socketWrapper.userId} for battle ${battleId} : spell ${spellId} / accuracy ${accuracy}`);
            BattleService.handleAction(spellId, battleId, accuracy, socketWrapper.userId)
            if (BattleService.isRoundOver(battleId)) {
                console.log(`Battle ID: ${battleId}'s round is over`);
                const data: BattleSendData[] = BattleService.processActions(battleId);
                data.forEach(sendData => {
                    const user: User | undefined = UserDAO.getUserById(sendData.targetId);
                    if (!user) return;
                    io.to(user.battleSocketId).emit(EBattleActions.BATTLE_SEND_ACTION, sendData);
                    if (socketWrapper.tournament) io.to(user.tournamentSocketId).emit(EBattleActions.BATTLE_RECEIVE_ACTION, sendData);
                    // If user was defeated, the game is over
                    // if (sendData.remainingHp <= 0) {
                    //     const defeatData: BattleEndData = {
                    //         userId: user.id,
                    //         status: "lose"
                    //     }
                    //     io.to(user.battleSocketId).emit(EBattleActions.BATTLE_OVER, sendData);
                    //     if (socketWrapper.tournament) io.to(user.tournamentSocketId).emit(EBattleActions.BATTLE_RECEIVE_ACTION, sendData);
                    // }
                })
                BattleService.newRound(battleId);
                if (battleService.isBattleOver(battleId)) {
                    console.log(`Battle ID: ${battleId} is over`);
                    const results: BattleEndData[] = BattleService.getWinners(battleId);
                    results.forEach(resultData => {
                        const user: User | undefined = UserDAO.getUserById(resultData.userId);
                        if (!user) return;
                        io.to(user.battleSocketId).emit(EBattleActions.BATTLE_OVER, resultData)
                        if (socketWrapper.tournament) io.to(user.tournamentSocketId).emit(EBattleActions.BATTLE_OVER, resultData);
                    })
                    // Delete game from DAO...
                }
            }
        })
    }

    handleDisconnect(io: Server, socket: SocketWrapper): void {
        // Si l'user se déconnecte, la partie est annulée
        if (socket.battleId != -1){
            if (BattleService.playerDisconnect(socket.battleId, socket.userId)) {
                BattleService.getPlayers(socket.battleId).forEach(player => {
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