import {Server, Socket} from "socket.io";

export default interface ISocket {
    setSocket(io: Server, socket: Socket) : void
    handleDisconnect(): void
}