// Automatisations (M5.4a) : fonctions pures, sans DOM ni horloge. `s.automatismes` = interrupteurs du joueur, tous éteints au départ.
// Première action automatisée : lancer le gardien. La frappe de braise reste manuelle ; l'absence n'affronte aucun gardien.
import { AUTO_GARDIEN_DEBLOCAGE, AUTO_ACHAT_DEBLOCAGE, KILLS_PER_STAGE } from './balance.js';
import { assessGuardian } from './combat.js';
import { automatismesNeufs, cost, upgradeAtMax } from './state.js';

export const AUTOMATISMES_IDS = ['gardien', 'achat'];
export const MESSAGE_GARDIEN_AUTO = 'Gardien lancé automatiquement';
export const NOMS_ACHAT = { weapon: 'Arme', armor: 'Armure', luck: 'Charme' };
export const messageAchatAuto = (kind, niveau) => `Achat automatique : ${NOMS_ACHAT[kind]} niveau ${niveau}`;
export const MESSAGE_GARDIEN_DEBLOQUE = 'Gardien automatique disponible';
export const MESSAGE_ACHAT_DEBLOQUE = 'Achat automatique disponible';

// Débloqué quand le gardien de l'étage `AUTO_GARDIEN_DEBLOCAGE` a été vaincu.
const DEBLOCAGES = { gardien: s => s.meilleurEtage > AUTO_GARDIEN_DEBLOCAGE, achat: s => s.meilleurEtage > AUTO_ACHAT_DEBLOCAGE };
export const estDebloque = (s, id) => !!DEBLOCAGES[id]?.(s);
export const estActif = (s, id) => estDebloque(s, id) && s.automatismes?.[id] === true;

// Inverse un interrupteur ; refusé (état rendu tel quel) s'il est inconnu ou non débloqué.
export function basculerAutomatisme(s, id) {
  if (!estDebloque(s, id)) return s;
  return { ...s, automatismes: { ...automatismesNeufs(), ...s.automatismes, [id]: !estActif(s, id) } };
}

// Décision pure, prise dans le pas de simulation : lancer le gardien maintenant ? Jamais en pause ni avant la fin du guide,
// jamais au milieu d'un échange (ennemi ordinaire déjà entamé), jamais si le gardien est jugé « Mortel » (le bouton reste au joueur).
export function doitLancerGardien(s, f, { pause = false, guideFini = true } = {}) {
  if (pause || !guideFini || !estActif(s, 'gardien')) return false;
  if (f.boss || s.kills < KILLS_PER_STAGE || f.enemyHP < f.enemyMax) return false;
  return assessGuardian(s).danger !== 'Mortel';
}

// Achat automatique : l'amélioration la moins chère (arme, armure, charme à prix égal) que l'or paie et qui n'est pas au maximum ; sinon null.
// Jamais en pause ni avant la fin du guide ; un seul achat par pas, c'est l'appelant qui le garantit.
export function choisirAchatAuto(s, { pause = false, guideFini = true } = {}) {
  if (pause || !guideFini || !estActif(s, 'achat')) return null;
  let choix = null;
  for (const k of ['weapon', 'armor', 'luck']) {
    if (upgradeAtMax(s, k) || s.gold < cost(s, k)) continue;
    if (choix === null || cost(s, k) < cost(s, choix)) choix = k;
  }
  return choix;
}

// Lecture d'une sauvegarde : clés inconnues ignorées, non-booléen → false, interrupteur d'une partie non débloquée → false.
export function lireAutomatismes(brut, s) {
  const neuf = automatismesNeufs();
  if (brut === undefined) return { automatismes: neuf, repaired: false };
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return { automatismes: neuf, repaired: true };
  let repaired = false;
  for (const id of AUTOMATISMES_IDS) {
    if (typeof brut[id] === 'boolean') neuf[id] = brut[id] && estDebloque(s, id);
    else if (brut[id] !== undefined) repaired = true;
    if (brut[id] === true && !neuf[id]) repaired = true;
  }
  return { automatismes: neuf, repaired };
}

// Ligne écrite sous la case : condition avant déblocage, raison de l'attente quand le gardien prêt est jugé « Mortel » ; sinon rien.
export function texteGardienAuto(s) {
  if (!estDebloque(s, 'gardien')) return `Gardien automatique : vaincre le gardien de l’étage ${AUTO_GARDIEN_DEBLOCAGE}`;
  if (estActif(s, 'gardien') && s.kills >= KILLS_PER_STAGE && assessGuardian(s).danger === 'Mortel') return 'Gardien automatique en attente : danger Mortel';
  return '';
}

// Ligne écrite sous la case « Achat automatique » : la condition avant déblocage ; ensuite rien (la limite est écrite à côté de la case).
export function texteAchatAuto(s) {
  return estDebloque(s, 'achat') ? '' : `Achat automatique : vaincre le gardien de l’étage ${AUTO_ACHAT_DEBLOCAGE}`;
}
