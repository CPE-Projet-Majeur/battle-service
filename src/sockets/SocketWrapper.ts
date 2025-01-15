import {Socket} from "socket.io";

export default class SocketWrapper {

    private readonly _socket: Socket
    private readonly _userId: number;
    private _battleId: number = -1;
    private _tournamentId: number = -1;

    public constructor(socket: Socket, userId: number) {
        this._socket = socket;
        this._userId = userId;
    }

    get socket() {
        return this._socket;
    }

    get userId() {
        return this._userId;
    }

    get battleId(): number {
        return this._battleId;
    }

    set battleId(value: number) {
        this._battleId = value;
    }

    get tournament(): number {
        return this._tournamentId;
    }

    set tournament(value: number) {
        this._tournamentId = value;
    }
}