// Lecture et écriture de la sauvegarde `braise-v1` : validation champ par champ, sans DOM.
// Le stockage est injecté (localStorage dans le jeu, un faux dans les tests).
import { SAVE_KEY, KILLS_PER_STAGE, fresh } from './state.js';

const MAX_AMOUNT = 1e15, MAX_LEVEL = 1000, MAX_STAGE = 100000, MAX_UPGRADE = 200;
// min/max inclusifs ; `last` est borné dynamiquement par « maintenant ».
const FIELDS = {
  gold: [0, MAX_AMOUNT], xp: [0, MAX_AMOUNT], level: [1, MAX_LEVEL], stage: [1, MAX_STAGE],
  kills: [0, KILLS_PER_STAGE], weapon: [0, MAX_UPGRADE], armor: [0, MAX_UPGRADE], luck: [0, MAX_UPGRADE],
};

const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const validInt = (v, min, max) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

// Retourne { s, status } : 'new' (rien de stocké), 'ok', 'repaired' (champs remplacés) ou 'reset' (illisible).
export function parseSave(text, now) {
  const base = fresh(now);
  if (text === null || text === undefined) return { s: base, status: 'new' };
  let data;
  try { data = JSON.parse(text); } catch { return { s: base, status: 'reset' }; }
  if (!isRecord(data)) return { s: base, status: 'reset' };
  const s = { ...base };
  let repaired = false;
  for (const [key, [min, max]] of Object.entries(FIELDS)) {
    if (validInt(data[key], min, max)) s[key] = data[key];
    else repaired = true;
  }
  if (validInt(data.last, 0, now)) s.last = data.last;
  else repaired = true;
  return { s, status: repaired ? 'repaired' : 'ok' };
}

// Ne lève jamais : un stockage indisponible donne une partie neuve et `status: 'unavailable'`.
export function loadSave(storage, now) {
  let text;
  try { text = storage.getItem(SAVE_KEY); } catch { return { s: fresh(now), status: 'unavailable' }; }
  return parseSave(text, now);
}

// Retourne true si l'écriture a réussi.
export function writeSave(storage, s) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
