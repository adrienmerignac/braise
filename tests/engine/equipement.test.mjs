import test from 'node:test';
import assert from 'node:assert/strict';
import { tirerButin, bonusEquipement, creerObjet } from '../../dist/engine/equipement.js';
import { attack, maxHP, reward, fresh } from '../../dist/engine/state.js';
import { retaliation } from '../../dist/engine/combat.js';

const suite = (...v) => { let i = 0; return () => v[i++ % v.length]; };
function lcg(seed) { let x = seed; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }

test('tirage déterministe pour un même rng', () => {
  const a = tirerButin({ ennemi: 'x', etape: 3, rng: lcg(7) });
  const b = tirerButin({ ennemi: 'x', etape: 3, rng: lcg(7) });
  assert.deepEqual(a, b);
});

test('ordinaire : seuil de drop à 12 % et répartition 75/22/3', () => {
  assert.deepEqual(tirerButin({ ennemi: 'x', etape: 1, rng: suite(0.12) }), []);
  const r = rar => tirerButin({ ennemi: 'x', etape: 1, rng: suite(0.05, rar, 0) })[0]?.rarete;
  assert.equal(r(0.74), 'commun');
  assert.equal(r(0.76), 'rare');
  assert.equal(r(0.96), 'rare');
  assert.equal(r(0.98), 'epique');
});

test('fréquences observées proches des chances annoncées', () => {
  const rng = lcg(42), n = 100000, c = { commun: 0, rare: 0, epique: 0 };
  let drops = 0;
  for (let i = 0; i < n; i++) for (const o of tirerButin({ ennemi: 'x', etape: 1, rng })) { drops++; c[o.rarete]++; }
  assert.ok(Math.abs(drops / n - 0.12) < 0.006);
  assert.ok(Math.abs(c.commun / drops - 0.75) < 0.02);
  assert.ok(Math.abs(c.epique / drops - 0.03) < 0.01);
});

test('gardien : jamais sans objet rare ou mieux, épique possible', () => {
  const rng = lcg(3), vus = new Set();
  for (let i = 0; i < 2000; i++) {
    const [o, ...reste] = tirerButin({ ennemi: { boss: true }, etape: 2, rng });
    assert.equal(reste.length, 0);
    assert.ok(['rare', 'epique'].includes(o.rarete));
    vus.add(o.rarete);
  }
  assert.equal(vus.size, 2);
});

test('niveau d’objet = étape, bonus croissants avec rareté et niveau', () => {
  const [o] = tirerButin({ ennemi: 'gardien', etape: 5, rng: lcg(1) });
  assert.equal(o.niveau, 5);
  const v = r => creerObjet('arme', r, 4).bonus.attaque;
  assert.ok(v('commun') < v('rare') && v('rare') < v('epique'));
  assert.ok(creerObjet('arme', 'rare', 1).bonus.attaque < creerObjet('arme', 'rare', 9).bonus.attaque);
});

test('bonus nuls sans équipement, somme avec', () => {
  const nul = { attaque: 0, vieMax: 0, reductionRiposte: 0, or: 0 };
  assert.deepEqual(bonusEquipement(undefined), nul);
  assert.deepEqual(bonusEquipement({}), nul);
  const e = { arme: creerObjet('arme', 'commun', 1), armure: creerObjet('armure', 'commun', 1), charme: creerObjet('charme', 'commun', 1) };
  assert.deepEqual(bonusEquipement(e), { attaque: 3, vieMax: 20, reductionRiposte: 1, or: 2 });
});

test('statistiques : identiques sans objet, additionnées avec', () => {
  const s = { ...fresh(0), weapon: 2, armor: 1, luck: 1, level: 3, stage: 4 };
  const base = [attack(s), maxHP(s), reward(s), retaliation(s, false)];
  assert.deepEqual([attack({ ...s, equipe: {} }), maxHP({ ...s, equipe: {} }), reward({ ...s, equipe: {} }), retaliation({ ...s, equipe: {} }, false)], base);
  const equipe = { arme: creerObjet('arme', 'commun', 1), armure: creerObjet('armure', 'commun', 1), charme: creerObjet('charme', 'commun', 1) };
  const t = { ...s, equipe };
  assert.equal(attack(t), base[0] + 3);
  assert.equal(maxHP(t), base[1] + 20);
  assert.equal(reward(t), base[2] + 2);
  assert.equal(retaliation(t, false), Math.max(1, base[3] - 1));
});
