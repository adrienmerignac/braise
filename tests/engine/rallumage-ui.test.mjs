// M5.2b : section « Rallumer la braise » du panneau Carte — condition, bouton, dialogue de confirmation, effet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { fresh } from '../../dist/engine/state.js';
import { apercuRallumage } from '../../dist/engine/rallumage.js';
import { RALLUMAGE_DEBLOCAGE } from '../../dist/engine/balance.js';

const T0 = 1_000_000;
const sauve = (extra = {}) => ({ ...fresh(T0), guide: 'done', vus: ['gardien', 'absence'], version: 12, ...extra });
const avance = (extra = {}) => sauve({ stage: 50, zone: 'cryptes', meilleurEtage: 50, level: 40, gold: 1234, ...extra });

async function avecJeu(stockageV2, scenario) {
  const jeu = await lancerJeu({ stockageV2 });
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('avant déblocage : condition écrite, pas de bouton', () => avecJeu(sauve(), jeu => {
  jeu.clic('carte');
  assert.equal(jeu.texte('rallumagecondition'), `Rallumer la braise : vaincre le gardien de l’étage ${RALLUMAGE_DEBLOCAGE}`);
  assert.equal(jeu.el('rallumage-ouvrir').hidden, true);
}));

test('après déblocage : éclats, bonus, gain et bouton', () => avecJeu(avance({ rallumage: { eclats: 3, nombre: 1, record: 20 } }), jeu => {
  jeu.clic('carte');
  assert.equal(jeu.texte('rallumagecondition'), '');
  assert.equal(jeu.texte('rallumageetat'), '3 éclats · +15 % attaque, vie et or');
  assert.match(jeu.texte('rallumagegain'), /\+8 éclats → \+55 %/);
  assert.equal(jeu.el('rallumage-ouvrir').hidden, false);
}));

test('le dialogue reprend l’aperçu ; Annuler et Échap ne changent rien, le focus revient à la Carte', () => avecJeu(avance(), async jeu => {
  jeu.clic('carte');
  const avant = JSON.stringify(jeu.stockage());
  const a = apercuRallumage(JSON.parse(avant));
  for (const fermeture of [() => jeu.clic('rallumageconfirmnon'), () => jeu.echap()]) {
    jeu.clic('rallumage-ouvrir');
    assert.equal(jeu.el('rallumageconfirm').open, true);
    assert.equal(jeu.actif(), jeu.el('rallumageconfirmnon'));
    assert.match(jeu.texte('rallumageconfirmtexte'), /\+8 éclats/);
    assert.deepEqual(jeu.el('rallumageremis').children.map(li => li.textContent), a.remisAZero);
    assert.deepEqual(jeu.el('rallumageconserve').children.map(li => li.textContent), a.conserve);
    fermeture();
    assert.equal(jeu.el('rallumageconfirm').open, false);
    assert.equal(jeu.el('cartepanel').hidden, false);
    assert.equal(jeu.actif(), jeu.el('rallumage-ouvrir'), 'focus rendu au bouton qui a ouvert le dialogue');
  }
  assert.equal(JSON.stringify(jeu.stockage()), avant);
}));

test('Rallumer : état neuf sauvegardé, forêt étage 1, journal et jeu toujours en pause', () => avecJeu(avance(), jeu => {
  jeu.clic('pause');
  jeu.clic('carte');
  jeu.clic('rallumage-ouvrir');
  jeu.clic('rallumageconfirmok');
  const sv = jeu.stockage();
  assert.equal(sv.rallumage.eclats, 8);
  assert.equal(sv.rallumage.nombre, 1);
  assert.equal(sv.zone, 'foret');
  assert.equal(sv.stage, 1);
  assert.equal(sv.gold, 0);
  assert.equal(sv.guide ?? 'done', 'done');
  assert.equal(jeu.texte('message'), 'Braise rallumée : +8 éclats');
  assert.match(jeu.texte('floor'), /Étage 1/);
  assert.equal(jeu.texte('pause'), '▶ Reprendre');
  assert.equal(jeu.el('cartepanel').hidden, true);
  assert.ok(jeu.evenements.some(e => e.type === 'braise:zone' && e.detail.zone === 'foret'));
}));

test('Tab dans la Carte atteint « Rallumer la braise »', () => avecJeu(avance(), jeu => {
  jeu.clic('carte');
  const tab = shift => jeu.el('cartepanel').onkeydown({ key: 'Tab', shiftKey: shift });
  jeu.focus('carteclose');
  tab(true);
  assert.equal(jeu.actif(), jeu.el('rallumage-ouvrir'));
  tab(false);
  assert.equal(jeu.actif(), jeu.el('carteclose'));
}));
