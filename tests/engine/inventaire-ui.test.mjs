import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { creerObjet } from '../../dist/engine/equipement.js';

const BASE = { version: 3, gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'] };
const epee = creerObjet('arme', 'commun', 1), grande = creerObjet('arme', 'epique', 5), cotte = creerObjet('armure', 'rare', 2);

async function avecJeu(stockageV2, scenario) {
  const jeu = await lancerJeu({ stockageV2 });
  try { await scenario(jeu); } finally { jeu.fermer(); }
}
const ligne = (jeu, i) => jeu.el('inventairelist').children[i];
const ouvrir = jeu => jeu.clic('inventaire');

test('le bouton ouvre le panneau, Échap le ferme et rend le focus au bouton', () => avecJeu({ ...BASE, inventaire: [epee], equipe: {} }, jeu => {
  assert.equal(jeu.el('inventairepanel').hidden, true);
  ouvrir(jeu);
  assert.equal(jeu.el('inventairepanel').hidden, false);
  assert.equal(jeu.actif(), ligne(jeu, 0), 'le focus entre dans la liste');
  jeu.focus('inventaireclose');
  jeu.echap();
  assert.equal(jeu.el('inventairepanel').hidden, true);
  assert.equal(jeu.actif(), jeu.el('inventaire'));
}));

test('trois cases équipées en tête puis les objets ; flèches et Entrée', () => avecJeu({ ...BASE, inventaire: [epee, cotte], equipe: {} }, jeu => {
  ouvrir(jeu);
  const liste = jeu.el('inventairelist');
  assert.equal(liste.children.length, 5);
  assert.match(ligne(jeu, 0).children[0].textContent, /emplacement vide/);
  liste.onkeydown({ key: 'End' });
  assert.equal(jeu.actif(), ligne(jeu, 4));
  liste.onkeydown({ key: 'ArrowUp' });
  liste.onkeydown({ key: 'Enter' });
  assert.match(jeu.texte('inventairenom'), /Arme/);
  assert.equal(jeu.el('equiper').hidden, false);
  assert.equal(jeu.texte('equiper'), 'Équiper');
}));

test('équiper : stats du jeu mises à jour, échange, delta affiché', () => avecJeu({ ...BASE, inventaire: [grande], equipe: { arme: epee } }, jeu => {
  const att0 = Number(jeu.texte('attack'));
  ouvrir(jeu);
  ligne(jeu, 3).onclick();
  const delta = grande.bonus.attaque - epee.bonus.attaque;
  assert.equal(jeu.el('inventairecomp').children.length, 3, 'attaque, vie max, or');
  jeu.clic('equiper');
  assert.equal(Number(jeu.texte('attack')), att0 + delta);
  const sauve = jeu.stockage();
  assert.deepEqual(sauve.equipe.arme, grande);
  assert.deepEqual(sauve.inventaire, [epee]);
}));

test('déséquiper puis rechargement : l’équipement persiste', async () => {
  let stock;
  await avecJeu({ ...BASE, inventaire: [cotte], equipe: { arme: epee } }, async jeu => {
    ouvrir(jeu);
    ligne(jeu, 3).onclick();
    jeu.clic('equiper');
    assert.equal(jeu.stockage().equipe.armure.rarete, 'rare');
    ligne(jeu, 0).onclick();
    jeu.clic('equiper');
    jeu.avancer(6_000);
    stock = jeu.stockage();
  });
  assert.equal(stock.equipe.armure.rarete, 'rare');
  assert.deepEqual(stock.inventaire, [epee]);
  await avecJeu(stock, jeu => {
    assert.equal(Number(jeu.texte('attack')) > 0, true);
    ouvrir(jeu);
    assert.match(ligne(jeu, 1).children[0].textContent, /Équipé · Armure/);
    assert.equal(jeu.el('inventairelist').children.length, 4);
  });
});
