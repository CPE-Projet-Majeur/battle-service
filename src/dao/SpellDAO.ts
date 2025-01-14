import ADAO from "./ADAO";
import Spell from "../model/Spell";


class SpellDAO extends ADAO {

    private static tempData : Spell[] = [
        new Spell(1, "Aguamenti", 1, 1, 20),
        new Spell(2, "Ascendio", 1, 1, 20),
        new Spell(3, "Bombarda", 1, 1, 20),
        new Spell(4, "Confundo", 1, 1, 20),
        new Spell(5, "Glacius", 1, 1, 20),
        new Spell(6, "Incendio", 1, 1, 20),
        new Spell(7, "Protego", 1, 1, 20),
        new Spell(8, "Ventus", 1, 1, 200)
    ]

    public getSpellById(id: number): Spell | undefined {
        // Fetch from spell service
        return SpellDAO.tempData.find(spell => spell.id === id);
    }

}

export default new SpellDAO()