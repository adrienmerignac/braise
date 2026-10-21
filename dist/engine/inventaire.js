// Inventaire : équiper, déséquiper et comparer avant/après. Pur, sans DOM ; renvoie de nouveaux états sans modifier les arguments.
import { attack, maxHP, reward } from './state.js';
import { EQUIPMENT_SLOTS, NOMS_EMPLACEMENT, NOMS_RARETE } from './equipement.js';
import { INVENTORY_CAP } from './balance.js';

export const NOMS_STAT = Object.freeze({ attaque: 'attaque', vieMax: 'vie max', reductionRiposte: 'réduction de riposte', or: 'or / victoire' });
export const nomEmplacement = slot => NOMS_EMPLACEMENT[slot];
export const nomRarete = rarete => NOMS_RARETE[rarete];

// Delta signé avec un vrai moins typographique : « +12 », « −3 », « 0 ».
export const signe = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
export const texteBonus = objet => Object.entries(objet.bonus).map(([stat, v]) => `+${v} ${NOMS_STAT[stat]}`).join(' · ');

// Équipe un objet de l'inventaire (par référence) : celui qui occupait l'emplacement prend sa place dans l'inventaire.
export function equiper(s, objet) {
  const inventaire = s.inventaire ?? [];
  const i = inventaire.indexOf(objet);
  if (i < 0 || !EQUIPMENT_SLOTS.includes(objet.emplacement)) return { s, ok: false, remplace: null };
  const ancien = s.equipe?.[objet.emplacement] ?? null;
  const reste = [...inventaire];
  if (ancien) reste[i] = ancien; else reste.splice(i, 1);
  return { s: { ...s, inventaire: reste, equipe: { ...s.equipe, [objet.emplacement]: objet } }, ok: true, remplace: ancien };
}

// Retire l'objet d'un emplacement et le range dans l'inventaire ; refusé (motif 'plein') si l'inventaire n'a plus de place.
export function desequiper(s, emplacement) {
  const objet = s.equipe?.[emplacement];
  if (!objet) return { s, ok: false, motif: 'vide' };
  const inventaire = s.inventaire ?? [];
  if (inventaire.length >= INVENTORY_CAP) return { s, ok: false, motif: 'plein' };
  const equipe = { ...s.equipe };
  delete equipe[emplacement];
  return { s: { ...s, inventaire: [...inventaire, objet], equipe }, ok: true };
}

// Statistiques affichées avant/après : équiper `objet` (de l'inventaire) ou, s'il est déjà équipé, le retirer.
export function comparer(s, objet) {
  const equipe = { ...s.equipe };
  if (s.equipe?.[objet.emplacement] === objet) delete equipe[objet.emplacement]; else equipe[objet.emplacement] = objet;
  const apres = { ...s, equipe };
  const ligne = (nom, f) => ({ nom, avant: f(s), apres: f(apres), delta: f(apres) - f(s) });
  return [ligne('Attaque', attack), ligne('Vie max', maxHP), ligne('Or / victoire', reward)];
}
