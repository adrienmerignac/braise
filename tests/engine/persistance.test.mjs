import { bestiaireNeuf } from '../../dist/engine/bestiaire.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, writeSave, serializeSave, importSave, COOLDOWN_SECONDS } from '../../dist/engine/save.js';
import { restoreFight, newFight, enemyMaxHP } from '../../dist/engine/combat.js';
import { maxHP, SAVE_KEY, LEGACY_SAVE_KEY } from '../../dist/engine/state.js';
import { objectifsNeufs } from '../../dist/engine/objectifs.js';

const NOW = 1_700_000_000_000;
const s = { gold: 120, xp: 5, level: 3, stage: 4, zone: 'foret', meilleurEtage: 4, kills: 2, weapon: 1, armor: 2, luck: 0, last: NOW, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise'], bestiaire: bestiaireNeuf(), succes: [], automatismes: { gardien: false, achat: false } };
const sBoss = { ...s, kills: 5 };
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });
const roundtrip = (state, fight) => parseSave(serializeSave(state, fight), NOW);

test('aller-retour : vie, ennemi et recharge sont restitués', () => {
  const fight = { hp: 17, boss: false, enemyHP: 20, cool: 9 };
  assert.deepEqual(roundtrip(s, fight), { s, status: 'ok', guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' }, fight });
});

test('aller-retour : le gardien en cours est repris', () => {
  const fight = { hp: 40, boss: true, enemyHP: 99, cool: 0 };
  assert.deepEqual(roundtrip(sBoss, fight), { s: sBoss, status: 'ok', guide: 'done', vus: ['gardien', 'absence'], audio: { muet: false, volume: 0.6 }, affichage: { mouvement: 'systeme', effets: 'actifs', texte: 'normal' }, fight });
});

test('chaque champ est indépendant (aller-retour seul)', () => {
  assert.deepEqual(roundtrip(s, { hp: 5 }).fight, { hp: 5 });
  assert.deepEqual(roundtrip(s, { cool: 3 }).fight, { cool: 3 });
  assert.deepEqual(roundtrip(s, { boss: false, enemyHP: 7 }).fight, { boss: false, enemyHP: 7 });
});

test('ancienne sauvegarde sans ces champs : ok, sans fight, défauts appliqués', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...s }), NOW);
  assert.equal(r.status, 'ok');
  assert.equal('fight' in r, false);
  const f = restoreFight(r.s, r.fight);
  assert.equal(f.hp, maxHP(s));
  assert.equal(f.enemyHP, enemyMaxHP(s, false));
  assert.equal(f.boss, false);
});

test('migration braise-v1 : parties sans combat reprises avec vie pleine', () => {
  const store = mem({ [LEGACY_SAVE_KEY]: JSON.stringify(s) });
  const r = loadSave(store, NOW);
  assert.equal(r.status, 'ok');
  assert.equal(r.fight, undefined);
  assert.equal(parseSave(store.data[SAVE_KEY], NOW).status, 'ok');
});

test('valeurs hors bornes : champ ignoré et sauvegarde réparée', () => {
  const bad = [{ hp: 0 }, { hp: maxHP(s) + 1 }, { hp: 1.5 }, { hp: '10' }, { hp: null }, { cool: -1 }, { cool: COOLDOWN_SECONDS + 1 },
    { cool: NaN }, { enemyHP: 0, boss: false }, { enemyHP: enemyMaxHP(s, false) + 1, boss: false }, { enemyHP: 5, boss: 'oui' },
    { enemyHP: 5, boss: true }, { boss: false }, { enemyHP: 1e999 }];
  for (const extra of bad) {
    const r = parseSave(JSON.stringify({ version: 11, ...s, ...extra }), NOW);
    assert.equal(r.status, 'repaired', JSON.stringify(extra));
    assert.deepEqual(r.s, s);
    assert.equal(r.fight, undefined, JSON.stringify(extra));
  }
});

test('un champ invalide n’invalide pas les autres', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...s, hp: 9999, cool: 4 }), NOW);
  assert.deepEqual(r.fight, { cool: 4 });
});

test('la recharge baisse du temps réellement écoulé, jamais plus', () => {
  const at = last => parseSave(serializeSave({ ...s, last }, { cool: 10 }), NOW).fight.cool;
  assert.equal(at(NOW), 10);
  assert.equal(at(NOW - 4900), 6);
  assert.equal(at(NOW - 3_600_000), 0);
  assert.equal(at(NOW), 10);
  assert.equal(parseSave(serializeSave({ ...s, last: NOW }, { cool: 10 }), NOW - 5000).fight.cool, 10);
});

test('recharger ne soigne pas : la vie blessée est reprise par restoreFight', () => {
  const store = mem();
  writeSave(store, s, { hp: 12, boss: false, enemyHP: 30, cool: 8 });
  const l = loadSave(store, NOW);
  const f = restoreFight(l.s, l.fight);
  assert.deepEqual(f, { hp: 12, boss: false, enemyHP: 30, enemyMax: enemyMaxHP(s, false) });
  assert.notEqual(f.hp, newFight(l.s).f.hp);
});

test('import : le combat du fichier est repris', () => {
  const r = importSave(serializeSave(sBoss, { hp: 20, boss: true, enemyHP: 50, cool: 2 }), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.fight, { hp: 20, boss: true, enemyHP: 50, cool: 2 });
  assert.equal(importSave(serializeSave(s, { hp: 0 }), NOW).ok, false);
});

test('la pause n’est jamais écrite', () => {
  assert.equal('paused' in JSON.parse(serializeSave(s, { hp: 5, paused: undefined })), false);
  assert.equal(roundtrip(s, { hp: 5 }).status, 'ok');
});

test('sauvegarde d’une version plus récente : statut dédié, jamais écrasée, import refusé avec motif', () => {
  const futur = JSON.stringify({ version: 12, gold: 9, inconnu: { a: 1 } });
  const store = mem({ [SAVE_KEY]: futur, [LEGACY_SAVE_KEY]: JSON.stringify(s) });
  assert.equal(parseSave(futur, NOW).status, 'future');
  assert.equal(loadSave(store, NOW).status, 'future');
  assert.equal(store.data[LEGACY_SAVE_KEY], JSON.stringify(s));
  assert.equal(writeSave(store, s, { hp: 5 }), false);
  assert.equal(store.data[SAVE_KEY], futur);
  assert.deepEqual(importSave(futur, NOW), { ok: false, motif: 'future' });
  assert.deepEqual(importSave('{"version":"x"}', NOW), { ok: false });
});

test('versions v1 et v2 se chargent toujours, et l’écriture reste possible', () => {
  const v2 = mem({ [SAVE_KEY]: JSON.stringify({ version: 2, ...s }) });
  assert.equal(loadSave(v2, NOW).status, 'ok');
  assert.equal(writeSave(v2, s), true);
  assert.equal(loadSave(mem({ [LEGACY_SAVE_KEY]: JSON.stringify(s) }), NOW).status, 'ok');
  assert.equal(parseSave(JSON.stringify({ version: 0, ...s }), NOW).status, 'reset');
});
