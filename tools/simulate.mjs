// Simulation du premier parcours : joue le moteur pur (dist/engine) tick par tick, sans DOM ni horloge réelle.
// Usage : node tools/simulate.mjs [durée en minutes, 30 par défaut]
//
// Politique fixe (aucun rééquilibrage, seulement une mesure) :
//   1 tick = ATTACK_INTERVAL_MS de temps de jeu (jamais le framerate), un coup automatique par tick ;
//   au début de chaque tick :
//     0. dépense les points de talent libres selon `build` ;
//     1. achète l'amélioration la moins chère tant que l'or le permet (égalité : arme, armure, fortune) ;
//     2. lance le gardien dès KILLS_PER_STAGE victoires ;
//     3. voyage vers la zone suivante dès qu'elle est ouverte (le héros est alors retenu au dernier étage de sa zone) ;
//     4. utilise la compétence (× SKILL_MULT, recharge SKILL_COOLDOWN_SECONDS) dès qu'elle est prête,
//        en plus du coup automatique du même tick ; la recharge baisse d'un intervalle d'attaque par tick.
// Temps moyen par victoire à l'étage 1 : instant de la dernière victoire normale de l'étage 1 / nombre de ces victoires.
// Les temps sont en secondes de jeu, mesurés à la fin du tick qui produit l'événement (achat : au début du tick).
import { fresh, cost } from '../dist/engine/state.js';
import { newFight, startBoss, buyUpgrade, strike } from '../dist/engine/combat.js';
import { voyager, zoneOuverte } from '../dist/engine/zones.js';
import { rechargeCompetence, investir } from '../dist/engine/talents.js';
import { ATTACK_INTERVAL_MS, SKILL_MULT, KILLS_PER_STAGE, ZONE_IDS } from '../dist/engine/balance.js';

const UPGRADES = ['weapon', 'armor', 'luck'];
const round = n => n === null ? null : Math.round(n * 100) / 100;

// `build` : talents dépensés dans l'ordre dès qu'un point est libre (ex. ['assaut', 'assaut', 'assaut']) ; vide par défaut.
export function simulate({ minutes = 30, build = [] } = {}) {
  const dt = ATTACK_INTERVAL_MS / 1000;
  const ticks = Math.floor(minutes * 60 / dt);
  let s = fresh(0), f = newFight(s).f;
  let cool = 0, firstPurchase = null, firstBoss = null, stage1Wins = 0, stage1LastWin = 0, purchases = 0, retreats = 0;
  const apply = (r, time) => {
    s = r.s; f = r.f;
    for (const e of r.events) {
      if (e.type === 'bossVictory' && firstBoss === null) firstBoss = time;
      if (e.type === 'retreat') retreats++;
      if (e.type === 'victory' && r.s.stage === 1) { stage1Wins++; stage1LastWin = time; }
    }
  };
  for (let tick = 0; tick < ticks; tick++) {
    const start = tick * dt, end = (tick + 1) * dt;
    for (const id of build) s = investir(s, id);
    for (;;) {
      const kind = UPGRADES.reduce((a, b) => cost(s, b) < cost(s, a) ? b : a);
      if (s.gold < cost(s, kind)) break;
      apply(buyUpgrade(s, f, kind), start);
      purchases++;
      if (firstPurchase === null) firstPurchase = start;
    }
    if (s.kills >= KILLS_PER_STAGE && !f.boss) apply(startBoss(s, f), start);
    const suivante = ZONE_IDS[ZONE_IDS.indexOf(s.zone) + 1];
    if (suivante && zoneOuverte(s, suivante)) apply(voyager(s, f, suivante), start);
    if (cool <= 0) { cool = rechargeCompetence(s); apply(strike(s, f, SKILL_MULT), end); }
    apply(strike(s, f), end);
    cool -= dt;
  }
  return {
    stage1AvgWinSeconds: stage1Wins ? round(stage1LastWin / stage1Wins) : null, firstPurchaseSeconds: round(firstPurchase), firstBossSeconds: round(firstBoss),
    stageReached: s.stage, purchases, retreats, minutes,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const r = simulate({ minutes: Number(process.argv[2]) || 30 });
  console.log(JSON.stringify(r, null, 2));
}
