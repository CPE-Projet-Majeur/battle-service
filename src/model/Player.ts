import User from "./User";
import Spell from "./Spell";

/**
 * Represents a player and it's values for the current round.
 */
export default class Player {
    private static HEALTH_POINTS: number = 100;
    private readonly _user: User;
    private _status: string = "alive";
    private _spell : Spell | null = null;
    private _accuracy: number = 0;
    private _hp: number = Player.HEALTH_POINTS;
    private _defenseMultiplier: number = 1;
    private _damage: number = 0;

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

    get damage(): number {
        return this._damage;
    }

    set damage(value: number) {
        this._damage = value;
    }

    get defenseMultiplier(): number {
        return this._defenseMultiplier;
    }

    set defenseMultiplier(value: number) {
        this._defenseMultiplier = value;
    }
}