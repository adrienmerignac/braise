// Simulation de plusieurs jours de jeu (M5.1) : rejoue le moteur pur (dist/engine) avec une horloge virtuelle, sans DOM ni temps réel.
// Usage : node tools/simulate-jours.mjs [jours=7] [--profil=actif|occasionnel] [--graine=1] [--json]
//
// Un jour = 24 h d'horloge. Deux profils de joueur :
//   actif       : de 8 h à 24 h, une session de 2 min toutes les 10 min (8 min d'absence entre deux) ; absence de nuit de 8 h ;
//   occasionnel : 3 sessions de 5 min par jour (8 h, 13 h, 20 h) les jours pairs, 2 (8 h, 20 h) les jours impairs.
// À l'ouverture d'une session : `offlineGains` (règles existantes : plafond de 8 h, seuil de 60 s, facteur de combat, butin estimé).
// En session : 1 tick = ATTACK_INTERVAL_MS de jeu (jamais le framerate), politique « patient » de tools/simulate.mjs (achat de l'amélioration
// la moins chère, gardien seulement s'il n'est pas « Mortel », voyage vers la zone ouverte, compétence dès qu'elle est prête), plus : dépense
// des talents dans l'ordre de TALENTS_ORDRE et équipement de tout objet qui améliore l'emplacement. Le butin est tiré avec un
// générateur à graine (mulberry32) : même graine, même résultat. Non simulé : amélioration d'équipement, recyclage manuel.
import { fresh, cost, upgradeAtMax } from '../dist/engine/state.js';
import { newFight, startBoss, buyUpgrade, strike, assessGuardian } from '../dist/engine/combat.js';
import { voyager, zoneOuverte } from '../dist/engine/zones.js';
import { rechargeCompetence, investir } from '../dist/engine/talents.js';
import { equiper } from '../dist/engine/inventaire.js';
import { offlineGains } from '../dist/engine/offline.js';
import { bonusEquipement } from '../dist/engine/equipement.js';
import { ATTACK_INTERVAL_MS, SKILL_MULT, KILLS_PER_STAGE, ZONE_IDS } from '../dist/engine/balance.js';

export const PROFILS = ['actif', 'occasionnel'];
export const TALENTS_ORDRE = ['assaut', 'assaut', 'assaut', 'rempart', 'rempart', 'rempart', 'braise', 'braise', 'braise', 'fortune', 'fortune', 'fortune'];
export const ETAGES_JALONS = [5, 10, 15, 20, 30, 50, 75, 100];
const UPGRADES = ['weapon', 'armor', 'luck'];
const H = 3600, MIN = 60;
const round = (n, d = 2) => n === null ? null : Math.round(n * 10 ** d) / 10 ** d;

export function mulberry32(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Sessions d'un jour : [début en secondes depuis minuit, durée de jeu en secondes].
export function sessionsDuJour(profil, jour) {
  if (profil === 'actif') return Array.from({ length: 96 }, (_, i) => [8 * H + i * 600, 120]);
  if (profil === 'occasionnel') return (jour % 2 === 0 ? [8, 13, 20] : [8, 20]).map(h => [h * H, 300]);
  throw new Error(`profil inconnu : ${profil}`);
}

const valeurObjet = o => Object.entries(o.bonus).reduce((n, [stat, v]) => n + v / (stat === 'vieMax' ? 5 : 1), 0);

export function simulerJours({ jours = 7, profil = 'actif', graine = 1 } = {}) {
  const rng = mulberry32(graine), dt = ATTACK_INTERVAL_MS / 1000;
  let s = fresh(0), f = newFight(s).f, cool = 0, depense = 0, retraites = 0, victoiresGardien = 0, butinEnLigne = 0, butinHorsLigne = 0, orHorsLigne = 0;
  const jalons = Object.fromEntries(ETAGES_JALONS.map(e => [e, null])), jalonsJeu = { ...jalons };
  let tempsJeu = 0; // secondes de jeu cumulées en session (hors absence)
  const parJour = [];
  const debutPartie = sessionsDuJour(profil, 0)[0][0]; // instant de la première session, origine des jalons
  let premiere = true; // la partie commence à la première session : aucune absence avant elle
  const noter = temps => { for (const e of ETAGES_JALONS) if (jalons[e] === null && s.meilleurEtage >= e + 1) { jalons[e] = temps; jalonsJeu[e] = tempsJeu; } };
  const appliquer = (r, temps) => {
    s = r.s; f = r.f;
    for (const e of r.events) {
      if (e.type === 'retreat') retraites++;
      if (e.type === 'bossVictory') { victoiresGardien++; noter(temps); }
      if (e.type === 'butin') butinEnLigne++;
    }
  };
  const gerer = temps => {
    for (const id of TALENTS_ORDRE) s = investir(s, id);
    for (const slot of ['arme', 'armure', 'charme']) {
      const actuel = s.equipe[slot] ? valeurObjet(s.equipe[slot]) : -1;
      const meilleur = s.inventaire.filter(o => o.emplacement === slot).reduce((a, b) => (!a || valeurObjet(b) > valeurObjet(a) ? b : a), null);
      if (meilleur && valeurObjet(meilleur) > actuel) s = equiper(s, meilleur).s;
    }
    for (;;) {
      const achetables = UPGRADES.filter(k => !upgradeAtMax(s, k));
      if (!achetables.length) break;
      const kind = achetables.reduce((a, b) => cost(s, b) < cost(s, a) ? b : a);
      if (s.gold < cost(s, kind)) break;
      depense += cost(s, kind);
      appliquer(buyUpgrade(s, f, kind), temps);
    }
  };
  for (let jour = 0; jour < jours; jour++) {
    const debutJour = { or: s.gold + depense, niveau: s.level, etage: s.meilleurEtage, butin: butinEnLigne + butinHorsLigne };
    for (const [debut, duree] of sessionsDuJour(profil, jour)) {
      const t0 = jour * 24 * H + debut;
      if (jour === 0 && premiere) { s = { ...s, last: t0 * 1000 }; premiere = false; }
      const r = offlineGains(s, t0 * 1000, f);
      s = r.s; f = r.f; butinHorsLigne += r.butin.length; orHorsLigne += r.gold;
      for (let tick = 0; tick < Math.floor(duree / dt); tick++) {
        const t = t0 + tick * dt;
        tempsJeu += dt;
        gerer(t);
        if (s.kills >= KILLS_PER_STAGE && !f.boss && assessGuardian(s).danger !== 'Mortel') appliquer(startBoss(s, f), t);
        const suivante = ZONE_IDS[ZONE_IDS.indexOf(s.zone) + 1];
        if (suivante && zoneOuverte(s, suivante)) appliquer(voyager(s, f, suivante), t);
        if (cool <= 0) { cool = rechargeCompetence(s); appliquer(strike(s, f, SKILL_MULT, rng), t + dt); }
        appliquer(strike(s, f, 1, rng), t + dt);
        cool -= dt;
      }
      s = { ...s, last: (t0 + duree) * 1000 };
    }
    const orGagne = s.gold + depense - debutJour.or;
    parJour.push({ jour: jour + 1, etage: s.stage, meilleurEtage: s.meilleurEtage, zone: s.zone, niveau: s.level, niveauxGagnes: s.level - debutJour.niveau,
      etagesGagnes: s.meilleurEtage - debutJour.etage, orGagne: Math.round(orGagne), ameliorations: s.weapon + s.armor + s.luck,
      butin: butinEnLigne + butinHorsLigne - debutJour.butin, objetsEquipes: Object.keys(s.equipe).length });
  }
  noter(jours * 24 * H);
  const orTotal = s.gold + depense;
  return {
    profil, jours, graine, parJour,
    jalonsMinutes: Object.fromEntries(Object.entries(jalons).map(([e, t]) => [`gardien${e}`, round(t === null ? null : (t - debutPartie) / MIN, 1)])),
    jalonsJeuMinutes: Object.fromEntries(Object.entries(jalonsJeu).map(([e, t]) => [`gardien${e}`, round(t === null ? null : t / MIN, 1)])),
    final: { meilleurEtage: s.meilleurEtage, niveau: s.level, weapon: s.weapon, armor: s.armor, luck: s.luck, orTotalGagne: Math.round(orTotal), orHorsLigne: Math.round(orHorsLigne),
      retraites, victoiresGardien, butinEnLigne, butinHorsLigne, inventaire: s.inventaire.length, bonus: bonusEquipement(s.equipe) },
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2), valeur = nom => args.find(a => a.startsWith(`--${nom}=`))?.split('=')[1];
  const jours = Number(args.find(a => /^\d/.test(a))) || 7, graine = Number(valeur('graine')) || 1;
  for (const profil of valeur('profil') ? [valeur('profil')] : PROFILS) {
    const r = simulerJours({ jours, profil, graine });
    if (args.includes('--json')) { console.log(JSON.stringify(r)); continue; }
    console.log(`\n== ${profil} · ${jours} j · graine ${graine}`);
    console.table(r.parJour);
    console.log('jalons (minutes d\'horloge depuis le début de partie, null = non atteint)', JSON.stringify(r.jalonsMinutes));
    console.log('jalons (minutes de jeu en session, hors absence)', JSON.stringify(r.jalonsJeuMinutes));
    console.log('final', JSON.stringify(r.final));
  }
}
