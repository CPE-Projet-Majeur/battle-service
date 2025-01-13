import {Server, Socket} from "socket.io";
import ISocket from "./ISocket";

class TournamentSocket implements ISocket {

    public setSocket(io: Server, socket: Socket) {

    }

    handleDisconnect(): void {
    }
}

export default new TournamentSocket();