// Libellés français du rallumage (M5.2b) : purs, tirés de `apercuRallumage` pour que l'interface ne dise rien de plus que le moteur.
import { RALLUMAGE_DEBLOCAGE } from './balance.js';
import { rallumageDisponible, apercuRallumage } from './rallumage.js';

const pct = x => `+${(Math.round(x * 1000) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`; // 7,5 % par éclat : un demi-point doit rester visible
const eclats = n => `${n.toLocaleString('fr-FR')} ${n > 1 ? 'éclats' : 'éclat'}`;

export const CONDITION_RALLUMAGE = `Rallumer la braise : vaincre le gardien de l’étage ${RALLUMAGE_DEBLOCAGE}`;

// { condition } avant déblocage ; { etat, gain } après (`gain` vide si rien à gagner).
export function texteRallumage(s) {
  if (!rallumageDisponible(s)) return { condition: CONDITION_RALLUMAGE, etat: '', gain: '' };
  const a = apercuRallumage(s), avant = a.eclatsApres - a.eclatsGagnes;
  return {
    condition: '',
    etat: `${eclats(avant)} · ${pct(a.bonusAvant)} attaque, vie et or`,
    gain: a.eclatsGagnes > 0 ? `Si vous rallumez maintenant : +${eclats(a.eclatsGagnes)} → ${pct(a.bonusApres)}` : 'Aucun éclat à gagner pour l’instant : progressez plus loin.',
  };
}

// Corps du dialogue de confirmation : gains, puis les deux listes.
export function confirmationRallumage(s) {
  const a = apercuRallumage(s);
  return {
    gain: `Vous gagnez +${eclats(a.eclatsGagnes)} : ${eclats(a.eclatsApres)} en tout, ${pct(a.bonusApres)} attaque, vie et or.`,
    remisAZero: a.remisAZero,
    conserve: a.conserve,
  };
}

export const messageRallumage = n => `Braise rallumée : +${eclats(n)}`;
