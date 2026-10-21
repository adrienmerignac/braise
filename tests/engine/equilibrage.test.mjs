import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../../tools/simulate.mjs';
import * as balance from '../../dist/engine/balance.js';
import * as state from '../../dist/engine/state.js';
import * as combat from '../../dist/engine/combat.js';
import * as offline from '../../dist/engine/offline.js';
import { assessGuardian } from '../../dist/engine/combat.js';
import { KILLS_PER_STAGE, ATTACK_INTERVAL_MS } from '../../dist/engine/balance.js';

test('la simulation est déterministe', () => {
  assert.deepEqual(simulate({ minutes: 30 }), simulate({ minutes: 30 }));
});

// Politique « patient » (`--farm`) : le gardien n'est lancé que s'il n'est pas « Mortel ». La politique fixe historique se bloque
// désormais devant le premier gardien (PV de gardien × 5 sur ENEMY_HP_PER_STAGE 36) : elle ne sert plus de référence.
const PATIENT = { minutes: 30, politique: 'farm' };

test('snapshot : premier achat et premier gardien', () => {
  const r = simulate(PATIENT);
  // Toute différence signale un changement d'équilibrage : à décider, pas à corriger en silence.
  assert.equal(r.firstPurchaseSeconds, 13.2);
  assert.equal(r.firstBossSeconds, 79.2);
  assert.equal(r.stage1AvgWinSeconds, 5.78);
  assert.equal(r.stageReached, 16);
  assert.ok(r.firstPurchaseSeconds <= 60);
});

test('snapshot : ouverture des ruines, des cryptes et gardien de l\'étage 15', () => {
  const r = simulate(PATIENT);
  // Même règle : toute différence signale un changement d'équilibrage.
  assert.equal(r.ruinesSeconds, 272.4);
  assert.equal(r.cryptesSeconds, 615.6);
  assert.equal(r.gardien15Seconds, 1429.2);
  assert.ok(r.firstBossSeconds < r.ruinesSeconds && r.ruinesSeconds < r.cryptesSeconds);
  assert.ok(r.cryptesSeconds < r.gardien15Seconds);
});

test('rythme : le gardien de l\'étage 15 tombe entre 20 et 30 min de jeu continu, politique patiente, graine 1', () => {
  // Cible de l'issue #131 (objectif M2 « 20–30 minutes de progression intéressante »), reprise de docs/EQUILIBRAGE.md : réversible si le design change.
  const r = simulate({ minutes: 40, politique: 'farm' });
  assert.ok(r.gardien15Seconds !== null, 'gardien 15 jamais vaincu');
  const minutes = r.gardien15Seconds / 60;
  assert.ok(minutes >= 20 && minutes <= 30, `gardien 15 à ${minutes.toFixed(1)} min`);
});

test('rythme : pas de mur avant le gardien 15, jamais plus de 5 min « Mortel » d\'affilée en politique patiente', () => {
  let serie = 0, pire = 0;
  simulate({ minutes: 40, politique: 'farm', etageCible: 16, observer: (s, f) => {
    if (!f.boss && s.kills >= KILLS_PER_STAGE && assessGuardian(s).danger === 'Mortel') pire = Math.max(pire, ++serie); else serie = 0;
  } });
  assert.ok(pire * ATTACK_INTERVAL_MS / 1000 <= 300, `${pire * ATTACK_INTERVAL_MS / 1000} s de mur`);
});

test('rythme : les cryptes s\'ouvrent en 30 minutes, sans build comme avec assaut ou rempart', () => {
  const CIBLE_SECONDES = 30 * 60;
  for (const build of [[], ['assaut', 'assaut', 'assaut'], ['rempart', 'rempart', 'rempart']]) {
    const r = simulate({ ...PATIENT, build });
    assert.ok(r.cryptesSeconds !== null && r.cryptesSeconds <= CIBLE_SECONDES, `${build[0] ?? 'sans build'} : ${r.cryptesSeconds} s`);
  }
});

test('talents : assaut max et rempart max atteignent le premier gardien et vont plus loin qu\'un jeu sans talent', () => {
  const sans = simulate(PATIENT);
  for (const id of ['assaut', 'rempart']) {
    const r = simulate({ ...PATIENT, build: [id, id, id] });
    assert.ok(r.firstBossSeconds !== null && r.firstBossSeconds <= 90, `${id} : ${r.firstBossSeconds} s`);
    assert.ok(r.stageReached > sans.stageReached, `${id} : étage ${r.stageReached} vs ${sans.stageReached}`);
  }
  assert.equal(sans.firstBossSeconds, 79.2);
});

test('les modules exposent les constantes centralisées', () => {
  for (const [k, v] of Object.entries(balance)) {
    const exposed = k in state ? state[k] : k in combat ? combat[k] : k in offline ? offline[k] : undefined;
    if (exposed !== undefined) assert.deepEqual(exposed, v, k);
  }
});
