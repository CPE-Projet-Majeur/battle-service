//import CONFIG = require('config.json');
import express, {Express} from 'express';
import {createServer} from 'http';
import {Server} from "socket.io";
import BattleSocket from "./sockets/BattleSocket";
import TournamentSocket from "./sockets/tournamentSocket";
import SocketWrapper from "./sockets/SocketWrapper";
import User from "./model/User";
import path = require("path");
import UserDAO from "./dao/UserDAO";
import TournamentEventListener from "./bus/TournamentEventListener";

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
        const eventListener: TournamentEventListener = new TournamentEventListener(this.io);

        this.io.on('connection', (socket) => {
            // TODO : more guards
            const userId: number = Number(socket.handshake.query.userId);
            const userFirstName : string = String(socket.handshake.query.userFirstName);
            const userLastName : string = String(socket.handshake.query.userLastName);
            const userHouse : number = Number(socket.handshake.query.userHouse);
            const type: string = String(socket.handshake.query.type);
            // Create user if it does not exist
            let user: User | undefined = UserDAO.getUserById(userId);
            if (!user) {
                user = new User(userId,  userLastName, userFirstName, userHouse);
                user = UserDAO.save(user);
            }
            // Join room of sockets associated with the user
            socket.join(`user_${user.id}`)
            // Set socket events
            const wrapper: SocketWrapper = new SocketWrapper(socket, user.id);
            if (type == 'tournament') {
                console.log(`Received ${userId} connected for a tournament`);
                TournamentSocket.setSocket(this.io, wrapper);
                user.tournamentSocketId = socket.id;
            }
            BattleSocket.setSocket(this.io, wrapper);
            user.battleSocketId = socket.id;
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Disconnected from ${socket.id}`);
                if (type == 'tournament') TournamentSocket.handleDisconnect()
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