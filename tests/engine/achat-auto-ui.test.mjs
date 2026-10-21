// M5.4d : réglage « Achat automatique » — condition écrite avant déblocage, case persistée, achat au pas suivant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { fresh } from '../../dist/engine/state.js';
import { texteAchatAuto, basculerAutomatisme } from '../../dist/engine/automatismes.js';
import { AUTO_ACHAT_DEBLOCAGE } from '../../dist/engine/balance.js';

const T0 = 1_000_000;
const sauve = (extra = {}) => ({ ...fresh(T0), guide: 'done', vus: ['gardien', 'absence'], version: 11, ...extra });
const debloque = (extra = {}) => sauve({ stage: 16, meilleurEtage: AUTO_ACHAT_DEBLOCAGE + 1, level: 40, ...extra });

async function avecJeu(stockageV2, scenario) {
  const jeu = await lancerJeu({ stockageV2 });
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('avant déblocage : case masquée, condition écrite, rien d’actif', () => avecJeu(sauve(), jeu => {
  assert.equal(jeu.el('autoachatlabel').hidden, true);
  assert.equal(jeu.el('autoachatcase').checked, false);
  assert.equal(jeu.texte('autoachattexte'), `Achat automatique : vaincre le gardien de l’étage ${AUTO_ACHAT_DEBLOCAGE}`);
  jeu.el('autoachatcase').onchange();
  assert.equal(jeu.stockage().automatismes.achat, false);
}));

test('débloqué : case visible et décochée, cocher persiste et survit au rechargement', async () => {
  let brut;
  await avecJeu(debloque(), jeu => {
    assert.equal(jeu.el('autoachatlabel').hidden, false);
    assert.equal(jeu.el('autoachatcase').checked, false);
    assert.equal(jeu.texte('autoachattexte'), '');
    jeu.el('autoachatcase').onchange();
    assert.equal(jeu.el('autoachatcase').checked, true);
    assert.equal(jeu.stockage().automatismes.achat, true);
    brut = jeu.stockage();
  });
  await avecJeu(brut, jeu => assert.equal(jeu.el('autoachatcase').checked, true));
});

test('case cochée : l’achat se fait au pas suivant, boutons manuels toujours utilisables', () => avecJeu(debloque({ gold: 1e6 }), jeu => {
  assert.equal(jeu.el('buy-weapon').disabled, false);
  const avant = jeu.stockage();
  jeu.avancer(6000);
  assert.equal(jeu.stockage().weapon + jeu.stockage().armor + jeu.stockage().luck, avant.weapon + avant.armor + avant.luck);
  jeu.el('autoachatcase').onchange();
  jeu.avancer(6000);
  const apres = jeu.stockage();
  assert.ok(apres.weapon + apres.armor + apres.luck > avant.weapon + avant.armor + avant.luck);
  assert.equal(jeu.el('buy-weapon').disabled, false);
}));

test('texte : condition seulement avant déblocage', () => {
  assert.match(texteAchatAuto(sauve()), /vaincre le gardien de l’étage 15/);
  const d = debloque();
  assert.equal(texteAchatAuto(d), '');
  assert.equal(texteAchatAuto(basculerAutomatisme(d, 'achat')), '');
});
