import {EAffinity} from "./enums/EAffinity";
import {EType} from "./enums/EType";

export default class Spell{
    private _id: number;
    private _name: string;
    private _description: string;
    private _affinity: EAffinity;
    private _type: EType;
    private _damage: number;
    private _difficulty: number;

    constructor(id: number, name: string, description: string, affinity: string, type: string, damage: number, difficulty: number) {
        this._id = id;
        this._name = name;
        this._description = description;
        this._affinity = this.parseAffinity(affinity);
        this._type = this.parseType(type);
        this._damage = damage;
        this._difficulty = difficulty;
    }

    private parseAffinity(affinity: string): EAffinity {
        if (!affinity) {
            console.warn(`Affinity is missing or undefined, defaulting to FIRE`);
            return EAffinity.FIRE;
        }
        const formattedAffinity = affinity.toUpperCase(); // Convertir en majuscules pour correspondre aux enums
        return (EAffinity as any)[formattedAffinity] ?? EAffinity.FIRE;
    }

    private parseType(type: string): EType {
        if (!type) {
            console.warn(`Type is missing or undefined, defaulting to ATTACK`);
            return EType.ATTACK;
        }
        const formattedType = type.toUpperCase();
        return (EType as any)[formattedType] ?? EType.ATTACK;
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

    get description(): string {
        return this._description;
    }

    set description(value: string) {
        this._description = value;
    }

    get difficulty(): number {
        return this._difficulty;
    }

    set difficulty(value: number) {
        this._difficulty = value;
    }
}