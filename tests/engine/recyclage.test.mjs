import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { creerObjet } from '../../dist/engine/equipement.js';
import { recycler, ameliorer, orRecyclage, coutAmelioration, confirmationRequise } from '../../dist/engine/inventaire.js';
import { fresh, attack } from '../../dist/engine/state.js';
import { parseSave } from '../../dist/engine/save.js';
import { RECYCLE_GOLD_BASE, EQUIPMENT_UPGRADE_MAX, COST_GROWTH, EQUIPMENT_UPGRADE_BASE_COST, EQUIPMENT_UPGRADE_STAT, LOOT_CONVERSION_GOLD } from '../../dist/engine/balance.js';

const etat = (inventaire, equipe = {}, gold = 0) => ({ ...fresh(0), inventaire, equipe, gold });

test('recycler un commun : or selon rareté et niveau, objet retiré, sans confirmation', () => {
  const o = creerObjet('arme', 'commun', 1), n5 = creerObjet('arme', 'commun', 5);
  const r = recycler(etat([o, n5], {}, 10), o);
  assert.equal(r.ok, true);
  assert.equal(r.or, RECYCLE_GOLD_BASE.commun);
  assert.equal(r.s.gold, 10 + RECYCLE_GOLD_BASE.commun);
  assert.deepEqual(r.s.inventaire, [n5]);
  assert.ok(orRecyclage(n5) > orRecyclage(o), 'le niveau d’objet augmente le gain');
});

test('rare et épique : refus sans confirmation, état inchangé ; accepté avec', () => {
  for (const rarete of ['rare', 'epique']) {
    const o = creerObjet('armure', rarete, 2), s = etat([o]);
    assert.equal(confirmationRequise(o), true);
    const refus = recycler(s, o);
    assert.deepEqual([refus.ok, refus.motif, refus.s], [false, 'confirmation', s]);
    assert.equal(recycler(s, o, { confirme: true }).ok, true);
  }
});

test('le recyclage ne rapporte jamais moins que la conversion automatique', () => {
  for (const rarete of Object.keys(LOOT_CONVERSION_GOLD)) for (let niveau = 1; niveau <= 10; niveau++)
    assert.ok(orRecyclage(creerObjet('arme', rarete, niveau)) >= LOOT_CONVERSION_GOLD[rarete], `${rarete} niveau ${niveau}`);
});

test('un commun amélioré demande confirmation, puis part', () => {
  const o = creerObjet('arme', 'commun', 1, 1), s = etat([o]);
  assert.equal(confirmationRequise(o), true);
  const refus = recycler(s, o);
  assert.deepEqual([refus.ok, refus.motif, refus.s], [false, 'confirmation', s]);
  assert.equal(recycler(s, o, { confirme: true }).ok, true);
});

test('un objet équipé ne se recycle pas, même confirmé', () => {
  const o = creerObjet('arme', 'commun', 1), s = etat([], { arme: o });
  const r = recycler(s, o, { confirme: true });
  assert.deepEqual([r.ok, r.motif], [false, 'equipe']);
  assert.equal(r.s.equipe.arme, o);
});

test('améliorer : coût croissant, bonus par niveau, plafond +5', () => {
  let s = etat([creerObjet('arme', 'rare', 1)], {}, 1e6);
  let o = s.inventaire[0];
  const base = o.bonus.attaque;
  assert.equal(coutAmelioration(o), EQUIPMENT_UPGRADE_BASE_COST.rare);
  for (let n = 1; n <= EQUIPMENT_UPGRADE_MAX; n++) {
    const cout = Math.floor(EQUIPMENT_UPGRADE_BASE_COST.rare * COST_GROWTH ** (n - 1));
    const r = ameliorer(s, o);
    assert.equal(r.ok, true);
    assert.equal(r.cout, cout);
    assert.equal(r.s.gold, s.gold - cout);
    assert.equal(r.objet.amelioration, n);
    assert.equal(r.objet.bonus.attaque, base + n * EQUIPMENT_UPGRADE_STAT.attaque);
    s = r.s; o = r.objet;
    assert.equal(s.inventaire[0], o);
  }
  const max = ameliorer(s, o);
  assert.deepEqual([max.ok, max.motif], [false, 'max']);
});

test('améliorer un objet équipé change les statistiques du héros', () => {
  const o = creerObjet('arme', 'commun', 1), s = etat([], { arme: o }, 100);
  const r = ameliorer(s, o);
  assert.equal(r.ok, true);
  assert.equal(attack(r.s), attack(s) + 1);
  assert.equal(r.s.equipe.arme, r.objet);
});

test('fonds insuffisants : refus clair, rien ne change', () => {
  const o = creerObjet('arme', 'epique', 1), s = etat([o], {}, coutAmelioration(o) - 1);
  const r = ameliorer(s, o);
  assert.deepEqual([r.ok, r.motif, r.cout, r.s], [false, 'fonds', coutAmelioration(o), s]);
});

test('persistance : le niveau d’amélioration est relu ; absent → +0 ; invalide → réparé', () => {
  const NOW = 2_000_000;
  const base = { version: 3, ...fresh(NOW - 10), guide: 'done', vus: [] };
  const o = creerObjet('charme', 'commun', 1), s = etat([o], {}, 100), r = ameliorer(s, o);
  const relu = parseSave(JSON.stringify({ ...base, inventaire: r.s.inventaire }), NOW);
  assert.equal(relu.s.inventaire[0].amelioration, 1);
  assert.deepEqual(relu.s.inventaire[0].bonus, r.objet.bonus);
  const ancien = { emplacement: 'charme', rarete: 'commun', niveau: 1, bonus: { or: 2 } };
  assert.equal(parseSave(JSON.stringify({ ...base, inventaire: [ancien] }), NOW).s.inventaire[0].amelioration, 0);
  const faux = parseSave(JSON.stringify({ ...base, inventaire: [{ ...ancien, amelioration: 9 }] }), NOW);
  assert.deepEqual(faux.s.inventaire, []);
});

// --- Panneau
const BASE = { version: 3, gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'] };
const avecJeu = async (stock, scenario) => { const jeu = await lancerJeu({ stockageV2: stock }); try { await scenario(jeu); } finally { jeu.fermer(); } };
const choisir = (jeu, i) => { jeu.clic('inventaire'); jeu.el('inventairelist').children[i].onclick(); };

test('panneau : recycler un rare demande confirmation ; Annuler / Échap ne changent rien, Recycler paie', () => {
  const rare = creerObjet('armure', 'rare', 3);
  return avecJeu({ ...BASE, inventaire: [rare], equipe: {} }, jeu => {
    choisir(jeu, 3);
    jeu.clic('recycler');
    assert.equal(jeu.el('recycleconfirm').open, true);
    assert.equal(jeu.actif(), jeu.el('recyclenon'), 'focus sur Annuler');
    assert.equal(jeu.stockage().inventaire.length, 1);
    jeu.echap();
    assert.equal(jeu.el('recycleconfirm').open, false);
    assert.equal(jeu.stockage().inventaire.length, 1);
    jeu.clic('recycler');
    jeu.clic('recyclenon');
    assert.equal(jeu.stockage().gold, 0);
    jeu.clic('recycler');
    jeu.clic('recycleok');
    assert.equal(jeu.stockage().inventaire.length, 0);
    assert.equal(jeu.stockage().gold, orRecyclage(rare));
  });
});

test('panneau : un commun amélioré ouvre la boîte, avec son niveau', () => {
  const o = creerObjet('arme', 'commun', 1, 1);
  return avecJeu({ ...BASE, inventaire: [o], equipe: {} }, jeu => {
    choisir(jeu, 3);
    jeu.clic('recycler');
    assert.equal(jeu.el('recycleconfirm').open, true);
    assert.match(jeu.texte('recycletexte'), /amélioré \+1/);
    assert.equal(jeu.stockage().inventaire.length, 1);
  });
});

test('panneau : commun recyclé sans boîte ; équipé refusé avec message', () => {
  const c = creerObjet('arme', 'commun', 1), e = creerObjet('arme', 'commun', 1);
  return avecJeu({ ...BASE, inventaire: [c], equipe: { arme: e } }, jeu => {
    choisir(jeu, 3);
    jeu.clic('recycler');
    assert.equal(jeu.el('recycleconfirm').open, false);
    assert.equal(jeu.stockage().inventaire.length, 0);
    assert.equal(jeu.stockage().gold, orRecyclage(c));
    jeu.el('inventairelist').children[0].onclick();
    jeu.clic('recycler');
    assert.match(jeu.texte('inventairemsg'), /Retire d’abord/);
    assert.ok(jeu.stockage().equipe.arme);
  });
});

test('panneau : améliorer dépense l’or, refus clair sans fonds, persiste après rechargement', async () => {
  const o = creerObjet('arme', 'commun', 1);
  await avecJeu({ ...BASE, gold: 5, inventaire: [o], equipe: {} }, jeu => {
    choisir(jeu, 3);
    jeu.clic('ameliorer');
    assert.match(jeu.texte('inventairemsg'), /Pas assez d’or/);
    assert.equal(jeu.stockage().inventaire[0].amelioration, 0);
  });
  await avecJeu({ ...BASE, gold: 100, inventaire: [o], equipe: {} }, jeu => {
    choisir(jeu, 3);
    jeu.clic('ameliorer');
    const s = jeu.stockage();
    assert.equal(s.inventaire[0].amelioration, 1);
    assert.equal(s.gold, 100 - coutAmelioration(o));
  });
});
