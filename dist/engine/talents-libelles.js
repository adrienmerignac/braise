// Libellés du panneau Talents (M3.5b) : textes et comparaisons avant/après. Pur, sans DOM ; l'effet réel vit dans talents.js.
import { attack, maxHP, reward } from './state.js';
import { investir, rang, pointsLibres, pointsDepenses, pointsTalents, rechargeCompetence, soinVictoire, TALENT_IDS, TALENT_MAX_RANK } from './talents.js';
import { TALENT_ASSAULT_ATTACK, TALENT_RAMPART_HEALTH, TALENT_RAMPART_HEAL, TALENT_FORTUNE_GOLD, TALENT_BRAISE_COOLDOWN } from './balance.js';

const pct = x => `${Math.round(x * 100)} %`;
export const NOMS_TALENT = Object.freeze({ assaut: 'Assaut', rempart: 'Rempart', fortune: 'Fortune', braise: 'Braise vive' });
export const EFFET_RANG = Object.freeze({
  assaut: `+${pct(TALENT_ASSAULT_ATTACK)} d’attaque`,
  rempart: `+${pct(TALENT_RAMPART_HEALTH)} de vitalité, +${TALENT_RAMPART_HEAL} soins par victoire`,
  fortune: `+${pct(TALENT_FORTUNE_GOLD)} d’or par victoire`,
  braise: `−${TALENT_BRAISE_COOLDOWN} s de recharge de la Frappe de braise`,
});

export const nomTalent = id => NOMS_TALENT[id];
export const rangTexte = (s, id) => `${rang(s, id)}/${TALENT_MAX_RANK}`;
export const effetSuivant = (s, id) => (rang(s, id) >= TALENT_MAX_RANK ? 'Rang maximum atteint' : `Rang suivant : ${EFFET_RANG[id]}`);
export const pointsTexte = s => { const n = pointsLibres(s); return n === 0 ? 'Aucun point libre' : `${n} point${n > 1 ? 's' : ''} libre${n > 1 ? 's' : ''}`; };
export const investissable = (s, id) => investir(s, id) !== s;
export const libelleInvestir = (s, id) => (rang(s, id) >= TALENT_MAX_RANK ? 'Rang maximum' : pointsLibres(s) < 1 ? 'Aucun point libre' : `Investir · rang ${rang(s, id) + 1}`);

// Lignes avant/après d'un talent (même forme que `comparer` de l'inventaire) ; `meilleur` dit si la baisse est un gain (recharge).
export function comparerTalent(avant, apres) {
  const ligne = (nom, f, meilleur = 1) => ({ nom, avant: f(avant), apres: f(apres), delta: f(apres) - f(avant), meilleur });
  return [
    ligne('Attaque', attack), ligne('Vie max', maxHP), ligne('Or / victoire', reward),
    ligne('Soin / victoire', soinVictoire), ligne('Recharge (s)', rechargeCompetence, -1),
  ].filter(l => l.delta !== 0);
}

export function messageInvestir(s, id) {
  return `${nomTalent(id)} passe au rang ${rang(s, id)}/${TALENT_MAX_RANK} : ${EFFET_RANG[id]}.`;
}

export function texteConfirmation(s) {
  const n = pointsDepenses(s);
  const detail = TALENT_IDS.filter(id => rang(s, id) > 0).map(id => `${nomTalent(id)} ${rangTexte(s, id)}`).join(', ');
  return `Tous les rangs (${detail}) seront remis à zéro et leurs effets disparaîtront. Tu récupères ${n} point${n > 1 ? 's' : ''}, soit ${pointsTalents(s)} à réinvestir. C’est gratuit.`;
}
