import User from "./User";
import {EWeather} from "./EWeather";
import Spell from "./Spell";

class Player {
    private static HEALTH_POINTS: number = 100;
    private readonly _user: User;
    private _status: string = "alive";
    private _spell : Spell | null = null;
    private _accuracy: number = 0;
    private _hp: number = Player.HEALTH_POINTS;

    constructor(user: User) {
        this._user = user;
    }

    get user(): User {
        return this._user;
    }

    get hp(): number {
        return this._hp;
    }

    set hp(value: number) {
        if (value < 0) {
            this._hp = 0;
            return;
        }
        this._hp = value;
    }


    get spell(): Spell | null {
        return this._spell;
    }

    set spell(value: Spell | null) {
        this._spell = value;
    }

    get accuracy(): number {
        return this._accuracy;
    }

    set accuracy(value: number) {
        this._accuracy = value;
    }


    get status(): string {
        return this._status;
    }

    set status(value: string) {
        this._status = value;
    }
}

export default class Battle {
    public static readonly DRAW: number = 0;

    private readonly _id:number;
    private readonly _players: Map<number, Player> = new Map();
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

    get players(): Map<number, Player> {
        return this._players;
    }
}