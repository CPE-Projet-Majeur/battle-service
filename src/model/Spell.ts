export default class Spell{
    private _id: number;
    private _name: string;
    private _affinity: string;
    private _type: string;
    private _damage: number;


    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get affinity(): string {
        return this._affinity;
    }

    set affinity(value: string) {
        this._affinity = value;
    }

    get type(): string {
        return this._type;
    }

    set type(value: string) {
        this._type = value;
    }

    get damage(): number {
        return this._damage;
    }

    set damage(value: number) {
        this._damage = value;
    }
}