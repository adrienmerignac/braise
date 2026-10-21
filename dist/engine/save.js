// Lecture et écriture de la sauvegarde `braise-v2` (migrée depuis `braise-v1`) : validation champ par champ, sans DOM.
// Le stockage est injecté (localStorage dans le jeu, un faux dans les tests).
import { SAVE_KEY, LEGACY_SAVE_KEY, SAVE_VERSION, KILLS_PER_STAGE, fresh, maxHP } from './state.js';
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
export const serializeSave = (s, fight) => JSON.stringify({ version: SAVE_VERSION, ...s, ...fight });

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

// Retourne { s, status } : 'new' (rien de stocké), 'ok', 'repaired' (champs remplacés) ou 'reset' (illisible).
export function parseSave(text, now) {
  const base = fresh(now);
  if (text === null || text === undefined) return { s: base, status: 'new' };
  let data;
  try { data = JSON.parse(text); } catch { return { s: base, status: 'reset' }; }
  data = migrate(data);
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
  const result = { s, status: repaired ? 'repaired' : 'ok' };
  if (Object.keys(f.fight).length) result.fight = f.fight;
  return result;
}

// Ne lève jamais : un stockage indisponible donne une partie neuve et `status: 'unavailable'`.
// Sans `braise-v2` (ou si elle est illisible), reprend `braise-v1` et l'écrit en v2 ; l'ancienne clé n'est jamais modifiée.
export function loadSave(storage, now) {
  let text, legacy;
  try { text = storage.getItem(SAVE_KEY); legacy = storage.getItem(LEGACY_SAVE_KEY); } catch { return { s: fresh(now), status: 'unavailable' }; }
  const current = parseSave(text, now);
  if (current.status !== 'new' && current.status !== 'reset') return current;
  if (legacy === null || legacy === undefined) return current;
  const migrated = parseSave(legacy, now);
  if (migrated.status === 'reset') return { s: current.s, status: 'reset' };
  writeSave(storage, migrated.s);
  return migrated;
}

// Retourne true si l'écriture a réussi.
export function writeSave(storage, s, fight) {
  try { storage.setItem(SAVE_KEY, serializeSave(s, fight)); return true; } catch { return false; }
}

// Import d'un fichier : n'accepte que ce que `parseSave` juge intact ; sinon rien ne doit changer.
export function importSave(text, now) {
  const { s, status, fight } = parseSave(text, now);
  if (status !== 'ok') return { ok: false };
  return fight ? { ok: true, s, fight } : { ok: true, s };
}
