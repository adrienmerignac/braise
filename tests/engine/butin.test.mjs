import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { strike } from '../../dist/engine/combat.js';
import { creerObjet, ajouterObjet, butinHorsLigne, tirerButin } from '../../dist/engine/equipement.js';
import { offlineGains, OFFLINE_CAP_SECONDS } from '../../dist/engine/offline.js';
import { annoncePour } from '../../dist/engine/annonces.js';
import { INVENTORY_CAP, LOOT_CONVERSION_GOLD, OFFLINE_LOOT_CAP } from '../../dist/engine/balance.js';

const T0 = 1_700_000_000_000;
const mort = { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 };
const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

test('victoire : le butin tiré entre dans l’inventaire sans s’équiper', () => {
  const r = strike(fresh(T0), mort, 1, seq(0, 0, 0)); // drop, commun, arme
  assert.equal(r.s.inventaire.length, 1);
  assert.deepEqual(r.s.equipe, {});
  const e = r.events.find(x => x.type === 'butin');
  assert.equal(e.objet.emplacement, 'arme');
  assert.match(annoncePour(e), /arme \(commun, niveau 1\)/i);
});

test('victoire sans drop, ou sans rng : inventaire inchangé', () => {
  assert.equal(strike(fresh(T0), mort, 1, () => 0.99).s.inventaire.length, 0);
  assert.equal(strike(fresh(T0), mort).s.inventaire.length, 0);
});

test('inventaire plein : le moins rare est converti en or, avec message', () => {
  const plein = Array.from({ length: INVENTORY_CAP }, (_, i) => creerObjet('arme', i === 3 ? 'commun' : 'rare', 1));
  const r = ajouterObjet({ ...fresh(T0), inventaire: plein }, creerObjet('charme', 'rare', 1));
  assert.equal(r.s.inventaire.length, INVENTORY_CAP);
  assert.equal(r.converti.objet.rarete, 'commun');
  assert.equal(r.s.gold, LOOT_CONVERSION_GOLD.commun);
  assert.ok(r.s.inventaire.includes(r.objet));
  const nouveau = ajouterObjet({ ...fresh(T0), inventaire: plein.map(o => ({ ...o, rarete: 'epique' })) }, creerObjet('arme', 'commun', 1));
  assert.equal(nouveau.converti.objet, nouveau.objet);
  assert.match(annoncePour({ type: 'butin', objet: r.objet, converti: r.converti }), /Inventaire plein/);
});

test('hors ligne : espérance arrondie bas, plafonnée, jamais d’épique', () => {
  assert.equal(butinHorsLigne(8, 1).length, 0);
  assert.equal(butinHorsLigne(9, 1).length, 1);
  const beaucoup = butinHorsLigne(10_000, 5);
  assert.equal(beaucoup.length, OFFLINE_LOOT_CAP);
  assert.ok(beaucoup.every(o => o.rarete !== 'epique' && o.niveau === 5));
});

test('absence : objets ajoutés à l’inventaire, non équipés, et pas de double collecte', () => {
  const a = offlineGains(fresh(T0), T0 + OFFLINE_CAP_SECONDS * 1000);
  assert.ok(a.butin.length > 0 && a.butin.length <= OFFLINE_LOOT_CAP);
  assert.equal(a.s.inventaire.length, a.butin.length);
  assert.deepEqual(a.s.equipe, {});
  const b = offlineGains(a.s, T0 + OFFLINE_CAP_SECONDS * 1000, a.f);
  assert.equal(b.butin.length, 0);
  assert.equal(b.s.inventaire.length, a.s.inventaire.length);
});

test('absence avec inventaire plein : conversion en or comptée dans s.gold', () => {
  const plein = Array.from({ length: INVENTORY_CAP }, () => creerObjet('arme', 'commun', 1));
  const a = offlineGains({ ...fresh(T0), inventaire: plein }, T0 + 8 * 3600 * 1000);
  assert.equal(a.s.inventaire.length, INVENTORY_CAP);
  assert.ok(a.convertis.length > 0);
  assert.equal(a.s.gold, a.gold + a.convertis.reduce((n, c) => n + c.or, 0));
});

// Butin par zone (M4.4)
const lcgZ = graine => () => (graine = (graine * 1664525 + 1013904223) % 4294967296) / 4294967296;

test('zone : la même valeur d’aléa donne l’arme en forêt et l’armure dans les ruines', () => {
  const tirer = zone => tirerButin({ ennemi: 'gardien', etape: 1, rng: seq(0, 0.4), zone })[0].emplacement;
  assert.equal(tirer('foret'), 'arme');
  assert.equal(tirer('ruines'), 'armure');
  assert.equal(tirer('cryptes'), 'armure');
  assert.equal(tirerButin({ ennemi: 'gardien', etape: 1, rng: seq(0, 0.9), zone: 'cryptes' })[0].emplacement, 'charme');
});

test('zone : zone inconnue ou absente → poids de la forêt', () => {
  for (const zone of ['inconnue', undefined]) assert.equal(tirerButin({ ennemi: 'gardien', etape: 1, rng: seq(0, 0.4), zone })[0].emplacement, 'arme');
});

test('zone : 3 000 tirages, 45 à 55 % d’emplacement de prédilection dans chaque zone', () => {
  for (const [zone, pref] of [['foret', 'arme'], ['ruines', 'armure'], ['cryptes', 'charme']]) {
    const rng = lcgZ(42);
    let n = 0;
    for (let i = 0; i < 3000; i++) if (tirerButin({ ennemi: 'gardien', etape: 1, rng, zone })[0].emplacement === pref) n++;
    assert.ok(n / 3000 >= 0.45 && n / 3000 <= 0.55, `${zone} : ${n / 3000}`);
  }
});

test('zone : un gardien vaincu dans les ruines tire avec les poids des ruines', () => {
  const s = { ...fresh(T0), zone: 'ruines', stage: 6 };
  const r = strike(s, { hp: 100, boss: true, enemyHP: 1, enemyMax: 1 }, 1, seq(0, 0.4));
  assert.equal(r.events.find(x => x.type === 'butin').objet.emplacement, 'armure');
});

test('hors ligne : la rotation suit la zone, mêmes raretés et même nombre', () => {
  const par = zone => butinHorsLigne(60, 1, zone);
  assert.deepEqual(par('foret').map(o => o.emplacement).slice(0, 4), ['arme', 'armure', 'arme', 'charme']);
  assert.deepEqual(par('ruines').map(o => o.emplacement).slice(0, 4), ['armure', 'arme', 'armure', 'charme']);
  assert.deepEqual(par('cryptes').map(o => o.emplacement).slice(0, 4), ['charme', 'arme', 'charme', 'armure']);
  assert.deepEqual(par('ruines').map(o => o.rarete), par('foret').map(o => o.rarete));
  assert.deepEqual(butinHorsLigne(60, 1), par('foret'));
});
