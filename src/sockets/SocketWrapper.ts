import {Socket} from "socket.io";

export default class SocketWrapper {

    private _socket: Socket
    private _userId: number;

    public constructor(socket: Socket) {
        this._socket = socket;
    }

    get socket() {
        return this._socket;
    }

    get userId() {
        return this._userId;
    }

    set userId(userId: number) {
        this._userId = userId;
    }

}