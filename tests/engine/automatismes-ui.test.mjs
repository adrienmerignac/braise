// M5.4b : réglage « Gardien automatique » — condition écrite avant déblocage, case persistée, attente écrite si « Mortel ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { fresh } from '../../dist/engine/state.js';
import { texteGardienAuto, basculerAutomatisme } from '../../dist/engine/automatismes.js';
import { AUTO_GARDIEN_DEBLOCAGE, KILLS_PER_STAGE } from '../../dist/engine/balance.js';

const T0 = 1_000_000;
const sauve = (extra = {}) => ({ ...fresh(T0), guide: 'done', vus: ['gardien', 'absence'], version: 11, ...extra });
const debloque = (extra = {}) => sauve({ stage: 12, zone: 'cryptes', meilleurEtage: AUTO_GARDIEN_DEBLOCAGE + 1, level: 40, weapon: 30, armor: 30, ...extra });

async function avecJeu(stockageV2, scenario) {
  const jeu = await lancerJeu({ stockageV2 });
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('avant déblocage : case masquée, condition écrite, rien d’actif', () => avecJeu(sauve(), jeu => {
  assert.equal(jeu.el('autogardienlabel').hidden, true);
  assert.equal(jeu.el('autogardiencase').checked, false);
  assert.equal(jeu.texte('autogardientexte'), `Gardien automatique : vaincre le gardien de l’étage ${AUTO_GARDIEN_DEBLOCAGE}`);
  jeu.el('autogardiencase').onchange();
  assert.equal(jeu.stockage().automatismes.gardien, false);
}));

test('débloqué : case visible, décochée par défaut, cocher persiste et survit au rechargement', async () => {
  let brut;
  await avecJeu(debloque(), jeu => {
    assert.equal(jeu.el('autogardienlabel').hidden, false);
    assert.equal(jeu.el('autogardiencase').checked, false);
    assert.equal(jeu.texte('autogardientexte'), '');
    jeu.el('autogardiencase').onchange();
    assert.equal(jeu.el('autogardiencase').checked, true);
    assert.equal(jeu.stockage().automatismes.gardien, true);
    brut = jeu.stockage();
  });
  await avecJeu(brut, jeu => assert.equal(jeu.el('autogardiencase').checked, true));
});

test('gardien « Mortel » : texte d’attente écrit, le bouton Affronter reste utilisable', () => avecJeu(debloque({ level: 1, weapon: 0, armor: 0, kills: KILLS_PER_STAGE, stage: 30, meilleurEtage: 30, zone: 'cryptes' }), jeu => {
  jeu.el('autogardiencase').onchange();
  assert.equal(jeu.stockage().automatismes.gardien, true);
  assert.equal(jeu.texte('autogardientexte'), 'Gardien automatique en attente : danger Mortel');
  assert.equal(jeu.el('boss').disabled, false);
}));

test('texte : vide hors attente, même Mortel tant que le gardien n’est pas prêt ou la case décochée', () => {
  const mortel = debloque({ level: 1, weapon: 0, armor: 0, stage: 30, meilleurEtage: 30 });
  assert.equal(texteGardienAuto({ ...mortel, kills: KILLS_PER_STAGE }), '');
  const actif = basculerAutomatisme(mortel, 'gardien');
  assert.equal(texteGardienAuto({ ...actif, kills: 0 }), '');
  assert.match(texteGardienAuto({ ...actif, kills: KILLS_PER_STAGE }), /en attente : danger Mortel/);
});
