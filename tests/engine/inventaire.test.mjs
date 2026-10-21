import test from 'node:test';
import assert from 'node:assert/strict';
import { creerObjet } from '../../dist/engine/equipement.js';
import { equiper, desequiper, comparer, signe } from '../../dist/engine/inventaire.js';
import { fresh, attack, maxHP } from '../../dist/engine/state.js';
import { INVENTORY_CAP } from '../../dist/engine/balance.js';

const base = (inventaire, equipe = {}) => ({ ...fresh(0), inventaire, equipe });

test('équiper : l’objet quitte l’inventaire et les statistiques l’intègrent', () => {
  const epee = creerObjet('arme', 'rare', 3);
  const avant = base([epee]);
  const r = equiper(avant, epee);
  assert.equal(r.ok, true);
  assert.equal(r.s.equipe.arme, epee);
  assert.deepEqual(r.s.inventaire, []);
  assert.equal(attack(r.s), attack(avant) + epee.bonus.attaque);
  assert.deepEqual(avant.inventaire, [epee], 'l’état d’origine n’est pas modifié');
});

test('échange : l’objet remplacé retourne dans l’inventaire, sans doublon ni perte', () => {
  const vieille = creerObjet('arme', 'commun', 1), neuve = creerObjet('arme', 'epique', 5), casque = creerObjet('armure', 'commun', 1);
  const r = equiper(base([casque, neuve], { arme: vieille }), neuve);
  assert.equal(r.s.equipe.arme, neuve);
  assert.equal(r.remplace, vieille);
  assert.deepEqual(r.s.inventaire, [casque, vieille]);
});

test('équiper un objet absent de l’inventaire est refusé', () => {
  const r = equiper(base([]), creerObjet('arme', 'commun', 1));
  assert.equal(r.ok, false);
});

test('déséquiper : l’objet revient dans l’inventaire et le bonus disparaît', () => {
  const charme = creerObjet('charme', 'rare', 2);
  const avant = base([], { charme });
  const r = desequiper(avant, 'charme');
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.inventaire, [charme]);
  assert.equal(r.s.equipe.charme, undefined);
});

test('déséquiper : refusé si l’inventaire est plein, rien n’est perdu', () => {
  const charme = creerObjet('charme', 'rare', 2);
  const plein = Array.from({ length: INVENTORY_CAP }, () => creerObjet('arme', 'commun', 1));
  const r = desequiper(base(plein, { charme }), 'charme');
  assert.equal(r.ok, false);
  assert.equal(r.motif, 'plein');
  assert.equal(r.s.equipe.charme, charme);
  assert.equal(desequiper(base([]), 'arme').motif, 'vide');
});

test('comparaison : delta signé attaque, vie max et or, remplaçant un objet équipé', () => {
  const actuelle = creerObjet('arme', 'commun', 1), meilleure = creerObjet('arme', 'epique', 5);
  const s = base([meilleure], { arme: actuelle });
  const [att, vie, or] = comparer(s, meilleure);
  assert.equal(att.delta, meilleure.bonus.attaque - actuelle.bonus.attaque);
  assert.equal(att.avant, attack(s));
  assert.equal(att.apres, attack(s) + att.delta);
  assert.equal(vie.delta, 0);
  assert.equal(or.delta, 0);
  const armure = creerObjet('armure', 'rare', 2);
  assert.equal(comparer(base([armure]), armure)[1].delta, armure.bonus.vieMax);
  assert.equal(comparer(base([armure]), armure)[1].apres, maxHP(base([armure])) + armure.bonus.vieMax);
});

test('comparaison d’un objet déjà équipé : le retirer donne des deltas négatifs', () => {
  const epee = creerObjet('arme', 'rare', 3);
  assert.equal(comparer(base([], { arme: epee }), epee)[0].delta, -epee.bonus.attaque);
});

test('signe : plus, vrai moins et zéro', () => {
  assert.equal(signe(12), '+12');
  assert.equal(signe(-3), '−3');
  assert.equal(signe(0), '0');
});
