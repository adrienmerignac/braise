import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';

const BASE = { gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000 };

async function avecJeu(options, scenario) {
  const jeu = await lancerJeu(options);
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

// Premier bouton actif parmi gardien, frappe, pause : la règle de focusLogique.
const attendu = jeu => ['boss', 'power', 'pause'].map(id => jeu.el(id)).find(b => !b.disabled);

// Partie à un coup du gardien : arme très forte, intro du gardien déjà vue.
const GARDIEN = { stockageV2: { version: 2, ...BASE, kills: 5, weapon: 20, level: 20, gold: 0, guide: 'done', vus: ['gardien', 'absence'] } };

function gardienVaincu(jeu) {
  jeu.clic('boss');
  for (let i = 0; i < 10 && jeu.el('bosspanel').hidden; i++) jeu.avancer(1_000);
  assert.equal(jeu.el('bosspanel').hidden, false, 'panneau du gardien ouvert');
  jeu.focus('bossclose');
}

test('nouvelle partie : Échap ferme « Compris » et le focus va au premier bouton actif', () => avecJeu({}, jeu => {
  assert.equal(jeu.el('guidepanel').hidden, false);
  jeu.focus('guideclose');
  jeu.echap();
  assert.equal(jeu.el('guidepanel').hidden, true);
  assert.equal(jeu.actif(), attendu(jeu));
  assert.notEqual(jeu.actif(), jeu.el('guideclose'));
}));

test('Échap hors d’un panneau ne déplace pas le focus du joueur', () => avecJeu({}, jeu => {
  jeu.focus('pause');
  jeu.echap();
  assert.equal(jeu.actif(), jeu.el('pause'));
  assert.equal(jeu.el('guidepanel').hidden, false, 'le panneau reste ouvert');
}));

test('gardien vaincu : le minuteur de 8 s ferme le panneau et rend le focus', () => avecJeu(GARDIEN, jeu => {
  gardienVaincu(jeu);
  jeu.avancer(6_000);
  assert.equal(jeu.el('bosspanel').hidden, false, 'encore ouvert avant 8 s');
  jeu.avancer(3_000);
  assert.equal(jeu.el('bosspanel').hidden, true);
  assert.equal(jeu.actif(), attendu(jeu));
  assert.notEqual(jeu.actif(), jeu.el('bossclose'));
}));

test('gardien vaincu : Échap ferme le panneau et rend le focus', () => avecJeu(GARDIEN, jeu => {
  gardienVaincu(jeu);
  jeu.echap();
  assert.equal(jeu.el('bosspanel').hidden, true);
  assert.equal(jeu.actif(), attendu(jeu));
  assert.notEqual(jeu.actif(), jeu.el('bossclose'));
}));

test('gardien vaincu : si le focus est ailleurs, la fermeture automatique ne le vole pas', () => avecJeu(GARDIEN, jeu => {
  gardienVaincu(jeu);
  jeu.focus('buy-weapon');
  jeu.avancer(9_000);
  assert.equal(jeu.el('bosspanel').hidden, true);
  assert.equal(jeu.actif(), jeu.el('buy-weapon'));
}));

test('absence : focus sur « Reprendre », fermeture et focus restitué à l’élément d’avant', async () => {
  const stockageV2 = { version: 2, ...BASE, gold: 0, guide: 'done', vus: ['gardien', 'absence'], last: 10_000_000 - 3_600_000 };
  await avecJeu({ debut: 10_000_000, stockageV2 }, jeu => {
    assert.equal(jeu.el('welcome').open, true);
    assert.equal(jeu.actif(), jeu.el('claim'));
    jeu.el('welcome').close();
    assert.equal(jeu.el('welcome').open, false);
    assert.notEqual(jeu.actif(), jeu.el('claim'), 'le focus quitte le dialogue fermé');
    assert.equal(jeu.actif(), attendu(jeu), 'rien n’avait le focus avant : repli logique');
  });
});

test('absence : Échap n’est pas détourné pendant le dialogue, « Reprendre » le ferme', async () => {
  const stockageV2 = { version: 2, ...BASE, gold: 0, guide: 'todo', vus: ['gardien', 'absence'], last: 10_000_000 - 3_600_000 };
  await avecJeu({ debut: 10_000_000, stockageV2 }, jeu => {
    jeu.echap();
    assert.equal(jeu.el('welcome').open, true, 'laissé au navigateur (dialogue natif)');
    jeu.clic('claim');
    assert.equal(jeu.el('welcome').open, false);
  });
});
