import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { couchesHeros, resumeEquipement, ACTIONS_HEROS } from '../../dist/engine/apparence-heros.js';

const BASE = a => ['body', 'pants', 'boots', 'mail', 'hood'].map(c => `${c}-${a}`);

test('équipe vide : ni plate ni sword', () => {
  for (const a of ACTIONS_HEROS) {
    const c = couchesHeros({}, a);
    assert.deepEqual(c, BASE(a));
  }
});

test('armure seule : plate entre mail et hood, pas de sword', () => {
  assert.deepEqual(couchesHeros({ armure: {} }, 'walk'), ['body', 'pants', 'boots', 'mail', 'plate', 'hood'].map(c => `${c}-walk`));
  assert.ok(!couchesHeros({ armure: {} }, 'swing').includes('sword'));
});

test('arme seule : sword en swing uniquement, au-dessus de tout', () => {
  assert.deepEqual(couchesHeros({ arme: {} }, 'swing'), [...BASE('swing'), 'sword']);
  assert.deepEqual(couchesHeros({ arme: {} }, 'walk'), BASE('walk'));
  assert.deepEqual(couchesHeros({ arme: {} }, 'hurt'), BASE('hurt'));
});

test('le charme ne change pas l’apparence', () => {
  assert.deepEqual(couchesHeros({ charme: {} }, 'swing'), BASE('swing'));
});

test('equipe absent ou undefined (vieille sauvegarde) : apparence de base', () => {
  assert.deepEqual(couchesHeros(undefined, 'swing'), BASE('swing'));
  assert.deepEqual(couchesHeros(null, 'walk'), BASE('walk'));
  assert.deepEqual(resumeEquipement(undefined), { arme: false, armure: false });
});

test('accepte le résumé booléen de braise:equipement', () => {
  assert.deepEqual(couchesHeros({ arme: true, armure: true }, 'swing'), ['body', 'pants', 'boots', 'mail', 'plate', 'hood'].map(c => `${c}-swing`).concat('sword'));
  assert.deepEqual(couchesHeros({ arme: false, armure: false }, 'swing'), BASE('swing'));
});

test('même ordre que tools/compose-hero.py', () => {
  const py = readFileSync(new URL('../../tools/compose-hero.py', import.meta.url), 'utf8');
  const ordre = py.match(/for layer in \[([^\]]+)\]/)[1].match(/'(\w+)'/g).map(s => s.slice(1, -1));
  assert.deepEqual(couchesHeros({ armure: true }, 'walk').map(n => n.split('-')[0]), ordre);
});
