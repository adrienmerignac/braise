import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, writeSave, serializeSave, importSave, migrate } from '../../dist/engine/save.js';
import { fresh, SAVE_KEY, BACKUP_KEY, SAVE_VERSION } from '../../dist/engine/state.js';
import { objectifsNeufs } from '../../dist/engine/objectifs.js';
import { creerObjet } from '../../dist/engine/equipement.js';
import { INVENTORY_CAP } from '../../dist/engine/balance.js';

const NOW = 1_700_000_000_000;
const base = { gold: 120, xp: 5, level: 3, stage: 4, zone: 'foret', meilleurEtage: 4, kills: 2, weapon: 1, armor: 2, luck: 0, last: NOW - 1000 };
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });
const epee = creerObjet('arme', 'rare', 4);
const cuirasse = creerObjet('armure', 'commun', 2);
const charme = creerObjet('charme', 'epique', 7);
const avecObjets = { ...base, inventaire: [cuirasse, charme], equipe: { arme: epee }, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise'] };

test('schéma : la version courante est la 7', () => assert.equal(SAVE_VERSION, 7));

test('partie v2 existante : rechargée à l’identique, inventaire vide, rien d’équipé, aucune réparation', () => {
  const r = parseSave(JSON.stringify({ version: 2, ...base, guide: 'todo', vus: [] }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s, { ...base, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise'] });
  assert.equal(r.guide, 'todo');
});

test('partie v1 (sans version) : migrée jusqu’à la v4 avec les défauts', () => {
  assert.deepEqual(migrate(base), { ...base, version: 7, inventaire: [], equipe: {}, talents: {}, objectifs: objectifsNeufs(), recitsLus: ['braise'] });
  const r = parseSave(JSON.stringify(base), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.s.inventaire, r.s.equipe], [[], {}]);
});

test('loadSave : une partie v2 stockée est reprise puis réécrite en v4 sans perte', () => {
  const st = mem({ [SAVE_KEY]: JSON.stringify({ version: 2, ...base }) });
  const l = loadSave(st, NOW);
  assert.equal(l.status, 'ok');
  assert.equal(l.s.gold, 120);
  assert.equal(writeSave(st, l.s, undefined, l.guide, l.vus, l.audio, l.affichage), true);
  const ecrit = JSON.parse(st.data[SAVE_KEY]);
  assert.equal(ecrit.version, 7);
  assert.deepEqual([ecrit.inventaire, ecrit.equipe, ecrit.gold], [[], {}, 120]);
});

test('aller-retour sauvegarde/chargement avec objets', () => {
  const st = mem();
  assert.equal(writeSave(st, avecObjets, undefined, 'done', [], undefined, undefined), true);
  const l = loadSave(st, NOW);
  assert.equal(l.status, 'ok');
  assert.deepEqual(l.s.inventaire, [cuirasse, charme]);
  assert.deepEqual(l.s.equipe, { arme: epee });
});

test('export/import : les objets sont couverts', () => {
  const r = importSave(serializeSave(avecObjets), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.inventaire, [cuirasse, charme]);
  assert.deepEqual(r.s.equipe, { arme: epee });
  assert.equal(serializeSave(r.s), serializeSave(avecObjets));
});

test('fichier d’une version plus récente : toujours refusé, sauvegarde non écrasée', () => {
  const futur = JSON.stringify({ version: 8, ...avecObjets });
  assert.deepEqual(importSave(futur, NOW), { ok: false, motif: 'future' });
  const st = mem({ [SAVE_KEY]: futur });
  assert.equal(writeSave(st, fresh(NOW)), false);
  assert.equal(st.data[SAVE_KEY], futur);
});

const parse = extra => parseSave(JSON.stringify({ version: 3, ...base, ...extra }), NOW);

test('objets invalides dans l’inventaire : écartés, valides conservés, partie réparée', () => {
  const mauvais = [
    null, 'x', 7, [], {},
    { ...cuirasse, emplacement: 'casque' },
    { ...cuirasse, rarete: 'legendaire' },
    { ...cuirasse, niveau: 0 }, { ...cuirasse, niveau: 1.5 }, { ...cuirasse, niveau: null }, { ...cuirasse, niveau: 1e999 },
    { ...cuirasse, bonus: null }, { ...cuirasse, bonus: { vieMax: 'x', reductionRiposte: 1 } },
    { ...cuirasse, bonus: { vieMax: NaN, reductionRiposte: 1 } }, { ...cuirasse, bonus: { vieMax: 20 } },
    { ...cuirasse, id: {} },
  ];
  const r = parse({ inventaire: [charme, ...mauvais, cuirasse] });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.inventaire, [charme, cuirasse]);
});

test('objet normalisé : champs inconnus retirés, bonus étrangers à l’emplacement ignorés', () => {
  const r = parse({ inventaire: [{ ...charme, secret: 1, bonus: { or: charme.bonus.or, attaque: 999 } }] });
  assert.deepEqual(r.s.inventaire, [charme]);
});

test('JSON corrompu sur les nouveaux champs : défauts, sans crash, partie conservée', () => {
  for (const extra of [{ inventaire: 'x' }, { inventaire: { 0: charme } }, { inventaire: null }, { equipe: [] }, { equipe: 'x' }, { equipe: null }]) {
    const r = parse(extra);
    assert.equal(r.status, 'repaired', JSON.stringify(extra));
    assert.deepEqual([r.s.inventaire, r.s.equipe, r.s.gold], [[], {}, 120]);
  }
});

test('équipé : emplacement invalide, objet d’un autre emplacement ou invalide écartés', () => {
  const r = parse({ equipe: { arme: epee, casque: cuirasse, armure: epee, charme: { ...charme, rarete: 'x' } } });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.equipe, { arme: epee });
});

test('doublon d’identifiant : le second objet est écarté, y compris entre équipé et inventaire', () => {
  const a = { ...epee, id: 'a' }, b = { ...cuirasse, id: 'b' };
  const r = parse({ equipe: { arme: a }, inventaire: [b, { ...b }, { ...charme, id: 'a' }, charme, { ...charme }] });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.equipe, { arme: a });
  assert.deepEqual(r.s.inventaire, [b, charme, charme]);
});

test('plafond : l’inventaire est ramené à 24 objets, les premiers sont gardés', () => {
  const trop = Array.from({ length: INVENTORY_CAP + 6 }, (_, i) => ({ ...cuirasse, id: i }));
  const r = parse({ inventaire: trop });
  assert.equal(r.status, 'repaired');
  assert.equal(r.s.inventaire.length, INVENTORY_CAP);
  assert.equal(r.s.inventaire.at(-1).id, INVENTORY_CAP - 1);
  assert.equal(parse({ inventaire: trop.slice(0, INVENTORY_CAP) }).status, 'ok');
});

test('import : un inventaire corrompu est refusé comme tout champ réparé, la copie de secours reste intacte', () => {
  assert.equal(importSave(JSON.stringify({ version: 3, ...base, inventaire: 'x' }), NOW).ok, false);
  const brut = '{"version":3,"inventaire":';
  const st = mem({ [SAVE_KEY]: brut, [BACKUP_KEY]: 'ancienne' });
  const l = loadSave(st, NOW);
  assert.equal(l.status, 'reset');
  assert.equal(st.data[BACKUP_KEY], 'ancienne');
});
