// Talents (M3.5a) : fonctions pures, sans DOM ni horloge. `s.talents` est { identifiant: rang } ; un rang à 0 est omis.
import {
  TALENT_LEVELS_PER_POINT, TALENT_MAX_RANK, TALENT_IDS, TALENT_ASSAULT_ATTACK, TALENT_RAMPART_HEALTH, TALENT_RAMPART_HEAL,
  TALENT_FORTUNE_GOLD, TALENT_BRAISE_COOLDOWN, SKILL_COOLDOWN_SECONDS, HEAL_ON_VICTORY,
} from './balance.js';

export { TALENT_LEVELS_PER_POINT, TALENT_MAX_RANK, TALENT_IDS };

export const rang = (s, id) => (s.talents && s.talents[id]) || 0;
export const pointsTalents = s => Math.max(0, Math.floor((s.level - 1) / TALENT_LEVELS_PER_POINT));
export const pointsDepenses = s => TALENT_IDS.reduce((n, id) => n + rang(s, id), 0);
export const pointsLibres = s => Math.max(0, pointsTalents(s) - pointsDepenses(s));

// Refusé (état rendu tel quel) : talent inconnu, rang maximum atteint ou aucun point libre.
export function investir(s, id) {
  if (!TALENT_IDS.includes(id) || rang(s, id) >= TALENT_MAX_RANK || pointsLibres(s) < 1) return s;
  return { ...s, talents: { ...s.talents, [id]: rang(s, id) + 1 } };
}

// Gratuite : tous les rangs à 0, donc tous les points rendus.
export const reinitialiserTalents = s => ({ ...s, talents: {} });

export const multAttaque = s => 1 + TALENT_ASSAULT_ATTACK * rang(s, 'assaut');
export const multVieMax = s => 1 + TALENT_RAMPART_HEALTH * rang(s, 'rempart');
export const multOr = s => 1 + TALENT_FORTUNE_GOLD * rang(s, 'fortune');
export const soinVictoire = s => HEAL_ON_VICTORY + TALENT_RAMPART_HEAL * rang(s, 'rempart');
export const rechargeCompetence = s => SKILL_COOLDOWN_SECONDS - TALENT_BRAISE_COOLDOWN * rang(s, 'braise');
