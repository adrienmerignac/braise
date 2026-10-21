import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneQueue, FALL_MS, MAX_PENDING } from '../../dist/engine/scene-queue.js';

function setup() {
  const log = [];
  const queue = createSceneQueue((type, detail, time) => log.push([type, time, detail]));
  return { log, queue };
}
const hit = defeated => ({ damage: 5, strong: false, defeated, boss: false, health: 1 });

test('rien n’est livré avant la fin du chargement, puis tout est rejoué dans l’ordre', () => {
  const { log, queue } = setup();
  queue.push('spawn', { boss: false }, 0);
  queue.push('combat', hit(false), 10);
  assert.equal(log.length, 0);
  queue.ready(300);
  assert.deepEqual(log.map(e => e[0]), ['spawn', 'combat']);
  assert.equal(queue.size, 0);
});

test('l’apparition attend la fin de la chute après un coup fatal', () => {
  const { log, queue } = setup();
  queue.ready(0);
  queue.push('combat', hit(true), 100);
  queue.push('spawn', { boss: false }, 100);
  queue.flush(100 + FALL_MS - 1);
  assert.deepEqual(log.map(e => e[0]), ['combat']);
  queue.flush(100 + FALL_MS);
  assert.deepEqual(log.map(e => e[0]), ['combat', 'spawn']);
  assert.equal(log[1][1], 100 + FALL_MS);
});

test('un nouveau coup ne tombe pas sur un ennemi en train de tomber', () => {
  const { log, queue } = setup();
  queue.ready(0);
  queue.push('combat', hit(true), 0);
  queue.push('spawn', { boss: true }, 0);
  queue.push('combat', hit(false), 500);
  queue.flush(FALL_MS);
  assert.deepEqual(log.map(e => e[0]), ['combat', 'spawn', 'combat']);
});

test('après une longue absence (horloge figée), la scène retrouve l’état courant en au plus une chute', () => {
  const { log, queue } = setup();
  queue.ready(0);
  queue.push('combat', hit(true), 0);
  for (let i = 0; i < 100; i++) {
    queue.push('spawn', { boss: false }, 0);
    queue.push('combat', hit(true), 0);
  }
  assert.ok(queue.size <= MAX_PENDING);
  queue.push('spawn', { boss: true }, 0);
  queue.flush(FALL_MS);
  queue.flush(2 * FALL_MS);
  assert.equal(queue.size, 0);
  assert.deepEqual(log.at(-1).slice(0, 1), ['spawn']);
  assert.equal(log.at(-1)[2].boss, true);
  assert.ok(log.at(-1)[1] <= 2 * FALL_MS);
  assert.ok(log.length <= 1 + MAX_PENDING);
});
