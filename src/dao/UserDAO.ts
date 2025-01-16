import User from "../model/User";
import AbstractDAO from "./AbstractDAO";

class UserDAO extends AbstractDAO {

    private _users: User[] = []

    public save(user: User): User {
        // User id is already correct wehn received
        let exists: boolean = false;
        this._users.forEach((u: User) => {
            if (u.id === user.id) exists = true;
        })
        if (!exists) this._users.push(user);
        return user;
    }

    public getUserById(id: number): User | undefined {
        return this._users.find(user => user.id === id);
    }
}

export default new UserDAO();