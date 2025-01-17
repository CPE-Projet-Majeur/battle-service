import {EHouse} from "./enums/EHouse";
import {EWeather} from "./enums/EWeather";

export default class User {
    private _id:number;
    private _lastName: string;
    private _firstName: string;
    // private login: string;
    // private email: string;
    // private account: float;
    private _house: EHouse;
    // private wins:number;
    // private defeats:number;
    // private roles: String[];
    private _battleSocketId: string = "";
    private _tournamentSocketId: string = "";

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

    set lastName(value: string) {
        this._lastName = value;
    }

    get firstName(): string {
        return this._firstName;
    }

    set firstName(value: string) {
        this._firstName = value;
    }

    get house(): number {
        return this._house;
    }

    set house(value: number) {
        this._house = value;
    }

    get battleSocketId(): string {
        return this._battleSocketId;
    }

    set battleSocketId(value: string) {
        this._battleSocketId = value;
    }

    get tournamentSocketId(): string {
        return this._tournamentSocketId;
    }

    set tournamentSocketId(value: string) {
        this._tournamentSocketId = value;
    }
}