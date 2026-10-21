// Inventaire : équiper, déséquiper et comparer avant/après. Pur, sans DOM ; renvoie de nouveaux états sans modifier les arguments.
import { attack, maxHP, reward } from './state.js';
import { EQUIPMENT_SLOTS, NOMS_EMPLACEMENT, NOMS_RARETE, creerObjet } from './equipement.js';
import {
  INVENTORY_CAP, RECYCLE_GOLD_BASE, RECYCLE_LEVEL_GROWTH, RECYCLE_CONFIRM_RARITIES,
  EQUIPMENT_UPGRADE_MAX, EQUIPMENT_UPGRADE_BASE_COST, COST_GROWTH,
} from './balance.js';

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

// Recyclage : or selon la rareté et le niveau d'objet. Un objet équipé ne se recycle pas (motif 'equipe') : il faut le retirer d'abord.
export const orRecyclage = objet => Math.floor(RECYCLE_GOLD_BASE[objet.rarete] * (1 + RECYCLE_LEVEL_GROWTH * (objet.niveau - 1)));
export const confirmationRequise = objet => RECYCLE_CONFIRM_RARITIES.includes(objet.rarete);

// `confirme` doit être vrai pour un objet rare ou épique, sinon refus 'confirmation' (aucun changement).
export function recycler(s, objet, { confirme = false } = {}) {
  const i = (s.inventaire ?? []).indexOf(objet);
  if (i < 0) return { s, ok: false, motif: Object.values(s.equipe ?? {}).includes(objet) ? 'equipe' : 'absent' };
  if (confirmationRequise(objet) && !confirme) return { s, ok: false, motif: 'confirmation' };
  const or = orRecyclage(objet);
  return { s: { ...s, inventaire: s.inventaire.filter((_, j) => j !== i), gold: s.gold + or }, ok: true, or };
}

// Amélioration : coût du niveau suivant, croissant au même facteur que les achats (COST_GROWTH).
export const coutAmelioration = objet => Math.floor(EQUIPMENT_UPGRADE_BASE_COST[objet.rarete] * COST_GROWTH ** (objet.amelioration ?? 0));

// Monte l'objet (inventaire ou équipé) de +1 contre de l'or. Refus : 'absent', 'max' (+5 atteint), 'fonds' (or insuffisant ; `cout` renvoyé).
// Renvoie le nouvel objet dans `objet` : l'ancienne référence n'est plus dans l'état.
export function ameliorer(s, objet) {
  const dansInv = (s.inventaire ?? []).indexOf(objet);
  const slot = EQUIPMENT_SLOTS.find(e => s.equipe?.[e] === objet);
  if (dansInv < 0 && !slot) return { s, ok: false, motif: 'absent' };
  const niveau = objet.amelioration ?? 0;
  if (niveau >= EQUIPMENT_UPGRADE_MAX) return { s, ok: false, motif: 'max' };
  const cout = coutAmelioration(objet);
  if (s.gold < cout) return { s, ok: false, motif: 'fonds', cout };
  const neuf = { ...creerObjet(objet.emplacement, objet.rarete, objet.niveau, niveau + 1), ...(objet.id !== undefined && { id: objet.id }) };
  const suite = slot ? { equipe: { ...s.equipe, [slot]: neuf } } : { inventaire: s.inventaire.map((o, j) => (j === dansInv ? neuf : o)) };
  return { s: { ...s, ...suite, gold: s.gold - cout }, ok: true, objet: neuf, cout };
}
