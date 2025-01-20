import User from "./User";
import {EWeather} from "./enums/EWeather";
import Spell from "./Spell";
import Player from "./Player";

export default class Battle {
    public static readonly DRAW: number = 0;

    private readonly _id:number;
    private readonly _players: Map<number, Player | null > = new Map();
    private readonly _tournamentId: number;
    private readonly _weather: EWeather;
    private _round: number = 0;
    private _winners: number[] = [];

    constructor(id: number, tournamentId: number, weather: number) {
        // this._players.set(player1.id, new Player(player1));
        // this._players.set(player2.id, new Player(player2));
        this._tournamentId = tournamentId;
        this._weather = Object.values(EWeather).includes(weather) ? (weather as EWeather) : EWeather.SUNNY;
        this._id = id;
    }

    public addPlayer(user: User): void {
        this._players.set(user.id, new Player(user));
    }

    ////////////////// GETTERS AND SETTERS //////////////////

    get id(): number {
        return this._id;
    }

    get round(): number {
        return this._round;
    }

    set round(value: number) {
        this._round = value;
    }

    get tournamentId(): number {
        return this._tournamentId;
    }

    get weather(): EWeather {
        return this._weather;
    }

    get winners(): number[] {
        return this._winners;
    }

    set winners(value: number[]) {
        this._winners = value;
    }

    get players(): Map<number, Player | null> {
        return this._players;
    }
}