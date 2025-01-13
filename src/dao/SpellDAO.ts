import ADAO from "./ADAO";
import Spell from "../model/Spell";

class SpellDAO extends ADAO {

    public getSpellById(id: number): Spell {
        // Fetch from spell service

    }

}

export default new SpellDAO()