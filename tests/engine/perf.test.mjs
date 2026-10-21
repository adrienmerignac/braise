import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { perfActif, agreger, etatRendu, formaterEncart, formaterReleve, demarrerPerf } from '../../dist/perf.js';

test('?perf active le relevé, son absence non', () => {
  assert.equal(perfActif('?perf'), true);
  assert.equal(perfActif('?a=1&perf'), true);
  assert.equal(perfActif('?perf=1'), true);
  assert.equal(perfActif(''), false);
  assert.equal(perfActif('?performance=1'), false);
  assert.equal(perfActif(undefined), false);
});

test('agrégation : fps sur la fenêtre, moyenne et pire temps de draw', () => {
  assert.deepEqual(agreger([2, 4, 6, 8], 2000), { images: 4, fps: 2, moyenne: 5, pire: 8 });
  assert.deepEqual(agreger(Array(120).fill(3), 2000), { images: 120, fps: 60, moyenne: 3, pire: 3 });
  assert.deepEqual(agreger([], 2000), { images: 0, fps: 0, moyenne: 0, pire: 0 });
});

test('état du rendu : masqué, arrêté en pause, actif', () => {
  assert.equal(etatRendu({ pause: true, boucleActive: false, masque: false }), 'rendu arrêté en pause');
  assert.equal(etatRendu({ pause: true, boucleActive: true, masque: false }), 'actif');
  assert.equal(etatRendu({ pause: false, boucleActive: true, masque: true }), 'onglet masqué');
  assert.equal(etatRendu({ pause: false, boucleActive: true, masque: false }), 'actif');
});

test('la ligne copiée porte version, appareil et mesures', () => {
  const m = agreger([10, 30], 2000);
  const ligne = formaterReleve(m, { etincelles: 12, etat: 'actif', version: '0.9.1', userAgent: 'UA-test', ecran: '360x800', dpr: 3 });
  assert.equal(ligne, 'Braise 0.9.1 | UA UA-test | écran 360x800 | dpr 3 | fps 1 | draw moy 20 ms | draw pire 30 ms | étincelles 12 | rendu actif');
  assert.match(formaterEncart(m, { etincelles: 12, etat: 'actif' }).join(' '), /1 i\/s.*pire 30 ms.*étincelles 12.*actif/);
});

test('sans ?perf : aucune sonde, aucun minuteur, encart intact', () => {
  let minuteurs = 0;
  const sonde = demarrerPerf({ search: '', document: {}, navigator: {}, screen: {}, lire: () => ({}), setInterval: () => { minuteurs++; } });
  assert.equal(sonde, null);
  assert.equal(minuteurs, 0);
});

test('avec ?perf : l\'encart s\'affiche, se rafraîchit et copie le relevé sans réseau', async () => {
  const el = () => ({ hidden: true, textContent: '', dataset: {}, handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } });
  const els = { perf: el(), perftexte: el(), perfcopier: el(), perfretour: el() };
  const doc = { hidden: false, getElementById: id => els[id], querySelector: () => ({ textContent: '· Bêta 0.9.1' }) };
  let tick, copie = null;
  const nav = { userAgent: 'UA', clipboard: { writeText: async t => { copie = t; } } };
  const sonde = demarrerPerf({ search: '?perf', document: doc, navigator: nav, screen: { width: 360, height: 800 }, devicePixelRatio: 2,
    lire: () => ({ pause: false, boucleActive: true, etincelles: 5 }), setInterval: f => { tick = f; } });
  assert.equal(els.perf.hidden, false);
  await els.perfcopier.handlers.click();
  assert.match(els.perfretour.textContent, /Patienter/);
  sonde.image(4); sonde.image(8);
  tick();
  assert.match(els.perftexte.textContent, /1 i\/s.*moy\. 6 ms.*pire 8 ms.*étincelles 5.*actif/);
  await els.perfcopier.handlers.click();
  assert.equal(copie, 'Braise 0.9.1 | UA UA | écran 360x800 | dpr 2 | fps 1 | draw moy 6 ms | draw pire 8 ms | étincelles 5 | rendu actif');
});

test('perf.js ne touche ni au réseau ni à la simulation ; game.js ne lit pas l\'encart', () => {
  const src = readFileSync(new URL('../../dist/perf.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|requestAnimationFrame/);
  assert.doesNotMatch(readFileSync(new URL('../../dist/game.js', import.meta.url), 'utf8'), /perf/);
});
