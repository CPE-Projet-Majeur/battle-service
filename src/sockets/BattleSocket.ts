import {Server} from "socket.io";
import {EBattleEvents} from "./events/EBattleEvents";
import SocketWrapper from "./SocketWrapper";
import battleService from "../services/BattleService";
import User from "../model/User";
import BattleService from "../services/BattleService";
import UserDAO from "../dao/UserDAO";
import Battle from "../model/Battle";
import {ESharedEvents} from "./events/ESharedEvents";
import {eventBus} from "../bus/eventBus";

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
    battleId: number;
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
    public setSocket(io: Server, wrapper: SocketWrapper): void {

        wrapper.socket.on(EBattleEvents.BATTLE_WAITING, (data: WaitingData) => {
            // TODO : handle scenario when user is waiting multiple times
            // if (socketWrapper.battleId != -1) {
            //     console.log(`User ${socketWrapper.userId} is already waiting or in battle`);
            //     return;
            // }
            /////////////////////////// HOOK PLAYER TO A BATTLE //////////////////////////////
            let battleId: number = Number(data.battleId);
            const userId: number = wrapper.userId;
            const weather: number = typeof data.weather !== "undefined" ? data.weather : 0;
            const battleExists: boolean = !isNaN(battleId);
            console.log(`User ${userId} tries to join a battle. battleId is ${battleId}`)
            // Join a game associated with a tournament
            if (battleExists) {
                const battle: Battle | undefined = BattleService.getBattle(battleId);
                if (!battle) {
                    wrapper.socket.emit(ESharedEvents.ERROR, {
                        code: 1,
                        message: `Battle of ID ${battleId} not found.`
                    })
                    return;
                }
                if (battle.tournamentId == -1) {
                    wrapper.socket.emit(ESharedEvents.ERROR, {
                        code: 1,
                        message: `Battle of ID ${battleId} is not associated with a tournament.`
                    })
                    return;
                }
                wrapper.socket.join(`tournament_${battle.tournamentId}`)
                console.log(`Battle ID: ${battleId}`);
                //socketWrapper.tournament = true;
                if (battleService.handleJoining(userId, battle) == -1) {
                    console.log(`User ${userId} failed to join the battle of id ${battleId}`)
                    wrapper.socket.emit(ESharedEvents.ERROR, {
                        code: 4,
                        message: `Failed to join battle.`
                    })
                    return;
                }
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            // Outside of tournament mode : user is waiting in queue (this._waitingPlayers)
            else {
                battleId = battleService.handleWaiting(userId, weather)
                if (battleId == -1) {
                    console.log(`User ${userId} failed to wait for a battle`)
                    wrapper.socket.emit(ESharedEvents.ERROR, {
                        code: 5,
                        message: `Failed to wait for battle.`
                    })
                    return;
                }
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            wrapper.battleId = battleId;
            /////////////////////////// CAN THE BATTLE START ? //////////////////////////////
            const battle: Battle | undefined = BattleService.getBattle(battleId);
            if (!battle) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: `Battle of ID ${battleId} not found.`
                })
                return;
            }
            if (battleService.isBattleReady(battle)){
                console.log(`Battle ID: ${battleId} is starting !`);
                const players: User[] = BattleService.getPlayers(battle);
                const weather: number = BattleService.getWeather(battle);
                players.forEach((user: User) => {
                    io.to(`user_${user.id}`).emit(EBattleEvents.BATTLE_START,
                        {
                            players: players,
                            weather: weather,
                            battleId: battleId
                        })
                })
            }
            else wrapper.socket.emit("WAITING_ACKNOWLEDGED")
        })

        wrapper.socket.on(EBattleEvents.BATTLE_RECEIVE_ACTION, (data: BattleReceiveData) => {
            const accuracy: number = Number(data.accuracy);
            const spellId: number = Number(data.spellId);
            const battleId: number = Number(data.battleId)
            console.log(`BattleSocket : Received action (spellId : ${spellId}, accuracy : ${accuracy}, battleId: ${battleId}})`)
            // Error handling
            if(isNaN(accuracy) || isNaN(spellId) || isNaN(battleId)) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: "Invalid payload parameters."
                })
                return;
            }
            const battle: Battle | undefined = BattleService.getBattle(wrapper.battleId);
            if (!battle) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: `Battle of ID ${wrapper.battleId} not found.`
                })
                return;
            }
            if(!BattleService.isPlayerInBattle(battle, wrapper.userId)) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 1,
                    message: "This user is not fighting in this battle."
                })
                return;
            }
            if(!BattleService.isBattleReady(battle)) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 2,
                    message: "Battle has not started."
                })
                return;
            }
            if(!BattleService.handleAction(spellId, battle, accuracy, wrapper.userId)) {
                wrapper.socket.emit(ESharedEvents.ERROR, {
                    code: 4,
                    message: "This spell is unknown."
                });
                return;
            }
            console.log(`Received action from user ${wrapper.userId} for battle ${battle.id} : spell ${spellId} / accuracy ${accuracy}`);
            // Process action
            if (BattleService.isRoundOver(battle)) {
                // Send new game status to users
                console.log(`Battle ${battle.id}'s round is over`);
                const sendData: BattleSendData[] = BattleService.processActions(battle);
                BattleService.newRound(battle);
                BattleService.getPlayers(battle).forEach((player: User): void => {
                    const user: User | undefined = UserDAO.getUserById(player.id);
                    if (!user) return;
                    io.to(`user_${user.id}`).emit(EBattleEvents.BATTLE_SEND_ACTION, sendData);
                })
                if (battleService.isBattleOver(battle)) {
                    // Send game ending event to users
                    console.log(`Battle ${battle.id} is over`);
                    const results: BattleEndData[] = BattleService.processWinners(battle);
                    results.forEach(resultData => {
                        const user: User | undefined = UserDAO.getUserById(resultData.userId);
                        if (!user) return;
                        io.to(`user_${user.id}`).emit(EBattleEvents.BATTLE_OVER, resultData);
                    })
                    // If battle is part of a tournament, send event to tournament socket
                    if (battle.tournamentId != -1) {
                        console.log(`Notifying tournament ${battle.tournamentId}.`)
                        eventBus.emit(ESharedEvents.BRACKET_UPDATE, {
                            battleId: battle.id,
                            winnerIds: battle.winners,
                            tournamentId: battle.tournamentId
                        })
                    }
                    // TODO : Delete game from DAO...
                    return
                }
            }
        })
    }

    handleDisconnect(io: Server, socket: SocketWrapper): void {
        // Si l'user se déconnecte, la partie est annulée

        // TODO : Au lieu de socket.battleId, on fetch user avec UserDAO.
        //  User modele doit avoir un battleId sur l'id courant.
        if (socket.battleId != -1){
            const battle: Battle | undefined = BattleService.getBattle(socket.battleId);
            if (!battle) return
            if (BattleService.playerDisconnect(battle, socket.userId)) {
                BattleService.getPlayers(battle).forEach(player => {
                    io.emit(EBattleEvents.BATTLE_OVER, {
                        userId: player.id,
                        status: "forfeited"
                    })
                });
            }
        }
    }
}

export default new BattleSocket()