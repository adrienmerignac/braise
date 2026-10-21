import test from 'node:test';
import assert from 'node:assert/strict';
import { ETINCELLES_MAX, ajouterEtincelles, doitRedessiner } from '../../dist/engine/etincelles.js';
import { createSceneQueue } from '../../dist/engine/scene-queue.js';

const rafale = (debut, n) => Array.from({ length: n }, (_, i) => ({ id: debut + i }));

test('des rafales de coups forts sans avancer le temps ne dépassent jamais le plafond', () => {
  const sparks = [];
  let id = 0;
  for (let coup = 0; coup < 50; coup++) {
    ajouterEtincelles(sparks, rafale(id, 30));
    id += 30;
    assert.ok(sparks.length <= ETINCELLES_MAX);
  }
  assert.equal(sparks.length, ETINCELLES_MAX);
});

test('ce sont les étincelles les plus anciennes qui partent', () => {
  const sparks = rafale(0, 50);
  ajouterEtincelles(sparks, rafale(50, 30));
  assert.equal(sparks.length, ETINCELLES_MAX);
  assert.equal(sparks[0].id, 20);
  assert.equal(sparks.at(-1).id, 79);
});

test('sous le plafond, rien n’est retiré', () => {
  const sparks = ajouterEtincelles([], rafale(0, 10));
  assert.equal(sparks.length, 10);
});

test('en pause sans événement, plus d’image après la dernière', () => {
  assert.equal(doitRedessiner({ pause: true, imageFinalePosee: false, evenementEnAttente: false }), true);
  assert.equal(doitRedessiner({ pause: true, imageFinalePosee: true, evenementEnAttente: false }), false);
});

test('hors pause (reprise) ou sur événement en file, on redessine', () => {
  assert.equal(doitRedessiner({ pause: false, imageFinalePosee: true, evenementEnAttente: false }), true);
  const file = [];
  const q = createSceneQueue((type) => file.push(type));
  q.ready(0);
  for (const type of ['combat', 'spawn']) {
    q.push(type, {}, 0);
    assert.equal(doitRedessiner({ pause: true, imageFinalePosee: true, evenementEnAttente: true }), true);
  }
  assert.deepEqual(file, ['combat', 'spawn']);
});
