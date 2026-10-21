// État initial, statistiques et coûts : fonctions pures, sans DOM, stockage ni horloge globale.
export const SAVE_KEY = 'braise-v2', BACKUP_KEY = 'braise-v2-secours', LEGACY_SAVE_KEY = 'braise-v1', SAVE_VERSION = 2;
import {
  KILLS_PER_STAGE, BASE_ATTACK, ATTACK_PER_WEAPON, ATTACK_PER_LEVEL, BASE_HEALTH, HEALTH_PER_ARMOR, HEALTH_PER_LEVEL,
  BASE_REWARD, REWARD_PER_STAGE, REWARD_PER_LUCK, BASE_COSTS, COST_GROWTH,
} from './balance.js';
import { bonusEquipement } from './equipement.js';

export {
  KILLS_PER_STAGE, BASE_ATTACK, ATTACK_PER_WEAPON, ATTACK_PER_LEVEL, BASE_HEALTH, HEALTH_PER_ARMOR, HEALTH_PER_LEVEL,
  BASE_REWARD, REWARD_PER_STAGE, REWARD_PER_LUCK, BASE_COSTS, COST_GROWTH,
};

export const fresh = now => ({ gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: now });
export const attack = s => BASE_ATTACK + s.weapon * ATTACK_PER_WEAPON + (s.level - 1) * ATTACK_PER_LEVEL + bonusEquipement(s.equipe).attaque;
export const maxHP = s => BASE_HEALTH + s.armor * HEALTH_PER_ARMOR + (s.level - 1) * HEALTH_PER_LEVEL + bonusEquipement(s.equipe).vieMax;
export const reward = s => BASE_REWARD + s.stage * REWARD_PER_STAGE + s.luck * REWARD_PER_LUCK + bonusEquipement(s.equipe).or;
export const cost = (s, k) => Math.floor(BASE_COSTS[k] * COST_GROWTH ** s[k]);
// Amélioration la moins chère (la première en cas d'égalité) : cible du premier achat guidé.
export const cheapestUpgrade = s => ['weapon', 'armor', 'luck'].reduce((a, k) => (cost(s, k) < cost(s, a) ? k : a));
