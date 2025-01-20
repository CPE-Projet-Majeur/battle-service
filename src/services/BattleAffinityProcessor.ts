import {EHouse} from "../model/enums/EHouse";
import {EAffinity} from "../model/enums/EAffinity";

export class BattleProcessor {
    public static readonly affinityMultipliers: Record<EAffinity, Record<EAffinity, number>> = {
        [EAffinity.FIRE]: {
            [EAffinity.FIRE]: 1,
            [EAffinity.WATER]: 0.5,
            [EAffinity.WIND]: 1.2,
            [EAffinity.ICE]: 2,
            [EAffinity.NEUTRAL]: 1
        },
        [EAffinity.WATER]: {
            [EAffinity.FIRE]: 2,
            [EAffinity.WATER]: 1,
            [EAffinity.WIND]: 0.8,
            [EAffinity.ICE]: 1.2,
            [EAffinity.NEUTRAL]: 1
        },
        [EAffinity.WIND]: {
            [EAffinity.FIRE]: 0.8,
            [EAffinity.WATER]: 1.2,
            [EAffinity.WIND]: 1,
            [EAffinity.ICE]: 1.5,
            [EAffinity.NEUTRAL]: 1
        },
        [EAffinity.ICE]: {
            [EAffinity.FIRE]: 0.5,
            [EAffinity.WATER]: 0.8,
            [EAffinity.WIND]: 0.7,
            [EAffinity.ICE]: 1,
            [EAffinity.NEUTRAL]: 1
        },
        [EAffinity.NEUTRAL]: {
            [EAffinity.FIRE]: 1,
            [EAffinity.WATER]: 1,
            [EAffinity.WIND]: 1,
            [EAffinity.ICE]: 1,
            [EAffinity.NEUTRAL]: 1
        }
    };

    public static readonly houseAffinities: Record<EHouse, EAffinity> = {
        [EHouse.GRYFFINDOR]: EAffinity.FIRE,
        [EHouse.HUFFLEPUFF]: EAffinity.WATER,
        [EHouse.SLYTHERIN]: EAffinity.WIND,
        [EHouse.RAVENCLAW]: EAffinity.ICE
    };
}