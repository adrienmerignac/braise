import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { offlineGains, OFFLINE_CAP_SECONDS, OFFLINE_FIGHT_FACTOR } from '../../dist/engine/offline.js';
import { enemyMaxHP, heroDamage } from '../../dist/engine/combat.js';

const T0 = 1_700_000_000_000;
const apres = secondes => T0 + secondes * 1000;

test('même durée, même gain, quel que soit le point d’entrée', () => {
  const a = offlineGains(fresh(T0), apres(600));
  const b = offlineGains({ ...fresh(T0), gold: 0 }, apres(600));
  assert.equal(a.wins, b.wins);
  assert.equal(a.gold, b.gold);
  assert.ok(a.wins > 0 && a.show);
  assert.equal(a.s.gold, a.gold);
});

test('1 h d’absence : moitié moins de victoires qu’avec l’ancien facteur 1,2 (arrondi bas)', () => {
  const s = fresh(T0), ANCIEN_FACTEUR = 1.2;
  const coups = Math.ceil(enemyMaxHP(s, false) / heroDamage(s, false));
  const ancien = Math.floor(3600 / (coups * ANCIEN_FACTEUR));
  assert.equal(OFFLINE_FIGHT_FACTOR, 2.4);
  assert.equal(offlineGains(s, apres(3600)).wins, Math.floor(ancien / 2));
});

test('plafond de 8 h', () => {
  const huit = offlineGains(fresh(T0), apres(OFFLINE_CAP_SECONDS));
  const semaine = offlineGains(fresh(T0), apres(7 * 86400));
  assert.equal(semaine.gold, huit.gold);
  assert.equal(semaine.away, OFFLINE_CAP_SECONDS);
});

test('seuil du panneau : 60 s ne donne rien, 61 s oui', () => {
  const court = offlineGains(fresh(T0), apres(60));
  assert.equal(court.show, false);
  assert.equal(court.gold, 0);
  assert.equal(offlineGains(fresh(T0), apres(61)).show, true);
});

test('horloge reculée : ni gain négatif ni gain énorme, last ramené à now', () => {
  const r = offlineGains({ ...fresh(T0), last: apres(3600) }, T0);
  assert.equal(r.gold, 0);
  assert.equal(r.show, false);
  assert.equal(r.s.last, T0);
  const suite = offlineGains(r.s, apres(30));
  assert.equal(suite.gold, 0);
});

test('last invalide (NaN) : aucun gain', () => {
  const r = offlineGains({ ...fresh(T0), last: NaN }, apres(5000));
  assert.equal(r.gold, 0);
});

test('double rechargement immédiat : une seule collecte', () => {
  const premier = offlineGains(fresh(T0), apres(3600));
  const second = offlineGains(premier.s, apres(3601));
  assert.ok(premier.gold > 0);
  assert.equal(second.gold, 0);
  assert.equal(second.show, false);
  assert.equal(second.s.gold, premier.s.gold);
});

test('onglet masqué puis visible = même gain qu’un rechargement après la même durée', () => {
  const masque = fresh(T0);
  const visible = offlineGains(masque, apres(1800));
  const rechargement = offlineGains(masque, apres(1800));
  assert.deepEqual(visible.s, rechargement.s);
  const encore = offlineGains(visible.s, apres(1800));
  assert.equal(encore.gold, 0);
});

test('l’expérience hors ligne peut faire monter de niveau', () => {
  const r = offlineGains(fresh(T0), apres(OFFLINE_CAP_SECONDS));
  assert.ok(r.s.level > 1);
  assert.ok(r.events.some(e => e.type === 'levelup'));
});

test('l’état d’entrée n’est pas modifié', () => {
  const s = fresh(T0);
  const copie = { ...s };
  offlineGains(s, apres(900));
  assert.deepEqual(s, copie);
});

test('en pause : 30 min d’absence ne donnent rien et `last` passe à now', () => {
  const s = fresh(T0);
  const r = offlineGains(s, apres(1800), undefined, { paused: true });
  assert.equal(r.gold, 0);
  assert.equal(r.wins, 0);
  assert.equal(r.show, false);
  assert.equal(r.s.last, apres(1800));
  assert.equal(r.s.gold, s.gold);
  assert.equal(offlineGains(r.s, apres(1801)).gold, 0);
});

test('absence dans les ruines : même nombre d’objets qu’en forêt, armures en tête', () => {
  const sur = zone => offlineGains({ ...fresh(T0), zone, stage: 6 }, apres(OFFLINE_CAP_SECONDS));
  const ruines = sur('ruines');
  assert.equal(ruines.butin.length, sur('foret').butin.length);
  const nb = e => ruines.butin.filter(o => o.emplacement === e).length;
  assert.equal(nb('armure'), 3); // 3 sur 6 (motif de 4 : prédilection, autre, prédilection, autre) : plus que chaque autre emplacement
  assert.ok(nb('armure') > nb('arme') && nb('armure') > nb('charme'));
});
