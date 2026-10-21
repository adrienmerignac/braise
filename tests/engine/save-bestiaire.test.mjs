import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, SAVE_KEY, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, loadSave } from '../../dist/engine/save.js';
import { bestiaireNeuf } from '../../dist/engine/bestiaire.js';

const NOW = 1_000_000;
const v7 = (extra = {}) => { const { bestiaire, ...r } = fresh(0); return { ...r, version: 7, last: 500, ...extra }; };
const lire = data => parseSave(JSON.stringify(data), NOW);
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });

test('schéma : la version courante est la 11', () => assert.equal(SAVE_VERSION, 11));

test('migration v7 à l’étage 12 : types des trois zones vus, gardiens forêt et ruines vus, celui des cendres non', () => {
  const r = lire(v7({ stage: 12, zone: 'cryptes', meilleurEtage: 12 }));
  const b = r.s.bestiaire;
  for (const t of ['eclaireur', 'pillard', 'traqueur', 'squelette-ruines', 'chauve-souris', 'gelee', 'squelette-cendre', 'spectre', 'goule']) assert.deepEqual(b[t], { vus: true, victoires: 0 }, t);
  assert.equal(b['gardien:foret'].vus, true);
  assert.equal(b['gardien:ruines'].vus, true);
  assert.equal(b['gardien:cryptes'].vus, false);
  assert.ok(Object.values(b).every(e => e.victoires === 0));
});

test('migration v7 : une partie à l’étage 3 ne voit que la forêt, sans gardien', () => {
  const b = lire(v7({ stage: 3, meilleurEtage: 3 })).s.bestiaire;
  assert.equal(b.pillard.vus, true);
  assert.equal(b['squelette-ruines'].vus, false);
  assert.equal(b['gardien:foret'].vus, false);
});

test('gardien d’une zone vu seulement une fois battu (meilleurEtage au-delà de la fin)', () => {
  assert.equal(lire(v7({ stage: 5, meilleurEtage: 5 })).s.bestiaire['gardien:foret'].vus, false);
  assert.equal(lire(v7({ stage: 6, zone: 'ruines', meilleurEtage: 6 })).s.bestiaire['gardien:foret'].vus, true);
});

test('partie v8 neuve : collection vierge, statut ok', () => {
  const r = lire({ ...fresh(0), version: 8, last: 500 });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.bestiaire, bestiaireNeuf());
});

test('export/import aller-retour identique', () => {
  const s = fresh(0);
  s.bestiaire = { ...s.bestiaire, pillard: { vus: true, victoires: 7 }, 'gardien:foret': { vus: true, victoires: 2 } };
  const r = importSave(serializeSave(s), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.bestiaire, s.bestiaire);
  assert.equal(serializeSave(r.s), serializeSave(s));
});

test('clés inconnues ignorées, nombres non finis ou négatifs ramenés à 0', () => {
  const brut = { ...bestiaireNeuf(), lune: { vus: true, victoires: 3 }, pillard: { vus: true, victoires: -4 }, goule: { vus: true, victoires: 'x' }, gelee: { vus: true, victoires: 2.7 }, spectre: { vus: false, victoires: 1e999 } };
  const r = lire({ ...fresh(0), version: 8, last: 500, bestiaire: brut });
  const b = r.s.bestiaire;
  assert.equal(r.status, 'repaired');
  assert.equal('lune' in b, false);
  assert.deepEqual([b.pillard.victoires, b.goule.victoires, b.gelee.victoires], [0, 0, 2]);
  assert.equal(b.spectre.victoires, 0);
  assert.equal(b.pillard.vus, true);
});

test('champ corrompu : collection par défaut, reste de la partie conservé', () => {
  for (const v of ['x', 3, null, [], { pillard: 5 }]) {
    const r = lire({ ...fresh(0), version: 8, last: 500, gold: 321, level: 4, bestiaire: v });
    assert.equal(r.status, 'repaired');
    assert.equal(r.s.gold, 321);
    assert.equal(r.s.level, 4);
    assert.ok(Object.keys(r.s.bestiaire).length === 12);
  }
});

test('reprise d’une partie braise-v1 jusqu’en v11', () => {
  const v1 = { gold: 900, xp: 10, level: 9, stage: 8, kills: 1, weapon: 3, armor: 2, luck: 1, last: 500 };
  const storage = mem({ 'braise-v1': JSON.stringify(v1) });
  const r = loadSave(storage, NOW);
  assert.equal(r.s.meilleurEtage, 8);
  assert.equal(r.s.bestiaire.pillard.vus, true);
  assert.equal(r.s.bestiaire['squelette-ruines'].vus, true);
  assert.equal(r.s.bestiaire['gardien:foret'].vus, true);
  assert.equal(r.s.bestiaire.goule.vus, false);
  assert.equal(JSON.parse(storage.data[SAVE_KEY]).version, 11);
});

test('v12 future : refusée, jamais écrasée', () => {
  const r = lire({ ...fresh(0), version: 12 });
  assert.equal(r.status, 'future');
});
