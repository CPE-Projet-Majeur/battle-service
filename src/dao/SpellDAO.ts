import AbstractDAO from "./AbstractDAO";
import Spell from "../model/Spell";
import axios from "axios";


class SpellDAO extends AbstractDAO {

    private static API_ADDRESS: string = process.env.SPELL_API_ADDRESS || "http://127.0.0.1:8084/spells";

    public async getSpellById(id: number): Promise<Spell | undefined> {
        const url: string = SpellDAO.API_ADDRESS + `/${id}`;
        try {
            const response = await axios.get(url);
            if (response.status === 200) {
                const data = response.data;
                return new Spell(data.id, data.name, data.description, data.affinity, data.number, data.damage, data.difficulty);
            }
            return undefined;
        } catch (error) {
            console.error('Erreur lors de la requête GET:', error);
            return undefined;
        }
    }
}

export default new SpellDAO()