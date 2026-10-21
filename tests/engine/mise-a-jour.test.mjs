import test from 'node:test';
import assert from 'node:assert/strict';
import { bandeauRequis, surveillerMiseAJour, appliquerMiseAJour } from '../../dist/engine/mise-a-jour.js';

function emetteur() {
  const ecouteurs = {};
  return {
    ecouteurs,
    addEventListener(type, f) { (ecouteurs[type] ||= []).push(f); },
    emettre(type) { (ecouteurs[type] || []).forEach(f => f()); },
  };
}
const navigateur = controller => Object.assign(emetteur(), { controller });
const nav = controller => ({ serviceWorker: navigateur(controller) });

test('pas de bandeau à la première installation (aucun contrôleur)', () => {
  assert.equal(bandeauRequis({ waiting: {}, controller: null }), false);
  const reg = Object.assign(emetteur(), { waiting: { postMessage() {} } });
  let appels = 0;
  surveillerMiseAJour(reg, nav(null), () => appels++);
  assert.equal(appels, 0);
});

test('bandeau quand un worker attend et qu’un contrôleur existe, une seule fois', () => {
  const worker = { postMessage() {} };
  const reg = Object.assign(emetteur(), { waiting: worker });
  const vus = [];
  surveillerMiseAJour(reg, nav({}), w => vus.push(w));
  assert.deepEqual(vus, [worker]);
  reg.emettre('updatefound');
  assert.equal(vus.length, 1);
});

test('un worker qui finit d’être installé déclenche le bandeau', () => {
  const installing = Object.assign(emetteur(), { state: 'installing' });
  const reg = Object.assign(emetteur(), { waiting: null, installing });
  let appels = 0;
  surveillerMiseAJour(reg, nav({}), () => appels++);
  reg.emettre('updatefound');
  assert.equal(appels, 0);
  installing.state = 'installed';
  reg.waiting = installing;
  installing.emettre('statechange');
  assert.equal(appels, 1);
});

test('deux controllerchange ne provoquent qu’un seul rechargement, et seulement après le clic', () => {
  const n = nav({});
  let rechargements = 0;
  const clic = appliquerMiseAJour({ worker: { postMessage() {} }, nav: n, sauvegarder() {}, recharger: () => rechargements++ });
  n.serviceWorker.emettre('controllerchange');
  assert.equal(rechargements, 0);
  clic();
  n.serviceWorker.emettre('controllerchange');
  n.serviceWorker.emettre('controllerchange');
  assert.equal(rechargements, 1);
});

test('la sauvegarde est appelée avant SKIP_WAITING, et un second clic ne renvoie rien', () => {
  const journal = [];
  const clic = appliquerMiseAJour({
    worker: { postMessage: m => journal.push(m.type) }, nav: nav({}),
    sauvegarder: () => journal.push('sauvegarde'), recharger() {},
  });
  clic();
  clic();
  assert.deepEqual(journal, ['sauvegarde', 'SKIP_WAITING']);
});

test('SKIP_WAITING part même si la sauvegarde échoue', () => {
  const journal = [];
  appliquerMiseAJour({ worker: { postMessage: m => journal.push(m.type) }, nav: nav({}), sauvegarder() { throw Error('plein'); }, recharger() {} })();
  assert.deepEqual(journal, ['SKIP_WAITING']);
});
