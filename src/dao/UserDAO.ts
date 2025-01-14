import User from "../model/User";
import ADAO from "./ADAO";

class UserDAO extends ADAO {

    private _users: User[] = []

    public save(user: User): User {
        // User id is already correct wehn received
        this._users.push(user);
        return user;
    }

    public getUserById(id: number): User | undefined {
        return this._users.find(user => user.id === id);
    }
}

export default new UserDAO();