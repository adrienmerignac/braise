// M5.4a : le gardien automatique est une décision pure du pas de simulation, bornée par le déblocage, le danger et la pause.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { newFight, startBoss, assessGuardian } from '../../dist/engine/combat.js';
import { KILLS_PER_STAGE, AUTO_GARDIEN_DEBLOCAGE } from '../../dist/engine/balance.js';
import { basculerAutomatisme, doitLancerGardien, estDebloque } from '../../dist/engine/automatismes.js';
import { mulberry32 } from '../../tools/simulate-jours.mjs';
import { lancerJeu } from './horloge.mjs';

const debloquee = (extra = {}) => ({ ...fresh(0), stage: 12, meilleurEtage: AUTO_GARDIEN_DEBLOCAGE + 1, zone: 'cryptes', kills: KILLS_PER_STAGE, level: 40, weapon: 30, armor: 30, ...extra });
const actif = s => basculerAutomatisme(s, 'gardien');
const contexte = { pause: false, guideFini: true };

test('non débloqué (gardien de l’étage 10 non vaincu) : bascule refusée, état inchangé', () => {
  for (const meilleurEtage of [1, AUTO_GARDIEN_DEBLOCAGE]) {
    const s = debloquee({ meilleurEtage });
    assert.equal(estDebloque(s, 'gardien'), false);
    assert.equal(basculerAutomatisme(s, 'gardien'), s);
  }
  const s = debloquee();
  assert.equal(basculerAutomatisme(s, 'inconnu'), s);
});

test('débloqué : éteint par défaut, la bascule active puis éteint', () => {
  const s = debloquee();
  assert.equal(estDebloque(s, 'gardien'), true);
  assert.equal(s.automatismes.gardien, false);
  assert.equal(actif(s).automatismes.gardien, true);
  assert.equal(actif(actif(s)).automatismes.gardien, false);
});

test('débloqué mais inactif : rien ne se lance', () => {
  const s = debloquee();
  assert.equal(doitLancerGardien(s, newFight(s).f, contexte), false);
});

test('actif, gardien disponible, non mortel : lancé, une seule fois', () => {
  const s = actif(debloquee()), { f } = newFight(s);
  assert.notEqual(assessGuardian(s).danger, 'Mortel');
  assert.equal(doitLancerGardien(s, f, contexte), true);
  const r = startBoss(s, f);
  assert.equal(r.f.boss, true);
  assert.equal(doitLancerGardien(r.s, r.f, contexte), false);
});

test('pas disponible (moins de 5 victoires) : rien', () => {
  const s = actif(debloquee({ kills: KILLS_PER_STAGE - 1 }));
  assert.equal(doitLancerGardien(s, newFight(s).f, contexte), false);
});

test('gardien « Mortel » : rien n’est lancé, le bouton reste au joueur', () => {
  const s = actif(debloquee({ level: 1, weapon: 0, armor: 0 }));
  assert.equal(assessGuardian(s).danger, 'Mortel');
  assert.equal(doitLancerGardien(s, newFight(s).f, contexte), false);
});

test('jamais au milieu d’un échange, en pause, ni avant la fin du guide', () => {
  const s = actif(debloquee()), { f } = newFight(s);
  assert.equal(doitLancerGardien(s, { ...f, enemyHP: f.enemyMax - 1 }, contexte), false);
  assert.equal(doitLancerGardien(s, f, { ...contexte, pause: true }), false);
  assert.equal(doitLancerGardien(s, f, { ...contexte, guideFini: false }), false);
});

const T0 = 1_000_000, DIX_MINUTES = 600_000;
const PARTIE = () => { const s = actif(debloquee({ stage: 11, kills: 0 })); return { version: 10, ...s, last: T0, guide: 'done', vus: ['gardien', 'absence'] }; };

async function jouer(pas, { pause = false } = {}) {
  const aleatoire = Math.random;
  Math.random = mulberry32(11);
  const jeu = await lancerJeu({ debut: T0, stockageV2: PARTIE() });
  try {
    if (pause) jeu.clic('pause');
    let annonce = false;
    for (let ecoule = 0; ecoule < DIX_MINUTES; ecoule += pas) { jeu.avancer(Math.min(pas, DIX_MINUTES - ecoule)); annonce ||= jeu.el('message').textContent === 'Gardien lancé automatiquement'; }
    return { stockage: jeu.stockage(), annonce };
  } finally { jeu.fermer(); Math.random = aleatoire; }
}

test('10 min de jeu en pas de 1 s ou de 16 ms : même sauvegarde, gardiens lancés seuls', async () => {
  const [seconde, image] = [await jouer(1000), await jouer(16)];
  assert.ok(seconde.stockage.meilleurEtage > 12, 'les gardiens ont été vaincus sans clic');
  assert.equal(seconde.annonce, true, 'le journal annonce le lancement automatique');
  assert.deepEqual(image.stockage, seconde.stockage);
});

test('en pause : aucun gardien lancé', async () => {
  const { stockage } = await jouer(1000, { pause: true });
  assert.equal(stockage.stage, 11);
  assert.equal(stockage.kills, 0);
});
