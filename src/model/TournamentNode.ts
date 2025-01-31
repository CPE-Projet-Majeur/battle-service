import User from "./User";
import UserDAO from "../dao/UserDAO";

export default class TournamentNode {
    private _userIds: number[] = []; // WARNING : This prevents the GC from erasing the user
    private _winners: number[] = [];
    private _status: string = "ongoing";
    private _battleId: number; // WARNING : This prevents the GC from erasing the battle after it is finished since this still points to it 
    private _left: TournamentNode | null = null;
    private _right: TournamentNode | null = null;


    constructor(userIds: number[], left: TournamentNode | null, right: TournamentNode | null, battleId: number) {
        this._userIds = userIds;
        this._left = left;
        this._right = right;
        this._battleId = battleId;
    }

    public serialize(): string {
        // TODO : VERY UGLY TO DO THAT THERE => REWORD ARCHITECTURE SO THAT USERSNAMES ARE STORED IN ATTRIBUTES
        const userNames: string[] = [];
        const winnerNames: string[] = [];
        this._userIds.forEach((id: number) => {
            const user: User | undefined = UserDAO.getUserById(id);
            if (!user) return null;
            if (this._winners.includes(id)) winnerNames.push(user.firstName)
            userNames.push(user.firstName);
        })
        return JSON.stringify({
            userId: this._userIds,
            userNames: userNames,
            winnersIds: this._winners, // TODO : Remove when architecture is reworked
            winnersNames: winnerNames,
            status: this._status
        });
    }

    get userIds(): number[] {
        return this._userIds;
    }

    set userIds(value: number[]) {
        this._userIds = value;
    }

    get winners(): number[] {
        return this._winners;
    }

    set winners(value: number[]) {
        this._winners = value;
    }

    get left(): TournamentNode | null {
        return this._left;
    }

    set left(value: TournamentNode | null) {
        this._left = value;
    }

    get right(): TournamentNode | null {
        return this._right;
    }

    set right(value: TournamentNode | null) {
        this._right = value;
    }

    get status(): string {
        return this._status;
    }

    set status(value: string) {
        this._status = value;
    }

    get battleId(): number {
        return this._battleId;
    }

    set battleId(value: number) {
        this._battleId = value;
    }
}