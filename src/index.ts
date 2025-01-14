//import CONFIG = require('config.json');
import express, {Express} from 'express';
import {createServer} from 'http';
import {Server} from "socket.io";
import BattleSocket from "./sockets/battleSocket";
import TournamentSocket from "./sockets/tournamentSocket";
import SocketWrapper from "./sockets/SocketWrapper";
import User from "./model/User";
import path = require("path");
import UserDAO from "./dao/UserDAO";

class MyApp {
    //private readonly PORT: number = CONFIG.port;
    //private readonly HOST: string = CONFIG.host;
    private readonly PORT: number = 3000;
    private readonly HOST: string = "0.0.0.0";
    private readonly server: any;

    private application:Express;
    private io:Server;

    constructor() {
        this.application = express();
        this.server = createServer(this.application);

        //////////////// MIDDLEWARES /////////////////
        this.application.disable('x-powered-by');
        this.application.use(express.static(path.join(__dirname, "../static")));
        this.application.use(express.json());
        this.application.use((req, res, next) => { // Debug
            console.log(`Received ${req.method} request for ${req.url}`);
            next();
        });

        ////////////////// SOCKETS //////////////////
        this.io = new Server(this.server);
        this.io.on('connection', (socket) => {
            console.log(`Received ${socket.id}`);
            const userId: number = Number(socket.handshake.query.userId);
            const type: string = String(socket.handshake.query.type);
            // Create user if it does not exist
            // const user: User = new User(userId, "Floppa", "McFlopper", 0);
            let user: User | undefined = UserDAO.getUserById(userId);
            if (!user) {
                user = new User(userId, "Floppa", "McFlopper", 0);
                user = UserDAO.save(user);
            }
            // Set socket wrapper (bad DIP ....) to keep userId in memory
            const wrapper: SocketWrapper = new SocketWrapper(socket, user.id);
            // Set socket events
            if (type == 'tournament') {
                console.log(`Received ${userId} connected for a tournament`);
                TournamentSocket.setSocket(this.io, socket);
                user.tournamentSocketId = socket.id;
            }
            BattleSocket.setSocket(this.io, wrapper);
            user.battleSocketId = socket.id;
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Disconnected from ${socket.id}`);
                if (type == 'tournament') {
                    TournamentSocket.handleDisconnect()
                }
                BattleSocket.handleDisconnect(this.io, wrapper)
            })
        })

        ////////////////// LISTEN ///////////////////
        this.server.listen(this.PORT, this.HOST, () => {
            console.log(`Server is running at http://${this.HOST}:${this.PORT}`);
        });
    }
}

const app = new MyApp()