import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, KILLS_PER_STAGE } from '../../dist/engine/state.js';
import { newFight, strike } from '../../dist/engine/combat.js';
import { etatZones, voyager, zoneOuverte } from '../../dist/engine/zones.js';

const gardien = (stage, extra = {}) => {
  const s = { ...fresh(0), stage, meilleurEtage: stage, kills: KILLS_PER_STAGE, weapon: 50, ...extra };
  const f = { ...newFight(s).f, boss: true, enemyHP: 1, hp: 50 };
  return { s, f };
};

test('partie neuve : forêt ouverte, ruines et cryptes fermées avec leur condition', () => {
  const z = etatZones(fresh(0));
  assert.deepEqual(z.map(x => [x.id, x.ouverte, x.courante]), [['foret', true, true], ['ruines', false, false], ['cryptes', false, false]]);
  assert.equal(z[1].condition, 'Vaincre le gardien de l’étage 5');
  assert.equal(z[2].condition, 'Vaincre le gardien de l’étage 10');
});

test('gardien de l’étage 5 : l’étage reste 5, les ruines s’ouvrent', () => {
  const { s, f } = gardien(5);
  const r = strike(s, f);
  assert.equal(r.s.stage, 5);
  assert.equal(r.s.kills, 0);
  assert.equal(r.s.meilleurEtage, 6);
  assert.ok(zoneOuverte(r.s, 'ruines'));
  assert.equal(r.events.find(e => e.type === 'bossVictory').zoneOuverte, 'ruines');
  assert.equal(r.events.find(e => e.type === 'bossVictory').plafond, true);
  assert.ok(r.s.gold > 0);
});

test('gardien au milieu d’une zone : étage suivant, pas d’ouverture', () => {
  const { s, f } = gardien(3);
  const r = strike(s, f);
  assert.equal(r.s.stage, 4);
  assert.equal(r.events.find(e => e.type === 'bossVictory').zoneOuverte, undefined);
});

test('gardien de l’étage 5 déjà franchi : pas de nouvelle ouverture', () => {
  const { s, f } = gardien(5, { meilleurEtage: 9 });
  const r = strike(s, f);
  assert.equal(r.s.meilleurEtage, 9);
  assert.equal(r.events.find(e => e.type === 'bossVictory').zoneOuverte, undefined);
});

test('voyager : ruines, retour en forêt, retour aux ruines au meilleur étage, zone fermée sans effet', () => {
  const { s, f } = gardien(5);
  let r = strike(s, f);
  const f0 = { ...r.f, hp: 77 };
  const ferme = voyager(r.s, f0, 'cryptes');
  assert.equal(ferme.s, r.s); assert.equal(ferme.ok, false); assert.equal(ferme.motif, 'fermee');
  r = voyager(r.s, f0, 'ruines');
  assert.equal(r.s.stage, 6); assert.equal(r.s.zone, 'ruines'); assert.equal(r.f.hp, 77); assert.equal(r.f.boss, false);
  assert.equal(voyager(r.s, r.f, 'ruines').motif, 'courante');
  r = voyager({ ...r.s, meilleurEtage: 8 }, r.f, 'foret');
  assert.equal(r.s.stage, 5);
  r = voyager(r.s, r.f, 'ruines');
  assert.equal(r.s.stage, 8);
});

test('voyager abandonne le gardien en cours sans pénalité', () => {
  const { s, f } = gardien(5, { meilleurEtage: 6 });
  const r = voyager(s, f, 'ruines');
  assert.equal(r.f.boss, false); assert.equal(r.s.kills, 0); assert.equal(r.s.gold, s.gold);
});
