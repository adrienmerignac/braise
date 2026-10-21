// M5.4a : le gardien automatique est une décision pure du pas de simulation, bornée par le déblocage, le danger et la pause.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, cost } from '../../dist/engine/state.js';
import { newFight, startBoss, assessGuardian } from '../../dist/engine/combat.js';
import { KILLS_PER_STAGE, AUTO_GARDIEN_DEBLOCAGE, AUTO_ACHAT_DEBLOCAGE, UPGRADE_MAX_LEVEL } from '../../dist/engine/balance.js';
import { basculerAutomatisme, doitLancerGardien, estDebloque, choisirAchatAuto } from '../../dist/engine/automatismes.js';
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
const PARTIE = () => { const s = actif(debloquee({ stage: 11, kills: 0 })); return { version: 11, ...s, last: T0, guide: 'done', vus: ['gardien', 'absence'] }; };

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

// M5.4c : achat automatique.
const ACHAT = AUTO_ACHAT_DEBLOCAGE;
const riche = (extra = {}) => ({ ...fresh(0), stage: 17, meilleurEtage: ACHAT + 1, zone: 'cryptes', gold: 1e9, ...extra });
const achatActif = s => basculerAutomatisme(s, 'achat');

test('achat : débloqué après le gardien 15, bascule refusée avant, éteint par défaut', () => {
  for (const meilleurEtage of [1, AUTO_GARDIEN_DEBLOCAGE + 1, ACHAT]) {
    const s = riche({ meilleurEtage });
    assert.equal(estDebloque(s, 'achat'), false);
    assert.equal(basculerAutomatisme(s, 'achat'), s);
  }
  const s = riche();
  assert.equal(estDebloque(s, 'achat'), true);
  assert.equal(s.automatismes.achat, false);
  assert.equal(choisirAchatAuto(s), null, 'éteint : rien');
  assert.equal(achatActif(s).automatismes.achat, true);
  assert.equal(achatActif(achatActif(s)).automatismes.achat, false);
  assert.equal(achatActif(s).automatismes.gardien, false, 'gardien non touché');
});

test('achat : choisit la moins chère, arme > armure > charme à prix égal', () => {
  const s = achatActif(riche());
  assert.equal(choisirAchatAuto(s), 'weapon', 'égalité de niveau 0 → arme');
  assert.equal(choisirAchatAuto({ ...s, weapon: 5 }), 'armor');
  assert.equal(choisirAchatAuto({ ...s, weapon: 5, armor: 5 }), 'luck');
  assert.equal(choisirAchatAuto({ ...s, weapon: 5, armor: 5, luck: 5 }), 'weapon');
  assert.equal(choisirAchatAuto({ ...s, weapon: 1, armor: 0, luck: 0 }), 'armor');
});

test('achat : null si l’or manque, si tout est au maximum, en pause ou avant la fin du guide', () => {
  const s = achatActif(riche({ gold: 0 }));
  assert.equal(choisirAchatAuto(s), null);
  const max = achatActif(riche({ weapon: UPGRADE_MAX_LEVEL, armor: UPGRADE_MAX_LEVEL, luck: UPGRADE_MAX_LEVEL }));
  assert.equal(choisirAchatAuto(max), null);
  assert.equal(choisirAchatAuto({ ...max, weapon: 0 }), 'weapon', 'seule l’arme reste achetable');
  const ok = achatActif(riche());
  assert.equal(choisirAchatAuto(ok, { pause: true }), null);
  assert.equal(choisirAchatAuto(ok, { guideFini: false }), null);
  // L'or ne paie que la moins chère : on n'achète pas une plus chère à la place.
  const juste = achatActif(riche({ gold: cost(riche(), 'weapon') }));
  assert.equal(choisirAchatAuto(juste), 'weapon');
  assert.equal(choisirAchatAuto({ ...juste, gold: cost(juste, 'weapon') - 1 }), null);
});

const PARTIE_ACHAT = () => { const s = achatActif(riche({ stage: 16, kills: 0, gold: 5000 })); return { version: 11, ...s, last: T0, guide: 'done', vus: ['gardien', 'absence'] }; };

async function jouerAchat(pas, { pause = false } = {}) {
  const aleatoire = Math.random;
  Math.random = mulberry32(5);
  const jeu = await lancerJeu({ debut: T0, stockageV2: PARTIE_ACHAT() });
  try {
    if (pause) jeu.clic('pause');
    let journal = false;
    for (let ecoule = 0; ecoule < DIX_MINUTES; ecoule += pas) { jeu.avancer(Math.min(pas, DIX_MINUTES - ecoule)); journal ||= /^Achat automatique : (Arme|Armure|Charme) niveau \d+$/.test(jeu.el('message').textContent); }
    return { stockage: jeu.stockage(), journal };
  } finally { jeu.fermer(); Math.random = aleatoire; }
}

test('achat : 10 min en pas de 1 s ou de 16 ms, même sauvegarde, achats journalisés', async () => {
  const [seconde, image] = [await jouerAchat(1000), await jouerAchat(16)];
  assert.ok(seconde.stockage.weapon + seconde.stockage.armor + seconde.stockage.luck > 0, 'des achats ont eu lieu sans clic');
  assert.equal(seconde.journal, true);
  assert.deepEqual(image.stockage, seconde.stockage);
});

test('achat : en pause, rien n’est acheté', async () => {
  const { stockage } = await jouerAchat(1000, { pause: true });
  assert.equal(stockage.gold, 5000);
  assert.equal(stockage.weapon + stockage.armor + stockage.luck, 0);
});
