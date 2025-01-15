import TournamentNode from "./TournamentNode";

export default class Tournament {
    private _id : number;
    private _code: string;
    private _name: string;
    private _active: boolean = false;
    private _usersId: number[] = [];
    private _tree: Map<number, TournamentNode[]> = new Map();
    private _currentBracket: number = 0;
    private _winners: number[] = [];

    private static _CODE_LENGTH: number = 8;

    constructor(id: number, name: string, code: string) {
        this._id = id
        this._code = code
        this._name = name;
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

    get usersId(): number[] {
        return this._usersId;
    }

    set usersId(value: number[]) {
        this._usersId = value;
    }

    get tree(): Map<number, TournamentNode[]> {
        return this._tree;
    }

    get currentBracket(): number {
        return this._currentBracket;
    }

    set currentBracket(value: number) {
        this._currentBracket = value;
    }

    get winners(): number[] {
        return this._winners;
    }

    set winners(value: number[]) {
        this._winners = value;
    }
}