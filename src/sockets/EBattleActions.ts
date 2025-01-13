export enum EBattleActions {
    // This event is sent by user to say that they are waiting for another player
    BATTLE_WAITING = "BATTLE_WAITING",
    // This event is sent to users so they know that the battle is starting
    BATTLE_START = "BATTLE_START",
    // This event is sent by users to communicate their action
    BATTLE_RECEIVE_ACTION = 'BATTLE_RECEIVE_ACTION',
    // This event is sent to users to inform them of their opponent's action
    BATTLE_SEND_ACTION = 'BATTLE_SEND_ACTION',
    // WAIT_ACTION = 'WAIT_ACTION', // Si en tour par tour...
    // This event is sent to users to inform them that the battle is over
    BATTLE_OVER = 'BATTLE_OVER',
}