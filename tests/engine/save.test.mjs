import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, writeSave, migrate, serializeSave, importSave } from '../../dist/engine/save.js';
import { objectifsNeufs } from '../../dist/engine/objectifs.js';
import { restoreFight } from '../../dist/engine/combat.js';
import { bestiaireNeuf, bestiaireMigre } from '../../dist/engine/bestiaire.js';
import { fresh, SAVE_KEY, BACKUP_KEY, LEGACY_SAVE_KEY } from '../../dist/engine/state.js';

const NOW = 1_700_000_000_000;
const valid = { gold: 120, xp: 5, level: 3, stage: 4, zone: 'foret', meilleurEtage: 4, kills: 2, weapon: 1, armor: 2, luck: 0, last: NOW - 1000, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise'], bestiaire: bestiaireMigre(4) };
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });

test('une sauvegarde valide est conservée telle quelle', () => {
  assert.deepEqual(parseSave(JSON.stringify(valid), NOW), { s: valid, status: 'ok', guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' } });
});

test('JSON illisible, null, tableau, scalaire : partie neuve', () => {
  for (const text of ['{oups', 'null', '[1,2]', '42', '"x"']) {
    assert.deepEqual(parseSave(text, NOW), { s: fresh(NOW), status: 'reset' }, text);
  }
});

test('aucune sauvegarde : partie neuve sans alerte', () => {
  assert.deepEqual(parseSave(null, NOW), { s: fresh(NOW), status: 'new', guide: 'todo', vus: [], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' } });
});

test('chaînes, NaN, Infinity, flottants : repli champ par champ', () => {
  const text = '{"gold":"999","level":null,"stage":1e999,"kills":1.5,"weapon":2,"armor":true,"luck":[3]}';
  const { s, status } = parseSave(text, NOW);
  assert.equal(status, 'repaired');
  assert.deepEqual(s, { ...fresh(NOW), weapon: 2 });
});

test('valeurs négatives ou hors bornes refusées, le reste conservé', () => {
  const { s } = parseSave(JSON.stringify({ ...valid, gold: -5, level: 0, stage: -1, kills: 6, armor: -2, luck: 1e9, last: NOW + 5000 }), NOW);
  assert.deepEqual(s, { ...fresh(NOW), xp: 5, weapon: 1, meilleurEtage: 4, recitsLus: ['braise'], bestiaire: bestiaireMigre(4) });
  for (const [k, v] of Object.entries(s)) if (!['inventaire', 'equipe', 'talents', 'zone', 'objectifs', 'recitsLus', 'bestiaire'].includes(k)) assert.ok(Number.isFinite(v) && v >= 0);
});

test('champs inconnus ignorés', () => {
  const { s } = parseSave(JSON.stringify({ ...valid, __proto__: { x: 1 }, hack: 1, extra: 'a' }), NOW);
  assert.deepEqual(s, valid);
});

test('loadSave lit via le stockage injecté', () => {
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: JSON.stringify(valid) }), NOW).s, valid);
  assert.equal(loadSave(mem(), NOW).status, 'new');
});

test('getItem qui lève : partie neuve et statut unavailable', () => {
  const storage = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(loadSave(storage, NOW), { s: fresh(NOW), status: 'unavailable' });
});

test('writeSave : succès, puis quota dépassé sans exception', () => {
  const storage = mem();
  assert.equal(writeSave(storage, valid), true);
  assert.deepEqual(JSON.parse(storage.data[SAVE_KEY]), { version: 8, ...valid });
  const full = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(writeSave(full, valid), false);
});

const v1 = { gold: 5000, xp: 40, level: 12, stage: 30, kills: 3, weapon: 9, armor: 7, luck: 4, last: NOW - 60_000 };
const v1D = { gold: 5000, xp: 40, level: 12, stage: 30, zone: 'cryptes', meilleurEtage: 30, kills: 3, weapon: 9, armor: 7, luck: 4, last: NOW - 60_000, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise', 'ruines', 'cryptes', 'cendres'] };

const gardiensFaits = () => Object.fromEntries(Object.entries(objectifsNeufs()).map(([z, o]) => [z, { ...o, faits: ['gardien'] }]));
const v1M = { ...v1D, gold: v1D.gold + 2200, objectifs: gardiensFaits(), bestiaire: bestiaireMigre(30) };

test('migrate : braise-v1 complet converti sans perte, entrée non modifiée', () => {
  const copie = { ...v1 };
  assert.deepEqual(migrate(v1), { ...v1D, version: 8, gold: v1D.gold + 2200, objectifs: gardiensFaits(), bestiaire: migrate(v1).bestiaire });
  assert.deepEqual(v1, copie);
  assert.deepEqual(migrate({ version: 2, gold: 1 }), { version: 8, gold: 1, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: [], bestiaire: bestiaireNeuf() });
  assert.deepEqual(migrate({ version: 3, gold: 1 }), { version: 8, gold: 1, talents: {}, objectifs: objectifsNeufs(), recitsLus: [], bestiaire: bestiaireNeuf() });
  assert.deepEqual(migrate({ version: 8, gold: 1 }), { version: 8, gold: 1 });
  assert.equal(migrate(null), null);
});

test('loadSave : v1 complet repris, écrit en v2, ancienne clé conservée', () => {
  const storage = mem({ [LEGACY_SAVE_KEY]: JSON.stringify(v1) });
  const r = loadSave(storage, NOW);
  assert.deepEqual(r, { s: v1M, status: 'ok', guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' } });
  assert.deepEqual(JSON.parse(storage.data[SAVE_KEY]), { version: 8, ...v1M, guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' } });
  assert.equal(storage.data[LEGACY_SAVE_KEY], JSON.stringify(v1));
});

test('loadSave : v1 partiel migré, champs manquants par défaut, valeurs présentes gardées', () => {
  const storage = mem({ [LEGACY_SAVE_KEY]: JSON.stringify({ gold: 77, stage: 8 }) });
  const r = loadSave(storage, NOW);
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s, { ...fresh(NOW), gold: 77 + 200, stage: 8, zone: 'ruines', meilleurEtage: 8, objectifs: { ...fresh(NOW).objectifs, foret: { chasse: 0, faits: ['gardien'] } }, recitsLus: ['braise', 'ruines'], bestiaire: bestiaireMigre(8) });
  assert.equal(JSON.parse(storage.data[SAVE_KEY]).gold, 77 + 200);
});

test('loadSave : braise-v2 prioritaire sur braise-v1 ; v2 illisible retombe sur v1', () => {
  const v2 = { ...v1M, gold: 1 };
  assert.equal(loadSave(mem({ [SAVE_KEY]: serializeSave(v2), [LEGACY_SAVE_KEY]: JSON.stringify(v1) }), NOW).s.gold, 1);
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: '{oups', [LEGACY_SAVE_KEY]: JSON.stringify(v1) }), NOW).s, v1M);
  assert.equal(loadSave(mem({ [LEGACY_SAVE_KEY]: '{oups' }), NOW).status, 'reset');
});

test('version inconnue : refusée (plus récente → future, non entière → reset)', () => {
  assert.equal(parseSave(JSON.stringify({ ...v1, version: 9 }), NOW).status, 'future');
  assert.equal(parseSave(JSON.stringify({ ...v1, version: '2' }), NOW).status, 'reset');
});

test('aller-retour export/import identique', () => {
  const r = importSave(serializeSave(v1M), NOW);
  assert.deepEqual(r, { ok: true, s: v1M, guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' } });
  assert.equal(serializeSave(r.s), serializeSave(v1M));
});

test('import : un export v1 brut est accepté, un fichier corrompu ou altéré est refusé', () => {
  assert.equal(importSave(JSON.stringify(v1), NOW).ok, true);
  for (const text of ['{oups', '', 'null', '[]', serializeSave({ ...v1D, gold: -1 }), serializeSave({ ...v1D, level: 'x' }), JSON.stringify({ version: 2 })]) {
    assert.deepEqual(importSave(text, NOW), { ok: false }, text);
  }
});

const neuve = { gold: 0, xp: 0, level: 1, stage: 1, zone: 'foret', meilleurEtage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: NOW };

test('guide absent : à faire pour une partie vierge, terminé dès qu’il y a de la progression', () => {
  const guide = s => parseSave(JSON.stringify({ version: 2, ...s }), NOW).guide;
  assert.equal(guide(neuve), 'todo');
  for (const p of [{ level: 2 }, { stage: 2 }, { weapon: 1 }, { armor: 1 }, { luck: 1 }, { gold: 5 }, { xp: 1 }, { kills: 1 }]) {
    assert.equal(guide({ ...neuve, ...p }), 'done', JSON.stringify(p));
  }
});

test('guide présent : conservé ; invalide → repaired avec le défaut selon la progression', () => {
  assert.equal(parseSave(JSON.stringify({ version: 2, ...neuve, guide: 'todo' }), NOW).guide, 'todo');
  assert.equal(parseSave(JSON.stringify({ version: 8, ...v1M, guide: 'done', vus: ['gardien', 'absence'] }), NOW).status, 'ok');
  for (const guide of ['fini', 1, null, true, {}]) {
    const r = parseSave(JSON.stringify({ version: 2, ...neuve, guide }), NOW);
    assert.equal(r.status, 'repaired', String(guide));
    assert.equal(r.guide, 'todo');
  }
  assert.equal(parseSave(JSON.stringify({ version: 2, ...v1, guide: 'x' }), NOW).guide, 'done');
});

test('guide : aller-retour serializeSave / importSave et écriture en stockage', () => {
  assert.equal(importSave(serializeSave(neuve, undefined, 'todo'), NOW).guide, 'todo');
  assert.equal(importSave(serializeSave(neuve, undefined, 'done'), NOW).guide, 'done');
  const storage = mem();
  writeSave(storage, neuve, undefined, 'todo');
  assert.equal(loadSave(storage, NOW).guide, 'todo');
});

test('braise-v1 : partie vierge → guide à faire, partie avancée → terminé et écrit en v2', () => {
  assert.equal(loadSave(mem({ [LEGACY_SAVE_KEY]: JSON.stringify(neuve) }), NOW).guide, 'todo');
  const storage = mem({ [LEGACY_SAVE_KEY]: JSON.stringify(v1) });
  assert.equal(loadSave(storage, NOW).guide, 'done');
  assert.equal(JSON.parse(storage.data[SAVE_KEY]).guide, 'done');
});

test('vus : absent → vues pour une partie avancée, non vues pour une partie vierge', () => {
  const vus = s => parseSave(JSON.stringify({ version: 2, ...s }), NOW).vus;
  assert.deepEqual(vus(neuve), []);
  assert.deepEqual(vus({ ...neuve, stage: 3 }), ['gardien', 'absence']);
  assert.deepEqual(vus({ ...neuve, gold: 5, guide: 'done' }), ['gardien', 'absence']);
});

test('vus : conservées à l’export/import, invalides → repaired avec le défaut', () => {
  assert.deepEqual(importSave(serializeSave(neuve, undefined, 'todo', ['gardien']), NOW).vus, ['gardien']);
  assert.deepEqual(importSave(serializeSave(neuve, undefined, 'done', []), NOW).vus, []);
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: serializeSave(neuve, undefined, 'done', ['absence']) }), NOW).vus, ['absence']);
  for (const vus of ['gardien', ['inconnu'], ['gardien', 'gardien'], [1], null, {}]) {
    const r = parseSave(JSON.stringify({ version: 2, ...neuve, vus }), NOW);
    assert.equal(r.status, 'repaired', JSON.stringify(vus));
    assert.deepEqual(r.vus, []);
  }
});

const DEFAUT_AUDIO = { muet: false, volume: 0.6 };

test('audio : aller-retour serializeSave / parseSave, import et stockage', () => {
  const audio = { muet: true, volume: 0.25 };
  assert.deepEqual(parseSave(serializeSave(valid, undefined, 'done', [], audio), NOW).audio, audio);
  assert.deepEqual(importSave(serializeSave(valid, undefined, 'done', [], audio), NOW).audio, audio);
  const storage = mem();
  writeSave(storage, valid, undefined, 'done', [], audio);
  assert.deepEqual(loadSave(storage, NOW).audio, audio);
});

test('reprise : une sauvegarde v2 sans audio garde sa partie et reçoit les réglages par défaut', () => {
  const avance = { ...valid, gold: 4321, stage: 7, zone: 'ruines', meilleurEtage: 7, level: 5 };
  const r = parseSave(JSON.stringify({ version: 2, ...avance }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.audio, DEFAUT_AUDIO);
  assert.equal(r.s.gold, 4321 + 200, 'gardien de la forêt déjà vaincu : 200 or versés à la reprise');
  assert.equal(r.s.stage, 7);
  assert.equal(r.s.level, 5);
});

test('audio corrompu : défaut, partie conservée, jamais reset', () => {
  for (const audio of ['fort', null, 3, [], {}, { muet: 'oui', volume: 0.5 }, { muet: false, volume: 2 }, { muet: false, volume: -0.1 }, { muet: false, volume: '0.5' }, { muet: false }]) {
    const r = parseSave(JSON.stringify({ version: 2, ...valid, audio }), NOW);
    assert.equal(r.status, 'repaired', JSON.stringify(audio));
    assert.deepEqual(r.audio, DEFAUT_AUDIO);
    assert.equal(r.s.gold, valid.gold);
    assert.equal(importSave(JSON.stringify({ version: 2, ...valid, audio }), NOW).ok, false);
  }
});

// --- Copie de secours d'une partie illisible ---
const faux = (init = {}, { echecSecours = false } = {}) => {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (echecSecours && k === BACKUP_KEY) throw new Error('quota'); m.set(k, v); },
  };
};

test('texte illisible : copié tel quel, puis partie neuve écrite sans perte du texte', () => {
  const st = faux({ [SAVE_KEY]: '{pas du json' });
  const l = loadSave(st, NOW);
  assert.equal(l.status, 'reset');
  assert.equal(l.secours, 'copiee');
  assert.equal(writeSave(st, l.s, undefined, l.guide, l.vus, l.audio, l.affichage), true);
  assert.equal(st.m.get(BACKUP_KEY), '{pas du json');
  assert.equal(JSON.parse(st.m.get(SAVE_KEY)).version, 8);
  assert.equal(parseSave(st.m.get(SAVE_KEY), NOW).status, 'ok');
});

test('seconde partie illisible : la première copie est conservée', () => {
  const st = faux({ [SAVE_KEY]: '{pas du json' });
  loadSave(st, NOW);
  st.m.set(SAVE_KEY, '[autre texte');
  const l = loadSave(st, NOW);
  assert.equal(l.secours, 'existante');
  assert.equal(l.brut, '[autre texte', 'le texte de cette session reste disponible au téléchargement');
  assert.equal(st.m.get(BACKUP_KEY), '{pas du json');
});

test('setItem qui lève sur la clé de secours : aucune exception, statut signalé, partie jouable', () => {
  const st = faux({ [SAVE_KEY]: '{pas du json' }, { echecSecours: true });
  const l = loadSave(st, NOW);
  assert.equal(l.secours, 'echec');
  assert.equal(l.brut, '{pas du json');
  assert.equal(writeSave(st, l.s), true);
  assert.equal(st.m.has(BACKUP_KEY), false);
});

test('v1 reprise alors que v2 est illisible : le texte v2 est gardé, v1 inchangée', () => {
  const v1 = JSON.stringify({ ...fresh(NOW), gold: 7 });
  const st = faux({ [SAVE_KEY]: 'xx', [LEGACY_SAVE_KEY]: v1 });
  const l = loadSave(st, NOW);
  assert.equal(l.s.gold, 7);
  assert.equal(st.m.get(BACKUP_KEY), 'xx');
  assert.equal(st.m.get(LEGACY_SAVE_KEY), v1);
});

test('sauvegardes valides ou absentes : aucune clé de secours', () => {
  const valide = serializeSave(fresh(NOW));
  for (const init of [{}, { [SAVE_KEY]: valide }, { [LEGACY_SAVE_KEY]: JSON.stringify(fresh(NOW)) }, { [SAVE_KEY]: JSON.stringify({ version: 3 }) }]) {
    const st = faux(init);
    const l = loadSave(st, NOW);
    assert.equal(l.secours, undefined);
    assert.equal(st.m.has(BACKUP_KEY), false);
  }
});

test('reprise : une sauvegarde v7 en plein combat avec les anciens PV d’ennemi (base 32, 14 par étage) se recharge sans réparation', () => {
  const base = { version: 7, ...valid, stage: 4, meilleurEtage: 5, kills: 1, last: NOW };
  // Ancien maximum à l’étage 4 : 32 + 14 × 4 = 88 (Pillard : 112 aujourd’hui).
  const normal = parseSave(JSON.stringify({ ...base, boss: false, enemyHP: 88 }), NOW);
  assert.equal(normal.status, 'ok', 'ennemi ordinaire aux anciens PV : accepté');
  assert.equal(restoreFight(normal.s, normal.fight).enemyHP, 88);
  // Gardien de l'étage 5 : ancien maximum (32 + 14 × 5) × 5 = 510, aujourd'hui 1060.
  const gardien = parseSave(JSON.stringify({ ...base, stage: 5, kills: 5, boss: true, enemyHP: 510 }), NOW);
  assert.equal(gardien.status, 'ok', 'gardien aux anciens PV : accepté, ni rejeté ni réinitialisé');
  const f = restoreFight(gardien.s, gardien.fight);
  assert.equal(f.boss, true);
  assert.equal(f.enemyHP, 510);
  assert.equal(f.enemyMax, 990);
  assert.equal(gardien.s.stage, 5);
  // PV d'ennemi ordinaire au-dessus du maximum du type mais sous le maximum de base (160) : accepté, borné à 112.
  const borne = parseSave(JSON.stringify({ ...base, boss: false, enemyHP: 150 }), NOW);
  assert.equal(borne.status, 'ok');
  assert.equal(restoreFight(borne.s, borne.fight).enemyHP, 112);
  // Gardien au-dessus du nouveau maximum (990) : réparé, partie conservée.
  const trop = parseSave(JSON.stringify({ ...base, stage: 5, kills: 5, boss: true, enemyHP: 991 }), NOW);
  assert.equal(trop.status, 'repaired');
  assert.equal(trop.s.stage, 5);
});
