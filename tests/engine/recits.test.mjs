import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { RECITS, etatRecits, marquerRecitLu } from '../../dist/engine/recits.js';
import { strike } from '../../dist/engine/combat.js';
import { offlineGains } from '../../dist/engine/offline.js';

const debloques = e => etatRecits({ ...fresh(0), meilleurEtage: e }).filter(r => r.debloque).map(r => r.id);

test('déblocage aux seuils 6/11/16, rien avant', () => {
  assert.deepEqual(debloques(1), ['braise']);
  assert.deepEqual(debloques(5), ['braise']);
  assert.deepEqual(debloques(6), ['braise', 'ruines']);
  assert.deepEqual(debloques(10), ['braise', 'ruines']);
  assert.deepEqual(debloques(11), ['braise', 'ruines', 'cryptes']);
  assert.deepEqual(debloques(15), ['braise', 'ruines', 'cryptes']);
  assert.deepEqual(debloques(16), ['braise', 'ruines', 'cryptes', 'cendres']);
});

test('chaque récit a 2 à 3 phrases', () => {
  for (const r of RECITS) assert.ok((r.texte.match(/[.!?](\s|$)/g) ?? []).length >= 2 && (r.texte.match(/[.!?](\s|$)/g) ?? []).length <= 3, r.id);
});

test('marquerRecitLu : pur, idempotent, ignore l’inconnu', () => {
  const s = fresh(0), t = marquerRecitLu(s, 'braise');
  assert.deepEqual(s.recitsLus, []);
  assert.deepEqual(t.recitsLus, ['braise']);
  assert.equal(marquerRecitLu(t, 'braise'), t);
  assert.equal(marquerRecitLu(t, 'inconnu'), t);
  assert.deepEqual(etatRecits(t)[0], { id: 'braise', titre: RECITS[0].titre, texte: RECITS[0].texte, debloque: true, lu: true });
});

const victoireGardien = s => strike(s, { hp: 1000, boss: true, enemyHP: 1, enemyMax: 500 });

test('événement recit émis une seule fois à la victoire du gardien de l’étage 5', () => {
  let s = { ...fresh(0), stage: 5, meilleurEtage: 5, kills: 5, recitsLus: ['braise'] };
  let r = victoireGardien(s);
  const recits = r.events.filter(e => e.type === 'recit');
  assert.deepEqual(recits, [{ type: 'recit', id: 'ruines' }]);
  s = marquerRecitLu(r.s, 'ruines');
  r = victoireGardien({ ...s, stage: 5, meilleurEtage: 6 });
  assert.equal(r.events.filter(e => e.type === 'recit').length, 0);
});

test('l’absence ne débloque ni n’émet aucun récit', () => {
  const s = { ...fresh(0), level: 40, weapon: 40, recitsLus: [] };
  const g = offlineGains(s, 12 * 3600 * 1000);
  assert.equal(g.show, true);
  assert.equal(g.events.some(e => e.type === 'recit'), false);
  assert.equal(g.s.meilleurEtage, 1);
  assert.deepEqual(g.s.recitsLus, []);
  assert.deepEqual(debloques(g.s.meilleurEtage), ['braise']);
});
