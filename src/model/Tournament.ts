import Generator from "../utils/Generator";

export default class Tournament {
    private _id : number;
    private _code: string;
    private _name: string;
    private _active: boolean;
    private _battlesId: number[];
    private _usersId: number[];

    private static _CODE_LENGTH: number = 8;

    constructor(name: string) {
        this._id = Generator.generateId();
        this._code = Generator.generateCode(Tournament._CODE_LENGTH)
        this._name = name;
        this._active = false;
        this._battlesId = [];
        this._usersId = [];
    }


    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
    }

    get code(): string {
        return this._code;
    }

    set code(value: string) {
        this._code = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get active(): boolean {
        return this._active;
    }

    set active(value: boolean) {
        this._active = value;
    }

    get battlesId(): number[] {
        return this._battlesId;
    }

    set battlesId(value: number[]) {
        this._battlesId = value;
    }

    get usersId(): number[] {
        return this._usersId;
    }

    set usersId(value: number[]) {
        this._usersId = value;
    }
}