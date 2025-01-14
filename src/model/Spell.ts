import {EAffinity} from "./EAffinity";
import {EType} from "./EType";

export default class Spell{
    private _id: number;
    private _name: string;
    private _affinity: EAffinity;
    private _type: EType;
    private _damage: number;

    constructor(id: number, name: string, affinity: number, type: number, damage: number) {
        this._id = id;
        this._name = name;
        this._affinity = Object.values(EAffinity).includes(affinity) ? (affinity as EAffinity): EAffinity.FIRE;
        this._type = Object.values(EType).includes(type) ? (type as EType) : EType.ATTACK;
        this._damage = damage;
    }

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

    get affinity(): EAffinity {
        return this._affinity;
    }

    set affinity(value: EAffinity) {
        this._affinity = value;
    }

    get type(): EType {
        return this._type;
    }

    set type(value: EType) {
        this._type = value;
    }

    get damage(): number {
        return this._damage;
    }

    set damage(value: number) {
        this._damage = value;
    }
}