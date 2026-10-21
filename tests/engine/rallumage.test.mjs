import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, attack, maxHP, reward, multRallumage } from '../../dist/engine/state.js';
import { rallumageDisponible, apercuRallumage, rallumer } from '../../dist/engine/rallumage.js';
import { estDebloque } from '../../dist/engine/automatismes.js';
import { creerObjet } from '../../dist/engine/equipement.js';

const NOW = 5_000;
const partie = (etage, extra = {}) => ({
  ...fresh(1), gold: 18340, xp: 120, level: 41, stage: etage, zone: 'cryptes', meilleurEtage: etage, kills: 3, weapon: 7, armor: 5, luck: 2,
  talents: { assaut: 2 }, inventaire: [creerObjet('arme', 'commun', 3), creerObjet('charme', 'rare', 5)], equipe: { armure: creerObjet('armure', 'commun', 2) },
  objectifs: { ...fresh(1).objectifs }, recitsLus: ['foret'], succes: ['x'], automatismes: { gardien: true, achat: true }, ...extra,
});
const sansChangement = (s, r, motif) => { assert.equal(r.ok, false); assert.equal(r.motif, motif); assert.equal(r.s, s); };

test('refus avant le gardien 15 et sans confirmation, état inchangé', () => {
  for (const e of [1, 15]) { const s = partie(e); assert.equal(rallumageDisponible(s), false); sansChangement(s, rallumer(s, NOW, { confirme: true }), 'indisponible'); }
  const s = partie(16);
  assert.equal(rallumageDisponible(s), true);
  sansChangement(s, rallumer(s, NOW), 'confirmation');
  sansChangement(s, rallumer(s, NOW, { confirme: false }), 'confirmation');
});

test('gain d’éclats : 16 → 1, 20 → 2, 50 → 8, 100 → 18', () => {
  for (const [e, n] of [[16, 1], [20, 2], [50, 8], [100, 18]]) assert.equal(rallumer(partie(e), NOW, { confirme: true }).s.rallumage.eclats, n);
});

test('étage 50 : 8 éclats, remis à zéro et conservé comme listé, aperçu = résultat', () => {
  const s = partie(50, { rallumage: { eclats: 0, nombre: 0, record: 1 } });
  const ap = apercuRallumage(s);
  const r = rallumer(s, NOW, { confirme: true });
  assert.equal(r.ok, true);
  assert.equal(ap.disponible, true);
  assert.equal(ap.eclatsGagnes, r.eclats);
  assert.equal(ap.eclatsApres, r.s.rallumage.eclats);
  assert.equal(ap.eclatsApres, 8);
  assert.ok(Math.abs(ap.bonusApres - 0.6) < 1e-9 && ap.bonusAvant === 0);
  const neuf = fresh(NOW);
  for (const k of ['gold', 'xp', 'level', 'stage', 'zone', 'meilleurEtage', 'kills', 'weapon', 'armor', 'luck', 'last', 'talents', 'inventaire', 'equipe']) assert.deepEqual(r.s[k], neuf[k], k);
  assert.deepEqual(r.s.rallumage, { eclats: 8, nombre: 1, record: 50 });
  for (const k of ['objectifs', 'recitsLus', 'bestiaire', 'succes', 'automatismes']) assert.deepEqual(r.s[k], s[k], k);
  assert.equal(r.f.hp, maxHP(r.s));
  assert.ok(ap.remisAZero.includes('18 340 or') || ap.remisAZero.some(l => l.startsWith('18') && l.endsWith(' or')));
  assert.ok(ap.remisAZero.includes('Niveau 41'));
  assert.ok(ap.remisAZero.some(l => l.startsWith('2 objets de l’inventaire et 1 objet équipé')));
  assert.ok(ap.conserve.length > 0);
});

test('effet permanent : héros neuf ×1,6 avec 8 éclats (+7,5 % par éclat) ; deux rallumages cumulent', () => {
  const base = fresh(NOW);
  const un = rallumer(partie(50), NOW, { confirme: true }).s;
  assert.equal(attack(un), Math.round(attack(base) * 1.6));
  assert.equal(maxHP(un), Math.round(maxHP(base) * 1.6));
  assert.equal(reward(un), Math.round(reward(base) * 1.6));
  const deux = rallumer({ ...un, stage: 20, meilleurEtage: 20 }, NOW, { confirme: true }).s;
  assert.deepEqual(deux.rallumage, { eclats: 10, nombre: 2, record: 50 });
  assert.equal(apercuRallumage({ ...un, stage: 20, meilleurEtage: 20 }).eclatsApres, 10);
});

test('automatismes débloqués restent débloqués après rallumage', () => {
  const r = rallumer(partie(20), NOW, { confirme: true }).s;
  assert.equal(r.meilleurEtage, 1);
  assert.equal(estDebloque(r, 'gardien'), true);
  assert.equal(estDebloque(r, 'achat'), true);
  assert.equal(estDebloque(fresh(NOW), 'gardien'), false);
});

test('bonus de 7,5 % par éclat : multiplicateur appliqué = aperçu, pour N éclats', () => {
  for (const n of [1, 2, 8, 20]) {
    const s = partie(50, { rallumage: { eclats: n, nombre: 1, record: 50 } });
    assert.ok(Math.abs(multRallumage(s) - (1 + 0.075 * n)) < 1e-9, `${n} éclats`);
    const ap = apercuRallumage({ ...s, meilleurEtage: 1 });
    assert.ok(Math.abs(ap.bonusAvant - 0.075 * n) < 1e-9, `aperçu avant, ${n} éclats`);
    assert.equal(attack({ ...fresh(NOW), rallumage: s.rallumage }), Math.round(attack(fresh(NOW)) * multRallumage(s)));
  }
});
