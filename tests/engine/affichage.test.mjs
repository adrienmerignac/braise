import test from 'node:test';
import assert from 'node:assert/strict';
import { AFFICHAGE_DEFAUT, affichageValide, normaliserAffichage, mouvementReduit, effetsDiscrets, echelleTexte } from '../../dist/engine/affichage.js';
import { parseSave, serializeSave, importSave, writeSave, loadSave } from '../../dist/engine/save.js';
import { fresh } from '../../dist/engine/state.js';

const NOW = 1_700_000_000_000;
const partie = { ...fresh(NOW), gold: 4321, stage: 7, zone: 'ruines', meilleurEtage: 7, level: 5 };
const mem = () => { const data = {}; return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } }; };

test('défaut : système et effets actifs', () => {
  assert.deepEqual(AFFICHAGE_DEFAUT, { mouvement: 'systeme', effets: 'actifs', texte: 'normal' });
  assert.deepEqual(normaliserAffichage(undefined), AFFICHAGE_DEFAUT);
  assert.deepEqual(normaliserAffichage({ mouvement: 'x', effets: 'discrets' }), { mouvement: 'systeme', effets: 'discrets', texte: 'normal' });
});

test('mouvementReduit : système suit la préférence, réduit et complet l’emportent', () => {
  assert.equal(mouvementReduit('systeme', true), true);
  assert.equal(mouvementReduit('systeme', false), false);
  for (const pref of [true, false]) {
    assert.equal(mouvementReduit('reduit', pref), true);
    assert.equal(mouvementReduit('complet', pref), false);
  }
});

test('effetsDiscrets : seulement pour « discrets »', () => {
  assert.equal(effetsDiscrets('discrets'), true);
  assert.equal(effetsDiscrets('actifs'), false);
  assert.equal(effetsDiscrets('n’importe quoi'), false);
});

test('sauvegarde sans le champ : partie conservée, défaut, pas de réparation', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...partie }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.affichage, AFFICHAGE_DEFAUT);
  assert.equal(r.s.gold, 4321);
});

test('sauvegarde avec champ valide : repris', () => {
  const affichage = { mouvement: 'reduit', effets: 'discrets', texte: 'grand' };
  const r = parseSave(JSON.stringify({ version: 2, ...partie, affichage }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.affichage, affichage);
});

test('sauvegarde avec champ invalide : défaut, repaired, or et niveau conservés', () => {
  for (const affichage of [null, 'reduit', [], {}, { mouvement: 'reduit' }, { mouvement: 'lent', effets: 'actifs' }, { mouvement: 'reduit', effets: 3 }]) {
    const r = parseSave(JSON.stringify({ version: 2, ...partie, affichage }), NOW);
    assert.equal(r.status, 'repaired', JSON.stringify(affichage));
    assert.deepEqual(r.affichage, AFFICHAGE_DEFAUT);
    assert.equal(r.s.gold, 4321);
    assert.equal(r.s.level, 5);
  }
  assert.equal(affichageValide({ mouvement: 'complet', effets: 'actifs' }), true);
});

test('aller-retour export/import et stockage', () => {
  const affichage = { mouvement: 'complet', effets: 'discrets', texte: 'grand' };
  const texte = serializeSave(partie, undefined, 'done', [], undefined, affichage);
  assert.deepEqual(importSave(texte, NOW).affichage, affichage);
  const storage = mem();
  writeSave(storage, partie, undefined, 'done', [], undefined, affichage);
  assert.deepEqual(loadSave(storage, NOW).affichage, affichage);
});

test('texte : sauvegarde de la tâche précédente (sans texte) reprise sans réparation, texte normal', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...partie, affichage: { mouvement: 'reduit', effets: 'discrets' } }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.affichage, { mouvement: 'reduit', effets: 'discrets', texte: 'normal' });
});

test('texte : valeur invalide → normal, repaired, autres réglages et partie conservés', () => {
  for (const texte of ['enorme', 3, null, {}]) {
    const r = parseSave(JSON.stringify({ version: 2, ...partie, affichage: { mouvement: 'reduit', effets: 'discrets', texte } }), NOW);
    assert.equal(r.status, 'repaired', JSON.stringify(texte));
    assert.deepEqual(r.affichage, { mouvement: 'reduit', effets: 'discrets', texte: 'normal' });
    assert.equal(r.s.gold, 4321);
  }
});

test('texte : « grand » repris, normaliser et échelle du canvas', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...partie, affichage: { mouvement: 'complet', effets: 'actifs', texte: 'grand' } }), NOW);
  assert.equal(r.status, 'ok');
  assert.equal(r.affichage.texte, 'grand');
  assert.equal(normaliserAffichage({ texte: 'grand' }).texte, 'grand');
  assert.equal(normaliserAffichage({ texte: 'x' }).texte, 'normal');
  assert.equal(echelleTexte('grand'), 1.25);
  assert.equal(echelleTexte('normal'), 1);
  assert.equal(echelleTexte(undefined), 1);
});
