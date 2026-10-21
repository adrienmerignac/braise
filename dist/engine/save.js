// Lecture et écriture de la sauvegarde `braise-v2` (migrée depuis `braise-v1`) : validation champ par champ, sans DOM.
// Le stockage est injecté (localStorage dans le jeu, un faux dans les tests).
import { AUDIO_DEFAUT, reglagesValides } from './audio.js';
import { AFFICHAGE_DEFAUT, MOUVEMENTS, EFFETS, affichageValide, normaliserAffichage } from './affichage.js';
import { SAVE_KEY, BACKUP_KEY, LEGACY_SAVE_KEY, SAVE_VERSION, KILLS_PER_STAGE, fresh, maxHP } from './state.js';
import { enemyMaxHP } from './combat.js';

export const COOLDOWN_SECONDS = 15;

const MAX_AMOUNT = 1e15, MAX_LEVEL = 1000, MAX_STAGE = 100000, MAX_UPGRADE = 200;
// min/max inclusifs ; `last` est borné dynamiquement par « maintenant ».
const FIELDS = {
  gold: [0, MAX_AMOUNT], xp: [0, MAX_AMOUNT], level: [1, MAX_LEVEL], stage: [1, MAX_STAGE],
  kills: [0, KILLS_PER_STAGE], weapon: [0, MAX_UPGRADE], armor: [0, MAX_UPGRADE], luck: [0, MAX_UPGRADE],
};

const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const validInt = (v, min, max) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

// Convertit un enregistrement `braise-v1` (sans champ `version`) en v2 sans perte : mêmes champs, version ajoutée.
// Une version inconnue ou un non-objet est rendu tel quel ; `parseSave` le refusera.
export function migrate(raw) {
  if (!isRecord(raw) || raw.version !== undefined) return raw;
  return { ...raw, version: SAVE_VERSION };
}

// Texte écrit en stockage et dans les fichiers d'export. `fight` (facultatif) : { hp, boss, enemyHP, cool }.
// La pause n'est jamais persistée : on reprend toujours en jeu actif.
// `guide` : avancement du premier parcours ('todo' | 'done'), absent si non fourni.
// `vus` : explications ponctuelles déjà montrées (voir GUIDE_VUS), absent si non fourni.
// `audio` : { muet, volume }, absent si non fourni.
// `affichage` : { mouvement, effets, texte }, absent si non fourni.
export const serializeSave = (s, fight, guide, vus, audio, affichage) => JSON.stringify({ version: SAVE_VERSION, ...s, ...fight, ...(guide ? { guide } : {}), ...(vus ? { vus } : {}), ...(audio ? { audio } : {}), ...(affichage ? { affichage } : {}) });

export const GUIDE_STATES = ['todo', 'done'];
// Défaut quand le champ `guide` est absent (sauvegarde v1 ou v2 antérieure) : un joueur qui a progressé n'a plus besoin du guide.
export const defaultGuide = s => (s.level > 1 || s.stage > 1 || s.weapon > 0 || s.armor > 0 || s.luck > 0 || s.gold > 0 || s.xp > 0 || s.kills > 0 ? 'done' : 'todo');

// Explications ponctuelles du premier parcours : gardien (première apparition) et absence (après le premier achat).
export const GUIDE_VUS = ['gardien', 'absence'];
// Défaut quand `vus` est absent : un joueur qui a progressé est considéré comme les ayant vues ; une partie vierge, non.
export const defaultVus = s => (defaultGuide(s) === 'done' ? [...GUIDE_VUS] : []);
const validVus = v => Array.isArray(v) && v.every(k => GUIDE_VUS.includes(k)) && new Set(v).size === v.length;

// Champs de combat facultatifs, hors bornes ou absents → absents du résultat (le jeu applique alors ses défauts).
// Absent n'est pas une réparation ; présent mais invalide l'est. `cool` est diminué du temps réellement écoulé
// depuis `last` (jamais davantage, jamais d'horloge reculée) : recharger ne raccourcit pas la recharge.
function parseFight(data, s, now) {
  const fight = {};
  let repaired = false;
  const check = (key, ok, set) => {
    if (data[key] === undefined) return;
    if (ok(data[key])) set(data[key]); else repaired = true;
  };
  check('hp', v => validInt(v, 1, maxHP(s)), v => { fight.hp = v; });
  check('cool', v => validInt(v, 0, COOLDOWN_SECONDS), v => { fight.cool = Math.max(0, v - Math.floor(Math.max(0, now - s.last) / 1000)); });
  // L'adversaire est valide ou ignoré en bloc : ses PV maximaux dépendent de `boss`.
  const hasEnemy = data.boss !== undefined || data.enemyHP !== undefined;
  const boss = data.boss === undefined ? false : data.boss;
  if (hasEnemy) {
    if (typeof boss === 'boolean' && (!boss || s.kills >= KILLS_PER_STAGE) && validInt(data.enemyHP, 1, enemyMaxHP(s, boss))) {
      fight.boss = boss; fight.enemyHP = data.enemyHP;
    } else repaired = true;
  }
  return { fight, repaired };
}

// Vrai si le texte est un objet JSON dont `version` est un entier supérieur à celui que ce jeu sait lire.
export function isFutureSave(text) {
  if (typeof text !== 'string') return false;
  let data;
  try { data = JSON.parse(text); } catch { return false; }
  return isRecord(data) && Number.isInteger(data.version) && data.version > SAVE_VERSION;
}

// Retourne { s, status } : 'new' (rien de stocké), 'ok', 'repaired' (champs remplacés), 'reset' (illisible)
// ou 'future' (écrite par une version plus récente du jeu : ne jamais l'écraser).
export function parseSave(text, now) {
  const base = fresh(now);
  if (text === null || text === undefined) return { s: base, status: 'new', guide: 'todo', vus: [], audio: { ...AUDIO_DEFAUT }, affichage: { ...AFFICHAGE_DEFAUT } };
  let data;
  try { data = JSON.parse(text); } catch { return { s: base, status: 'reset' }; }
  data = migrate(data);
  if (isRecord(data) && Number.isInteger(data.version) && data.version > SAVE_VERSION) return { s: base, status: 'future' };
  if (!isRecord(data) || data.version !== SAVE_VERSION) return { s: base, status: 'reset' };
  const s = { ...base };
  let repaired = false;
  for (const [key, [min, max]] of Object.entries(FIELDS)) {
    if (validInt(data[key], min, max)) s[key] = data[key];
    else repaired = true;
  }
  if (validInt(data.last, 0, now)) s.last = data.last;
  else repaired = true;
  const f = parseFight(data, s, now);
  if (f.repaired) repaired = true;
  let guide = defaultGuide(s);
  if (data.guide !== undefined) {
    if (GUIDE_STATES.includes(data.guide)) guide = data.guide; else repaired = true;
  }
  let vus = defaultVus(s);
  if (data.vus !== undefined) {
    if (validVus(data.vus)) vus = GUIDE_VUS.filter(k => data.vus.includes(k)); else repaired = true;
  }
  // `audio` absent (toutes les parties existantes) : défaut sans réparation ; présent mais invalide : défaut, partie conservée.
  let audio = { ...AUDIO_DEFAUT };
  if (data.audio !== undefined) {
    if (reglagesValides(data.audio)) audio = { muet: data.audio.muet, volume: data.audio.volume }; else repaired = true;
  }
  // Même règle pour `affichage`.
  let affichage = { ...AFFICHAGE_DEFAUT };
  if (data.affichage !== undefined) {
    if (affichageValide(data.affichage)) affichage = normaliserAffichage(data.affichage);
    else {
      repaired = true;
      // `texte` seul invalide : les deux autres réglages valides sont conservés.
      const a = data.affichage;
      if (typeof a === 'object' && a !== null && !Array.isArray(a) && MOUVEMENTS.includes(a.mouvement) && EFFETS.includes(a.effets)) affichage = normaliserAffichage(a);
    }
  }
  const result = { s, status: repaired ? 'repaired' : 'ok', guide, vus, audio, affichage };
  if (Object.keys(f.fight).length) result.fight = f.fight;
  return result;
}

// Copie le texte illisible sous BACKUP_KEY, une seule fois : une copie existante n'est jamais remplacée.
// Ne lève jamais. `secours` : 'copiee' | 'existante' | 'echec' ; `brut` reste en mémoire pour le téléchargement.
export function backupUnreadable(storage, brut) {
  try {
    const existing = storage.getItem(BACKUP_KEY);
    if (existing !== null && existing !== undefined) return { brut, secours: 'existante' };
    storage.setItem(BACKUP_KEY, brut);
    return { brut, secours: 'copiee' };
  } catch { return { brut, secours: 'echec' }; }
}

// Ne lève jamais : un stockage indisponible donne une partie neuve et `status: 'unavailable'`.
// Sans `braise-v2` (ou si elle est illisible), reprend `braise-v1` et l'écrit en v2 ; l'ancienne clé n'est jamais modifiée.
export function loadSave(storage, now) {
  let text, legacy;
  try { text = storage.getItem(SAVE_KEY); legacy = storage.getItem(LEGACY_SAVE_KEY); } catch { return { s: fresh(now), status: 'unavailable' }; }
  const current = parseSave(text, now);
  if (current.status === 'future') return current;
  if (current.status !== 'new' && current.status !== 'reset') return current;
  // Avant toute écriture (y compris la reprise de v1 ci-dessous), le texte illisible est mis de côté.
  if (current.status === 'reset') Object.assign(current, backupUnreadable(storage, text));
  if (legacy === null || legacy === undefined) return current;
  const migrated = parseSave(legacy, now);
  if (migrated.status === 'reset') return { s: current.s, status: 'reset', brut: current.brut, secours: current.secours };
  if (current.status === 'reset') Object.assign(migrated, { brut: current.brut, secours: current.secours });
  writeSave(storage, migrated.s, undefined, migrated.guide, migrated.vus, migrated.audio, migrated.affichage);
  return migrated;
}

// Retourne true si l'écriture a réussi. Refuse (false) d'écraser une sauvegarde d'une version plus récente.
export function writeSave(storage, s, fight, guide, vus, audio, affichage) {
  try {
    if (isFutureSave(storage.getItem(SAVE_KEY))) return false; storage.setItem(SAVE_KEY, serializeSave(s, fight, guide, vus, audio, affichage)); return true; } catch { return false; }
}

// Import d'un fichier : n'accepte que ce que `parseSave` juge intact ; sinon rien ne doit changer.
export function importSave(text, now) {
  const { s, status, fight, guide, vus, audio, affichage } = parseSave(text, now);
  if (status === 'future') return { ok: false, motif: 'future' };
  if (status !== 'ok') return { ok: false };
  return fight ? { ok: true, s, fight, guide, vus, audio, affichage } : { ok: true, s, guide, vus, audio, affichage };
}
