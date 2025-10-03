export enum SoldierType {
  SPEARMAN = 'SPEARMAN',
  KNIGHT = 'KNIGHT'
}
export const SoldierTypeConfig: {
  [K in SoldierType]: {
    cost: number;
    speed: number;
    damage: number;
    health: number;
  };
} = {
  [SoldierType.SPEARMAN]: {
    cost: 10,
    speed: 60,
    damage: 20,
    health: 100,
  },
  [SoldierType.KNIGHT]: {
    cost: 25,
    speed: 45,
    damage: 37,
    health: 110,
  },
};
