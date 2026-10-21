// État initial, statistiques et coûts : fonctions pures, sans DOM, stockage ni horloge globale.
export const SAVE_KEY = 'braise-v2', LEGACY_SAVE_KEY = 'braise-v1', SAVE_VERSION = 2;
export const KILLS_PER_STAGE = 5;
export const BASE_ATTACK = 8, ATTACK_PER_WEAPON = 4, ATTACK_PER_LEVEL = 2;
export const BASE_HEALTH = 100, HEALTH_PER_ARMOR = 35, HEALTH_PER_LEVEL = 10;
export const BASE_REWARD = 8, REWARD_PER_STAGE = 3, REWARD_PER_LUCK = 3;
export const BASE_COSTS = { weapon: 24, armor: 30, luck: 40 };
export const COST_GROWTH = 1.6;

export const fresh = now => ({ gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: now });
export const attack = s => BASE_ATTACK + s.weapon * ATTACK_PER_WEAPON + (s.level - 1) * ATTACK_PER_LEVEL;
export const maxHP = s => BASE_HEALTH + s.armor * HEALTH_PER_ARMOR + (s.level - 1) * HEALTH_PER_LEVEL;
export const reward = s => BASE_REWARD + s.stage * REWARD_PER_STAGE + s.luck * REWARD_PER_LUCK;
export const cost = (s, k) => Math.floor(BASE_COSTS[k] * COST_GROWTH ** s[k]);
