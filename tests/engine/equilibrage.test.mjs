import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../../tools/simulate.mjs';
import * as balance from '../../dist/engine/balance.js';
import * as state from '../../dist/engine/state.js';
import * as combat from '../../dist/engine/combat.js';
import * as offline from '../../dist/engine/offline.js';

test('la simulation est déterministe', () => {
  assert.deepEqual(simulate({ minutes: 30 }), simulate({ minutes: 30 }));
});

test('snapshot : premier achat et premier gardien', () => {
  const r = simulate({ minutes: 30 });
  // Toute différence signale un changement d'équilibrage : à décider, pas à corriger en silence.
  assert.equal(r.firstPurchaseSeconds, 7.2);
  assert.equal(r.firstBossSeconds, 34.8);
  assert.equal(r.stage1AvgWinSeconds, 3.84);
  assert.equal(r.stageReached, 26);
});

test('talents : assaut max et rempart max atteignent le premier gardien dans le budget de temps', () => {
  const sans = simulate({ minutes: 30 });
  for (const id of ['assaut', 'rempart']) {
    const r = simulate({ minutes: 30, build: [id, id, id] });
    assert.ok(r.firstBossSeconds !== null && r.firstBossSeconds <= 60, `${id} : ${r.firstBossSeconds} s`);
    assert.ok(r.stageReached > sans.stageReached, `${id} : étage ${r.stageReached} vs ${sans.stageReached}`);
  }
  assert.equal(sans.firstBossSeconds, 34.8);
});

test('les modules exposent les constantes centralisées', () => {
  for (const [k, v] of Object.entries(balance)) {
    const exposed = k in state ? state[k] : k in combat ? combat[k] : k in offline ? offline[k] : undefined;
    if (exposed !== undefined) assert.deepEqual(exposed, v, k);
  }
});
