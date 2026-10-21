import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { BESTIAIRE_IDS, bestiaireNeuf, marquerVu, enregistrerVictoire, MAX_VICTOIRES } from '../../dist/engine/bestiaire.js';
import { ENEMY_CATALOG } from '../../dist/engine/balance.js';
import { strike, enemyKind, newFight, startBoss } from '../../dist/engine/combat.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { voyager } from '../../dist/engine/zones.js';

test('la collection couvre les 9 types et les 3 gardiens, vierge au départ', () => {
  assert.equal(BESTIAIRE_IDS.length, 12);
  for (const k of Object.keys(ENEMY_CATALOG)) assert.ok(BESTIAIRE_IDS.includes(k));
  for (const z of ['foret', 'ruines', 'cryptes']) assert.ok(BESTIAIRE_IDS.includes(`gardien:${z}`));
  assert.deepEqual(fresh(0).bestiaire, bestiaireNeuf());
  assert.ok(Object.values(bestiaireNeuf()).every(e => e.vus === false && e.victoires === 0));
});

// Ennemi du type voulu : on fait varier `kills` jusqu'à tomber dessus.
const contre = (type, base = fresh(0)) => {
  for (let kills = 0; kills < 5; kills++) { const s = { ...base, kills }; if (enemyKind(s) === type) return s; }
  throw new Error(type);
};

test('l’apparition marque l’ennemi vu, sans victoire', () => {
  const s = contre('pillard');
  const r = newFight(s);
  assert.deepEqual(r.s.bestiaire.pillard, { vus: true, victoires: 0 });
  assert.equal(r.s.bestiaire.eclaireur.vus, false);
});

test('victoire sur un pillard : victoires +1, le type reste vu', () => {
  const s = contre('pillard');
  const f = { hp: 100, boss: false, enemyHP: 1, enemyMax: 40 };
  const r = strike(s, f);
  assert.deepEqual(r.s.bestiaire.pillard, { vus: true, victoires: 1 });
  assert.equal(r.s.bestiaire.eclaireur.victoires, 0);
  const r2 = strike({ ...contre('pillard', r.s) }, { ...f });
  assert.equal(r2.s.bestiaire.pillard.victoires, 2);
});

test('un coup qui ne tue pas ne crédite rien', () => {
  const s = contre('pillard');
  const r = strike(s, { hp: 100, boss: false, enemyHP: 9999, enemyMax: 9999 });
  assert.equal(r.s.bestiaire.pillard.victoires, 0);
});

test('victoire sur le gardien : entrée de la zone créditée, pas un type', () => {
  const s = { ...fresh(0), kills: 5 };
  const b = startBoss(s, { hp: 100, boss: false, enemyHP: 5, enemyMax: 5 });
  assert.deepEqual(b.s.bestiaire['gardien:foret'], { vus: true, victoires: 0 });
  const r = strike(b.s, { ...b.f, enemyHP: 1 });
  assert.equal(r.s.bestiaire['gardien:foret'].victoires, 1);
  assert.ok(Object.entries(r.s.bestiaire).filter(([k]) => !k.startsWith('gardien')).every(([, e]) => e.victoires === 0));
});

test('le voyage montre le premier ennemi de la nouvelle zone', () => {
  const s = { ...fresh(0), meilleurEtage: 7 };
  const r = voyager(s, { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 }, 'ruines');
  assert.equal(r.ok, true);
  assert.equal(r.s.bestiaire[enemyKind(r.s)].vus, true);
});

test('8 h d’absence : la collection est inchangée', () => {
  const s = { ...fresh(0), level: 5, weapon: 5 };
  const r = offlineGains(s, 8 * 3600 * 1000);
  assert.ok(r.wins > 0, 'des victoires estimées existent');
  assert.deepEqual(r.s.bestiaire, s.bestiaire);
});

test('le compteur est borné', () => {
  const s = { ...fresh(0) };
  s.bestiaire = { ...s.bestiaire, goule: { vus: true, victoires: MAX_VICTOIRES } };
  assert.equal(enregistrerVictoire(s, 'goule').bestiaire.goule.victoires, MAX_VICTOIRES);
  assert.equal(marquerVu(s, 'inconnu'), s);
});
