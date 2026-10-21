import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { SUCCES_IDS, verifierSucces, etatSucces } from '../../dist/engine/succes.js';
import { BESTIAIRE_IDS } from '../../dist/engine/bestiaire.js';
import { RECIT_IDS } from '../../dist/engine/recits.js';
import { creerObjet } from '../../dist/engine/equipement.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { restoreFight } from '../../dist/engine/combat.js';

const obtenus = s => { const ev = []; const r = verifierSucces(s, ev); return { s: r, ev, ids: r.succes }; };
const avec = (ids, mod) => ({ ...fresh(0), ...mod });

test('état neuf : aucun succès, 9 lignes à l’interface', () => {
  assert.deepEqual(obtenus(fresh(0)).ids, []);
  assert.equal(etatSucces(fresh(0)).length, 9);
});

for (const [id, seuil] of [['etage25', 25], ['etage50', 50], ['etage100', 100]]) {
  test(`${id} : juste en dessous non, au seuil oui`, () => {
    assert.ok(!obtenus({ ...fresh(0), meilleurEtage: seuil - 1 }).ids.includes(id));
    assert.ok(obtenus({ ...fresh(0), meilleurEtage: seuil }).ids.includes(id));
  });
}

test('bestiaire : toutes les entrées vues', () => {
  const s = fresh(0), tout = Object.fromEntries(BESTIAIRE_IDS.map(id => [id, { vus: true, victoires: 0 }]));
  assert.ok(!obtenus(s).ids.includes('bestiaire'));
  assert.ok(!obtenus({ ...s, bestiaire: { ...tout, [BESTIAIRE_IDS[0]]: { vus: false, victoires: 0 } } }).ids.includes('bestiaire'));
  assert.ok(obtenus({ ...s, bestiaire: tout }).ids.includes('bestiaire'));
});

test('chasseur : 499 victoires non, 500 oui (somme du bestiaire)', () => {
  const s = fresh(0), b = n => ({ ...s.bestiaire, pillard: { vus: true, victoires: n }, 'gardien:foret': { vus: true, victoires: 250 } });
  assert.ok(!obtenus({ ...s, bestiaire: b(249) }).ids.includes('chasseur'));
  assert.ok(obtenus({ ...s, bestiaire: b(250) }).ids.includes('chasseur'));
});

test('objectifs : les 6 faits requis', () => {
  const s = fresh(0), o = (n) => Object.fromEntries(Object.entries(s.objectifs).map(([z, v], i) => [z, { ...v, faits: i === 0 && n === 5 ? ['chasse'] : ['chasse', 'gardien'] }]));
  assert.ok(!obtenus({ ...s, objectifs: o(5) }).ids.includes('objectifs'));
  assert.ok(obtenus({ ...s, objectifs: o(6) }).ids.includes('objectifs'));
});

test('recits : les 4 lus', () => {
  assert.ok(!obtenus({ ...fresh(0), recitsLus: RECIT_IDS.slice(1) }).ids.includes('recits'));
  assert.ok(obtenus({ ...fresh(0), recitsLus: RECIT_IDS }).ids.includes('recits'));
});

test('epique : seul un épique équipé compte (pas en inventaire, pas un rare)', () => {
  const epee = creerObjet('arme', 'epique', 3);
  assert.ok(!obtenus({ ...fresh(0), inventaire: [epee] }).ids.includes('epique'));
  assert.ok(!obtenus({ ...fresh(0), equipe: { arme: creerObjet('arme', 'rare', 3) } }).ids.includes('epique'));
  assert.ok(obtenus({ ...fresh(0), equipe: { arme: epee } }).ids.includes('epique'));
});

test('talents : 4 points non, 5 oui', () => {
  assert.ok(!obtenus({ ...fresh(0), talents: { braise: 4 } }).ids.includes('talents'));
  assert.ok(obtenus({ ...fresh(0), talents: { braise: 5 } }).ids.includes('talents'));
});

test('un succès n’est annoncé qu’une fois, sans or', () => {
  const s0 = { ...fresh(0), meilleurEtage: 25, gold: 77 };
  const a = obtenus(s0);
  assert.deepEqual(a.ev, [{ type: 'succes', id: 'etage25', libelle: 'Atteindre l’étage 25' }]);
  assert.equal(a.s.gold, 77);
  const b = obtenus(a.s);
  assert.deepEqual(b.ev, []);
  assert.equal(b.s, a.s);
});

test('un succès obtenu reste obtenu même si la condition retombe', () => {
  const s = { ...fresh(0), succes: ['epique'] };
  assert.deepEqual(obtenus(s).ids, ['epique']);
});

test('etatSucces : progrès chiffré, borné, 0/1 pour l’épique', () => {
  const e = id => etatSucces({ ...fresh(0), meilleurEtage: 30 }).find(x => x.id === id);
  assert.deepEqual([e('etage25').progres, e('etage25').cible, e('etage50').progres, e('epique').cible], [25, 25, 30, 1]);
  assert.equal(e('etage25').obtenu, false);
  assert.ok(SUCCES_IDS.every(id => e(id)));
});

test('l’absence ne touche pas aux succès', () => {
  const s = { ...fresh(0), level: 5, meilleurEtage: 3, last: 0 };
  const r = offlineGains(s, 8 * 3600 * 1000, restoreFight(s, {}), { paused: false });
  assert.deepEqual(r.s.succes, s.succes);
  assert.ok(!r.events.some(e => e.type === 'succes'));
});
