// M5.1 : la simulation multi-jours est déterministe, et la progression suit le temps de jeu, jamais le framerate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulerJours, mulberry32, PROFILS, sessionsDuJour } from '../../tools/simulate-jours.mjs';
import { fresh } from '../../dist/engine/state.js';
import { newFight, strike } from '../../dist/engine/combat.js';
import { ATTACK_INTERVAL_MS } from '../../dist/engine/balance.js';
import { lancerJeu } from './horloge.mjs';

const T0 = 1_000_000, DIX_MINUTES = 600_000;

async function jouer(pas) {
  const aleatoire = Math.random;
  Math.random = mulberry32(7);
  const jeu = await lancerJeu({ debut: T0 });
  try {
    for (let ecoule = 0; ecoule < DIX_MINUTES; ecoule += pas) jeu.avancer(Math.min(pas, DIX_MINUTES - ecoule));
    return jeu.stockage();
  } finally { jeu.fermer(); Math.random = aleatoire; }
}

test('même graine, même résultat ; autre graine, autre butin', () => {
  for (const profil of PROFILS) {
    assert.deepEqual(simulerJours({ jours: 2, profil, graine: 3 }), simulerJours({ jours: 2, profil, graine: 3 }));
  }
  assert.notDeepEqual(simulerJours({ jours: 2, graine: 1 }), simulerJours({ jours: 2, graine: 2 }));
});

test('les deux profils jouent des sessions distinctes et progressent chaque jour', () => {
  assert.equal(sessionsDuJour('actif', 0).length, 96);
  assert.deepEqual(sessionsDuJour('occasionnel', 0).length + sessionsDuJour('occasionnel', 1).length, 5, '3 sessions un jour, 2 le suivant');
  for (const profil of PROFILS) {
    const { parJour, final } = simulerJours({ jours: 3, profil });
    assert.ok(parJour.every((j, i) => j.meilleurEtage >= (parJour[i - 1]?.meilleurEtage ?? 1) && j.orGagne > 0), profil);
    assert.ok(final.niveau > 1 && final.meilleurEtage > 5);
  }
});

test('hors ligne : le gain d’absence reste plafonné, l’or par jour ne s’emballe pas sur 3 jours', () => {
  const occasionnel = simulerJours({ jours: 1, profil: 'occasionnel' }), repos = simulerJours({ jours: 3, profil: 'occasionnel' });
  assert.ok(repos.final.orHorsLigne > occasionnel.final.orHorsLigne, 'le temps passé hors ligne rapporte');
  assert.ok(repos.parJour[2].orGagne < 1e9, 'chaque absence est plafonnée : pas d’emballement en or sur 3 jours');
});

test('le framerate ne change rien : 10 min de jeu en un bloc, en pas de 1 s ou de 16 ms donnent la même sauvegarde', async () => {
  const [bloc, seconde, image] = [await jouer(DIX_MINUTES), await jouer(1000), await jouer(16)];
  assert.ok(bloc.gold > 0 && bloc.level > 1, 'la partie a bien progressé');
  assert.deepEqual(seconde, bloc);
  assert.deepEqual(image, bloc);
});

test('la progression du jeu est celle du moteur : un coup par ATTACK_INTERVAL_MS, rien de plus', async () => {
  const sauvee = await jouer(1000);
  const aleatoire = mulberry32(7);
  let s = fresh(T0), f = newFight(s).f;
  for (let i = 0; i < DIX_MINUTES / ATTACK_INTERVAL_MS; i++) ({ s, f } = strike(s, f, 1, aleatoire));
  for (const cle of ['gold', 'xp', 'level', 'stage', 'kills', 'meilleurEtage']) assert.equal(sauvee[cle], s[cle], cle);
  assert.deepEqual(sauvee.inventaire, s.inventaire);
});
