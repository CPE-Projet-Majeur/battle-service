import {EHouse} from "./enums/EHouse";
import {EWeather} from "./enums/EWeather";

export default class User {
    private _id:number;
    private _battleId: number = -1;
    private readonly _lastName: string;
    private readonly _firstName: string;
    // private login: string;
    // private email: string;
    // private account: float;
    private readonly _house: EHouse;
    // private wins:number;
    // private defeats:number;
    // private roles: String[];
    // private _battleSocketId: string = "";
    // private _tournamentSocketId: string = "";

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
}