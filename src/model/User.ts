import {EHouse} from "./enums/EHouse";
import {EWeather} from "./enums/EWeather";

export default class User {
    private _id:number;
    private _battleId: number = -1;
    private _tournamentId:number = -1; // Use a delegate class like TournamentMapper that make the join between Users and Tournament
    private readonly _lastName: string;
    private readonly _firstName: string;
    private readonly _house: EHouse;

    public constructor(id:number, lastName: string, firstName: string, house: number) {
        this._id = id;
        this._lastName = lastName;
        this._firstName = firstName;
        this._house = Object.values(EHouse).includes(house) ? (house as EHouse) : EHouse.GRYFFINDOR;
    }


    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
    }

    get lastName(): string {
        return this._lastName;
    }

    get firstName(): string {
        return this._firstName;
    }

    get house(): number {
        return this._house;
    }

    get battleId(): number {
        return this._battleId;
    }

    set battleId(value: number) {
        this._battleId = value;
    }

    get tournamentId(): number {
        return this._tournamentId;
    }

    set tournamentId(value: number) {
        this._tournamentId = value;
    }
}