import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { fresh } from '../../dist/engine/state.js';
import { effetSuivant, libelleInvestir, investissable, pointsTexte, texteConfirmation, comparerTalent } from '../../dist/engine/talents-libelles.js';
import { investir } from '../../dist/engine/talents.js';

const BASE = { version: 4, gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'], inventaire: [], equipe: {} };
const niveau = (level, talents = {}) => ({ ...BASE, level, talents });
const T0 = 1_000_000;
const etat = (level, talents = {}) => ({ ...fresh(T0), level, talents });

async function avecJeu(stockageV2, scenario) {
  const jeu = await lancerJeu({ stockageV2 });
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('libellés : effet du rang suivant, points libres, désactivation sans point ou au rang max', () => {
  assert.equal(effetSuivant(etat(7), 'assaut'), 'Rang suivant : +10 % d’attaque');
  assert.equal(pointsTexte(etat(1)), 'Aucun point libre');
  assert.equal(pointsTexte(etat(4)), '1 point libre');
  assert.equal(pointsTexte(etat(7)), '2 points libres');
  assert.equal(investissable(etat(1), 'assaut'), false);
  assert.equal(libelleInvestir(etat(1), 'assaut'), 'Aucun point libre');
  assert.equal(investissable(etat(7), 'assaut'), true);
  const max = etat(13, { assaut: 3 });
  assert.equal(investissable(max, 'assaut'), false);
  assert.equal(libelleInvestir(max, 'assaut'), 'Rang maximum');
  assert.equal(effetSuivant(max, 'assaut'), 'Rang maximum atteint');
});

test('confirmation : dit ce qui est remis à zéro et les points rendus', () => {
  const t = texteConfirmation(etat(10, { assaut: 2, braise: 1 }));
  assert.match(t, /Assaut 2\/3, Braise vive 1\/3/);
  assert.match(t, /remis à zéro/);
  assert.match(t, /Tu récupères 3 points/);
});

test('comparaison : seules les stats qui changent, la recharge baisse en gain', () => {
  const a = etat(7), b = investir(a, 'braise');
  const rows = comparerTalent(a, b);
  assert.deepEqual(rows.map(r => r.nom), ['Recharge (s)']);
  assert.equal(rows[0].delta * rows[0].meilleur > 0, true);
});

test('investir : rang et puissance affichée changent aussitôt, avant/après visible, sauvegardé', () => avecJeu(niveau(7), jeu => {
  const att0 = Number(jeu.texte('attack'));
  assert.match(jeu.texte('talentscompte'), /2 points libres/);
  jeu.clic('talents');
  assert.equal(jeu.texte('talent-rang-assaut'), '0/3');
  jeu.clic('talent-invest-assaut');
  assert.ok(Number(jeu.texte('attack')) > att0);
  assert.equal(jeu.texte('talent-rang-assaut'), '1/3');
  assert.equal(jeu.el('talentscomp').children[0].children[0].textContent, 'Attaque');
  assert.match(jeu.texte('talentsmsg'), /Assaut passe au rang 1\/3/);
  assert.equal(jeu.stockage().talents.assaut, 1, 'écrit sans attendre l’autosauvegarde');
  assert.match(jeu.texte('talentscompte'), /1 point libre/);
}));

test('sans point : tous les boutons Investir sont désactivés et le clic ne change rien', () => avecJeu(niveau(1), jeu => {
  jeu.clic('talents');
  for (const id of ['assaut', 'rempart', 'fortune', 'braise']) assert.equal(jeu.el('talent-invest-' + id).disabled, true);
  assert.equal(jeu.el('talentsreset').disabled, true);
  assert.equal(jeu.texte('talentscompte'), '');
}));

test('dépenser le dernier point désactive les boutons, le focus reste dans le panneau', () => avecJeu(niveau(4), jeu => {
  jeu.clic('talents');
  jeu.clic('talent-invest-assaut');
  assert.equal(jeu.el('talent-invest-assaut').disabled, true);
  assert.equal(jeu.actif(), jeu.el('talentsreset'));
}));

test('réinitialiser : confirmation, annuler ne change rien, confirmer rend les points', () => avecJeu(niveau(7, { assaut: 2 }), jeu => {
  const att = jeu.texte('attack');
  jeu.clic('talents');
  jeu.clic('talentsreset');
  assert.equal(jeu.el('talentsconfirm').open, true);
  assert.match(jeu.texte('talentsconfirmtexte'), /Tu récupères 2 points/);
  assert.equal(jeu.actif(), jeu.el('talentsconfirmnon'));
  jeu.clic('talentsconfirmnon');
  assert.equal(jeu.el('talentsconfirm').open, false);
  assert.equal(jeu.texte('attack'), att);
  assert.equal(jeu.el('talentspanel').hidden, false);
  jeu.clic('talentsreset');
  jeu.clic('talentsconfirmok');
  assert.notEqual(jeu.texte('attack'), att);
  assert.match(jeu.texte('talentsmsg'), /2 points rendus/);
  assert.deepEqual(jeu.stockage().talents, {});
  assert.match(jeu.texte('talentscompte'), /2 points libres/);
}));

test('Échap ferme la confirmation sans réinitialiser', () => avecJeu(niveau(7, { assaut: 1 }), jeu => {
  jeu.clic('talents');
  jeu.clic('talentsreset');
  jeu.echap();
  assert.equal(jeu.el('talentsconfirm').open, false);
  assert.equal(jeu.el('talentspanel').hidden, false);
  assert.equal(jeu.stockage().talents?.assaut ?? 1, 1);
}));

test('recharger la page conserve les rangs', async () => {
  let stock;
  await avecJeu(niveau(7), async jeu => { jeu.clic('talents'); jeu.clic('talent-invest-fortune'); jeu.clic('talent-invest-fortune'); stock = jeu.stockage(); });
  assert.equal(stock.talents.fortune, 2);
  await avecJeu(stock, jeu => {
    jeu.clic('talents');
    assert.equal(jeu.texte('talent-rang-fortune'), '2/3');
    assert.equal(jeu.texte('talentscompte'), '');
  });
});
