import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_DEFAUT, peutJouer, normaliserReglages, gainEffectif, creerAudio } from '../../dist/engine/audio.js';

const actif = { muet: false, volume: 0.6 };

test('défaut : son actif à 60 %', () => {
  assert.deepEqual(AUDIO_DEFAUT, { muet: false, volume: 0.6 });
});

test('rien n’est jouable avant interaction, en muet, à volume nul, en pause ou onglet masqué', () => {
  assert.equal(peutJouer(actif, true, false, false), true);
  assert.equal(peutJouer(actif, false, false, false), false);
  assert.equal(peutJouer({ muet: true, volume: 0.6 }, true, false, false), false);
  assert.equal(peutJouer({ muet: false, volume: 0 }, true, false, false), false);
  assert.equal(peutJouer(actif, true, true, false), false);
  assert.equal(peutJouer(actif, true, false, true), false);
});

test('volume borné : NaN, Infinity, chaîne, hors [0, 1] → défaut', () => {
  for (const volume of [NaN, Infinity, -Infinity, '0.3', null, undefined, -0.1, 1.1]) {
    assert.equal(normaliserReglages({ muet: false, volume }).volume, 0.6, String(volume));
  }
  assert.equal(normaliserReglages({ muet: false, volume: 0 }).volume, 0);
  assert.equal(normaliserReglages({ muet: false, volume: 1 }).volume, 1);
  assert.deepEqual(normaliserReglages(undefined), actif);
  assert.equal(normaliserReglages({ muet: 'oui' }).muet, false);
});

test('gain effectif : 0 en muet', () => {
  assert.equal(gainEffectif({ muet: true, volume: 0.9 }), 0);
  assert.equal(gainEffectif({ muet: false, volume: 0.4 }), 0.4);
});

test('jouer : sans effet tant qu’aucun son n’est enregistré, puis seulement si autorisé', () => {
  const lus = [];
  const audio = creerAudio({ lire: (son, gain) => lus.push([son, gain]) });
  const etat = { reglages: actif, interactionFaite: true, pause: false, masque: false };
  assert.equal(audio.jouer('pas', etat), false);
  audio.enregistrer('pas', 'son-pas');
  assert.equal(audio.jouer('pas', { ...etat, interactionFaite: false }), false);
  assert.equal(audio.jouer('pas', { ...etat, pause: true }), false);
  assert.deepEqual(lus, []);
  assert.equal(audio.jouer('pas', etat), true);
  assert.deepEqual(lus, [['son-pas', 0.6]]);
});
