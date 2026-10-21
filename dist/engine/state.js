// État initial, statistiques et coûts : fonctions pures, sans DOM, stockage ni horloge globale.
export const SAVE_KEY = 'braise-v2', BACKUP_KEY = 'braise-v2-secours', LEGACY_SAVE_KEY = 'braise-v1', SAVE_VERSION = 7;
import {
  KILLS_PER_STAGE, BASE_ATTACK, ATTACK_PER_WEAPON, ATTACK_PER_LEVEL, BASE_HEALTH, HEALTH_PER_ARMOR, HEALTH_PER_LEVEL,
  BASE_REWARD, REWARD_PER_STAGE, REWARD_PER_LUCK, BASE_COSTS, COST_GROWTH, UPGRADE_MAX_LEVEL, ZONE_IDS, ZONES,
} from './balance.js';
import { bonusEquipement } from './equipement.js';
import { objectifsNeufs } from './objectifs.js';
import { multAttaque, multVieMax, multOr } from './talents.js';

export {
  KILLS_PER_STAGE, BASE_ATTACK, ATTACK_PER_WEAPON, ATTACK_PER_LEVEL, BASE_HEALTH, HEALTH_PER_ARMOR, HEALTH_PER_LEVEL,
  BASE_REWARD, REWARD_PER_STAGE, REWARD_PER_LUCK, BASE_COSTS, COST_GROWTH, UPGRADE_MAX_LEVEL,
};

// Zone qui contient un étage (au-delà de la dernière plage : la dernière zone).
export const zoneDeEtage = etage => ZONE_IDS.find(id => etage <= ZONES[id].fin) ?? ZONE_IDS[ZONE_IDS.length - 1];
export const fresh = now => ({ gold: 0, xp: 0, level: 1, stage: 1, zone: 'foret', meilleurEtage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: now, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: [] });
export const attack = s => Math.round((BASE_ATTACK + s.weapon * ATTACK_PER_WEAPON + (s.level - 1) * ATTACK_PER_LEVEL + bonusEquipement(s.equipe).attaque) * multAttaque(s));
export const maxHP = s => Math.round((BASE_HEALTH + s.armor * HEALTH_PER_ARMOR + (s.level - 1) * HEALTH_PER_LEVEL + bonusEquipement(s.equipe).vieMax) * multVieMax(s));
export const reward = s => Math.round((BASE_REWARD + s.stage * REWARD_PER_STAGE + s.luck * REWARD_PER_LUCK + bonusEquipement(s.equipe).or) * multOr(s));
// Le niveau est borné à UPGRADE_MAX_LEVEL dans la formule : le coût reste un nombre fini, quel que soit l'état reçu.
export const cost = (s, k) => Math.floor(BASE_COSTS[k] * COST_GROWTH ** Math.min(s[k], UPGRADE_MAX_LEVEL));
export const upgradeAtMax = (s, k) => s[k] >= UPGRADE_MAX_LEVEL;
// Amélioration la moins chère (la première en cas d'égalité) : cible du premier achat guidé.
export const cheapestUpgrade = s => ['weapon', 'armor', 'luck'].reduce((a, k) => (cost(s, k) < cost(s, a) ? k : a));
