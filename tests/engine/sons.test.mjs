import test from 'node:test';
import assert from 'node:assert/strict';
import { RECETTES, recetteValide, sonsPourEvenement, DUREE_MAX_SON_MS } from '../../dist/engine/sons.js';
import { creerAudio } from '../../dist/engine/audio.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { fresh } from '../../dist/engine/state.js';

const noms = (type, detail, opts) => sonsPourEvenement(type, detail, opts).map(s => s.nom);

test('un coup ordinaire joue « coup », le gardien un coup plus grave', () => {
  assert.deepEqual(noms('combat', { strong: false, boss: false }), ['coup']);
  assert.deepEqual(noms('combat', { strong: false, boss: true }), ['coup-gardien']);
  assert.ok(RECETTES['coup-gardien'].freq[0] < RECETTES.coup.freq[0]);
});

test('la frappe de braise joue « feu » à la place du coup', () => {
  const n = noms('combat', { strong: true, boss: false });
  assert.deepEqual(n, ['feu']);
  assert.ok(!n.includes('coup'));
});

test('le coup sonne à l’impact affiché, pas à la résolution', () => {
  assert.equal(sonsPourEvenement('combat', {})[0].delaiMs, 330);
});

test('spawn : 2 à 4 pas, aucun en mouvement réduit', () => {
  const n = noms('spawn', { boss: false });
  assert.ok(n.length >= 2 && n.length <= 4 && n.every(x => x === 'pas'));
  assert.deepEqual(noms('spawn', {}, { mouvementReduit: true }), []);
  assert.deepEqual(noms('pause', true), []);
});

test('chaque recette est bornée', () => {
  for (const [nom, r] of Object.entries(RECETTES)) {
    assert.ok(recetteValide(r), nom);
    assert.ok(r.duree * 1000 <= DUREE_MAX_SON_MS && r.pic <= 1, nom);
  }
  assert.ok(RECETTES.coup.duree < 0.25 && RECETTES['coup-gardien'].duree < 0.25 && RECETTES.pas.duree < 0.12);
  assert.ok(!recetteValide({ ...RECETTES.coup, duree: 0.5 }));
  assert.ok(!recetteValide({ ...RECETTES.coup, freq: [0, 50] }));
  assert.ok(!recetteValide({ ...RECETTES.coup, pic: 1.5 }));
});

test('les gains d’absence ne déclenchent aucun son', () => {
  const s = fresh();
  const r = offlineGains({ ...s, last: 0 }, 8 * 3600 * 1000);
  const appels = [];
  const audio = creerAudio({ lire: (...a) => appels.push(a) });
  for (const [nom, rec] of Object.entries(RECETTES)) audio.enregistrer(nom, rec);
  const etat = { reglages: { muet: false, volume: 0.6 }, interactionFaite: true, pause: false, masque: false };
  for (const e of r.events) for (const son of sonsPourEvenement(e.type === 'combat' || e.type === 'spawn' ? e.type : '', e)) audio.jouer(son.nom, etat);
  assert.ok(r.wins > 0);
  assert.equal(appels.length, 0);
});

test('lecture : rien avant interaction, muet, volume 0, pause, masqué ; gain = volume réglé', () => {
  const appels = [];
  const audio = creerAudio({ lire: (r, g) => appels.push([r, g]) });
  for (const [nom, rec] of Object.entries(RECETTES)) audio.enregistrer(nom, rec);
  const ok = { reglages: { muet: false, volume: 0.4 }, interactionFaite: true, pause: false, masque: false };
  for (const bloque of [{ interactionFaite: false }, { reglages: { muet: true, volume: 0.4 } }, { reglages: { muet: false, volume: 0 } }, { pause: true }, { masque: true }])
    assert.equal(audio.jouer('coup', { ...ok, ...bloque }), false);
  assert.equal(appels.length, 0);
  for (const nom of ['coup', 'feu', 'pas', 'coup-gardien']) assert.equal(audio.jouer(nom, ok), true);
  assert.equal(appels.length, 4);
  assert.ok(appels.every(([, g]) => g === 0.4));
});
