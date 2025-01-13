import {Server} from "socket.io";
import ISocket from "./ISocket";
import {EBattleActions} from "./EBattleActions";
import SocketWrapper from "./SocketWrapper";
import battleService from "../services/BattleService";
import User from "../model/User";

type WaitingData = {
    battleId: number;
    //userId: number;
    weather: string;
}

export type BattleStartData = {
    players: User[];
    weather: string;
}

type BattleReceiveData = {
    spellId: number;
    accuracy: number;
    // userId: number; // A voir, car avec ma super socket polymorphée je l'ai déjà...
}

export type BattleSendData = {
    targetId: number;
    damage: number;
    accuracy: number;
    spellName: string;
    remainingHp: number;
}

type BattleEndData = {
    status: string;
}

class BattleSocket  {
    public setSocket(io: Server, socketWrapper: SocketWrapper): void {
        socketWrapper.socket.on(EBattleActions.BATTLE_WAITING, (data: WaitingData) => {
            let battleId: number = data.battleId;
            const userId: number = socketWrapper.userId;
            const tournament: boolean = typeof battleId !== "undefined";
            // Tournament mode
            if (tournament) {
                console.log(`Battle ID: ${battleId}`);
                if (battleService.handleJoining(userId, battleId) == -1) console.log(`User ${userId} failed to join the battle of id ${battleId}`)
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            // Outside of tournament mode
            else {
                battleId = battleService.handleJoining(userId, battleId)
                if (battleId == -1) console.log(`User ${userId} failed to wait for a battle`)
                console.log(`User ${userId} joined the battle of id ${battleId}`);
            }
            // Check if battle is ready to start
            if (battleService.isBattleReady(battleId)){
                console.log(`Battle ID: ${battleId} is starting !`);
                battleService.getPlayers(battleId).forEach(player => {
                    io.to(player.battleSocketId).emit(EBattleActions.BATTLE_START,
                        {
                            players: battleService.getPlayers(battleId),
                            weather: battleService.getWeather(battleId)
                        })
                    if (tournament) {
                        io.to(player.tournamentSocketId).emit(EBattleActions.BATTLE_START,
                            {
                                players: battleService.getPlayers(battleId),
                                weather: battleService.getWeather(battleId)
                            })
                    }
                })
            }
        })

        socketWrapper.socket.on(EBattleActions.BATTLE_RECEIVE_ACTION, (data: any) => {

        })
    }

    handleDisconnect(): void {
        // Si l'user se déconnecte, on regarde s'l est dans combat si oui forfait + envoyer à l'autre GAME_OVER
    }
}

export default new BattleSocket()