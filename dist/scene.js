import { createSceneQueue } from './engine/scene-queue.js';
import { sonsPourEvenement } from './engine/sons.js';
import { ajouterEtincelles, doitRedessiner } from './engine/etincelles.js';
import { demarrerPerf } from './perf.js';
import { enemyLook, gardienLook, sequenceGardien, ancrageEnnemi, placeEnnemi, colonneEnnemi, tailleCase } from './engine/ennemis-visuels.js';
import { couchesHeros, ACTIONS_HEROS } from './engine/apparence-heros.js';
import { decorDeZone, idDecor, fichiersDeZone, toutesPlanchesMonde, animationDecor, dureeTransition, opaciteFondu } from './engine/decors.js';
import { AFFICHAGE_DEFAUT, normaliserAffichage, mouvementReduit, effetsDiscrets, echelleTexte } from './engine/affichage.js';
// Direction rows belong to each sheet, not to the LPC family as a whole.
const HERO_ROWS = Object.freeze({ east: 3 });
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 480;
ctx.imageSmoothingEnabled = false;
const systemeReduit = matchMedia('(prefers-reduced-motion: reduce)');
// Apparence du héros : composée hors écran une fois par changement d'équipement, jamais à chaque image.
let equipement = { arme: false, armure: false }, heroADessiner = true;
const heroFeuilles = {};
let affichage = { ...AFFICHAGE_DEFAUT };
// Lu à chaque usage : le réglage et la préférence système s'appliquent immédiatement, sans recharger.
const reduit = () => mouvementReduit(affichage.mouvement, systemeReduit.matches);
const police = px => `bold ${Math.round(px * echelleTexte(affichage.texte))}px monospace`;
const discret = () => effetsDiscrets(affichage.effets);
const assets = {};
const COUCHES_FICHIERS = ['body','pants','boots','mail','plate','hood'].flatMap(c => ACTIONS_HEROS.map(a => `${c}-${a}`)).concat('sword');
const files = [...new Set([...COUCHES_FICHIERS, ...toutesPlanchesMonde()])];
let failed = false;
// Décor de la zone courante : fond recomposé hors écran à chaque changement ; fondu au noir de TRANSITION_MS (horloge de la scène, donc figé en pause).
let decorId = 'foret', decorCible = null, fondAt = -Infinity, fondAPoser = true, premiereImage = true;
let time = 0, previous = 0, paused = false, attackAt = -5000, spawnAt = 0;
let zone = 'foret', kind = null, dying = false, strong = false, isBoss = false, damage = 0, taken = 0, heroRatio = 1;
const sparks = [];
// Sons planifiés sur l'horloge de la scène (figée en pause) : un son par impact ou pas affiché, jamais rattrapé s'il est en retard.
const SON_RETARD_MAX_MS = 150;
const sons = [];
// Les événements du jeu sont tamponnés jusqu'à la fin du chargement des images (et de la chute en cours).
const queue = createSceneQueue((type, detail) => {
  if (type === 'combat') {
    attackAt = time; kind = detail.kind; zone = detail.zone || zone; dying = detail.defeated; strong = detail.strong;
    damage = detail.damage; taken = detail.taken || 0; isBoss = detail.boss; heroRatio = detail.health;
    if (!discret()) ajouterEtincelles(sparks, Array.from({ length: strong ? 30 : 10 }, (_, i) => ({start:time + 330,x:556,y:270,vx:Math.cos(i*2.4)*(25+i*3),vy:-30-i*5})));
  } else if (type === 'spawn') { dying = false; kind = detail.kind; zone = detail.zone || zone; isBoss = detail.boss; spawnAt = time; }
  for (const { nom, delaiMs } of sonsPourEvenement(type, detail, { mouvementReduit: reduit() })) sons.push({ nom, at: time + delaiMs });
});
// En pause, la boucle d'images s'arrête après une dernière image ; un événement ou la reprise la relance.
let boucleActive = true, imageFinalePosee = false, evenementEnAttente = false;
const sonde = demarrerPerf({ search: location.search, document, navigator, screen, devicePixelRatio, lire: () => ({ pause: paused, boucleActive, etincelles: sparks.length }) });
function reveiller() {
  evenementEnAttente = true;
  if (boucleActive) return;
  boucleActive = true; previous = 0;
  requestAnimationFrame(draw);
}
function demanderZone(id) {
  id = idDecor(id);
  if (id === (decorCible || decorId)) return;
  if (premiereImage || reduit()) { decorId = id; decorCible = null; fondAPoser = true; return; }
  decorCible = id; fondAt = time;
}
function receive(type, detail) {
  if (type === 'braise:pause') { paused = detail; if (!paused) imageFinalePosee = false; }
  else if (type === 'braise:zone') demanderZone(detail && detail.zone);
  else if (type === 'braise:affichage') affichage = normaliserAffichage(detail);
  else if (type === 'braise:equipement') { equipement = detail; heroADessiner = true; }
  else queue.push(type.slice(7), detail, time);
  reveiller();
}
// game.js s'exécute avant cette scène : on rejoue d'abord ce qu'il a déjà émis, puis on écoute en direct.
const backlog = window.braiseBacklog || [];
window.braiseBacklog = null;
for (const [type, detail] of backlog) receive(type, detail);
for (const type of ['braise:combat', 'braise:zone', 'braise:pause', 'braise:spawn', 'braise:affichage', 'braise:equipement']) window.addEventListener(type, ({detail}) => receive(type, detail));
// Premier combat : couches du héros et planches de la zone courante seulement ; les autres zones se chargent ensuite, sans bloquer la file.
function charger(noms) {
  return Promise.all(noms.map(name => new Promise(resolve => {
    if (assets[name]) return resolve();
    const image = new Image();
    image.onload = () => { assets[name] = image; if (name !== 'sword' && decorDeZone(decorCible || decorId).fichiers.includes(name)) fondAPoser = true; reveiller(); resolve(); };
    image.onerror = () => { signalerEchec(); resolve(); };
    image.src = `assets/lpc/${name}.png`;
  })));
}
function signalerEchec() {
  if (failed) return;
  failed = true;
  document.getElementById('message').textContent = 'Certains décors n’ont pas chargé. Recharge la page pour réessayer.';
}
const prioritaires = [...new Set([...COUCHES_FICHIERS, ...fichiersDeZone(decorId)])];
await charger(prioritaires);
queue.ready(time);
charger(files.filter(name => !prioritaires.includes(name)));
function image(name, sx, sy, sw, sh, x, y, w, h) {
  if (assets[name]) ctx.drawImage(assets[name], sx, sy, sw, sh, Math.round(x), Math.round(y), w, h);
}
function ellipse(x,y,w,h,color) { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill(); }
function tree(x,y,size=1,fir=false) {
  ellipse(x+48*size,y+130*size,55*size,16*size,'#0a181c80');
  image('trunk',0,0,90,80,x+3*size,y+65*size,90*size,80*size);
  const sway = reduit() ? 0 : Math.sin(time/1400+x)*1.4;
  image('treetop',0,fir?96:0,96,fir?128:96,x+sway,y,96*size,(fir?128:96)*size);
}
const background = document.createElement('canvas');
background.width=960;background.height=480;
const b = background.getContext('2d');b.imageSmoothingEnabled=false;
function tuile(nom,sx,sy,x,y){if(assets[nom])b.drawImage(assets[nom],sx,sy,32,32,x,y,32,32);}
function composerFond(id) {
  const d=decorDeZone(id);
  b.clearRect(0,0,960,480);
  for(let y=0;y<480;y+=32)for(let x=0;x<960;x+=32){
    const [sx,sy]=d.sol.cases[(x/32+y/32)%d.sol.cases.length];
    if(assets[d.sol.fichier])tuile(d.sol.fichier,sx,sy,x,y);else{b.fillStyle=d.sol.repli;b.fillRect(x,y,32,32);}
  }
  if(d.chemin){
    b.save();b.beginPath();b.ellipse(485,307,410,106,0,0,Math.PI*2);b.clip();
    for(let y=192;y<448;y+=32)for(let x=32;x<960;x+=32)tuile(d.chemin.fichier,d.chemin.sx,d.chemin.sy,x,y);
    b.restore();
  }
  if(d.eau)for(const [x,y,rx,ry] of d.eau.bassins){
    b.save();b.beginPath();b.ellipse(x,y,rx,ry,0,0,Math.PI*2);b.clip();
    for(let py=y-ry-32;py<y+ry+32;py+=32)for(let px=x-rx-32;px<x+rx+32;px+=32)tuile(d.eau.fichier,d.eau.sx,d.eau.sy,Math.floor(px/32)*32,Math.floor(py/32)*32);
    b.restore();
  }
  if(d.mur){
    b.fillStyle=d.mur.repli;b.fillRect(0,0,960,d.mur.hauteur);
    for(let y=0;y<d.mur.hauteur;y+=32)for(let x=0;x<960;x+=32){
      if(d.mur.trous.some(([hx,hy])=>x>=hx&&x<hx+64&&y>=hy&&y<hy+64))continue;
      const [sx,sy]=d.mur.cases[(x/32*3+y/32)%d.mur.cases.length];tuile(d.mur.fichier,sx,sy,x,y);
    }
    b.fillStyle='#0a0f1a66';b.fillRect(0,d.mur.hauteur-6,960,6);
  }
  for(const [f,sx,sy,sw,sh,x,y,w,h] of d.accessoires)if(assets[f])b.drawImage(assets[f],sx,sy,sw,sh,x,y,w,h);
  b.fillStyle=d.eclairage.voile;b.fillRect(0,0,960,480);
  fondAPoser=false;
}
const HERO_TAILLES = { walk: [9, 4], swing: [6, 4], hurt: [6, 1] };
// Les couches héros partagent la planche du héros (HERO_ROWS.east = 3) ; les planches de coup comptent 7 colonnes, on garde les 6 utilisées.
function composerHero() {
  for (const action of ACTIONS_HEROS) {
    const [cols, rows] = HERO_TAILLES[action];
    const c = heroFeuilles[action] ||= Object.assign(document.createElement('canvas'), { width: cols * 64, height: rows * 64 });
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
    for (const nom of couchesHeros(equipement, action)) if (assets[nom]) g.drawImage(assets[nom], 0, 0, c.width, c.height, 0, 0, c.width, c.height);
  }
  heroADessiner = false;
}
function actor(name, frame, row, x,y,scale=2,alpha=1,cell=[64,64]) {
  const src=name.startsWith('hero-')?heroFeuilles[name.slice(5)]:assets[name];
  if(!src)return;
  ctx.globalAlpha=alpha;ctx.drawImage(src,frame*cell[0],row*cell[1],cell[0],cell[1],Math.round(x),Math.round(y),cell[0]*scale,cell[1]*scale);ctx.globalAlpha=1;
}
// Teinte braise du gardien : calque hors écran limité aux pixels du sprite (source-atop), puis lueur additive pendant la charge et le coup.
const calque=document.createElement('canvas');calque.width=calque.height=64;
const cctx=calque.getContext('2d');cctx.imageSmoothingEnabled=false;
function teinteBraise(look,x,y,sc,frame,row,lueur,alpha) {
  const [cw,ch]=tailleCase(look.rows);
  const img=assets[look.sheet];if(!img)return;
  cctx.clearRect(0,0,64,64);cctx.globalCompositeOperation='source-over';
  cctx.drawImage(img,frame*cw,row*ch,cw,ch,0,0,64,64);
  cctx.globalCompositeOperation='source-atop';cctx.fillStyle=look.teinte;
  cctx.globalAlpha=Math.min(.9,look.teinteForce+lueur*.5);cctx.fillRect(0,0,64,64);cctx.globalAlpha=1;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(calque,0,0,64,64,Math.round(x),Math.round(y),64*sc,64*sc);
  if(lueur>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha*lueur*.35;ctx.drawImage(calque,0,0,64,64,Math.round(x),Math.round(y),64*sc,64*sc);}
  ctx.restore();
}
function fire(t,feu=1) {
  const x=192,y=339;
  const glow=ctx.createRadialGradient(x,y-10,0,x,y-10,140*feu);
  glow.addColorStop(0,'#ffc17b50');glow.addColorStop(.3,'#ed8c3730');glow.addColorStop(1,'#ed8c3700');
  ctx.fillStyle=glow;ctx.fillRect(x-140*feu,y-150*feu,280*feu,280*feu);
  ellipse(x,y+12,32,10,'#10171a99');
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle=i%2?'#777c75':'#505b5d';ctx.fillRect(x+Math.cos(a)*22-5,y+Math.sin(a)*8+6,10,7);}
  ctx.fillStyle='#6d432c';ctx.fillRect(x-18,y+4,36,7);ctx.fillStyle='#8c5936';ctx.fillRect(x-11,y-1,27,6);
  for(let i=0;i<7;i++){const height=12+(Math.sin(t/100+i*2)+1)*12;ctx.fillStyle=i%2?'#f5a542':'#e57235';ctx.fillRect(x-15+i*4,y-height,5,height+5);}
  ctx.fillStyle='#ffe5a0';ctx.fillRect(x-6,y-17,10,21);
  if(!reduit())for(let i=0;i<8;i++){const f=(t/1200+i*.16)%1;ctx.globalAlpha=1-f;ctx.fillStyle='#ffcf76';ctx.fillRect(x+Math.sin(i*8+f*4)*18,y-f*100,2,3);}
  ctx.globalAlpha=1;
}
function playDueSounds() {
  const jouees = new Set();
  for (let i = sons.length - 1; i >= 0; i--) {
    const son = sons[i];
    if (son.at > time) continue;
    sons.splice(i, 1);
    if (time - son.at > SON_RETARD_MAX_MS || jouees.has(son.nom)) continue;
    jouees.add(son.nom);
    window.dispatchEvent(new CustomEvent('braise:son', { detail: { nom: son.nom } }));
  }
}
// Bascule du fond au milieu du fondu ; fin de transition après TRANSITION_MS.
function avancerDecor() {
  premiereImage = false;
  if (decorCible && (reduit() || time - fondAt >= dureeTransition({ reduit: false }) / 2)) { decorId = decorCible; decorCible = null; fondAPoser = true; }
  if (fondAPoser) composerFond(decorId);
}
function fondu() {
  const age = time - fondAt, a = opaciteFondu(age);
  if (a <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, 960, 480);
}
// Animation d'ambiance propre à la zone : reflets sur l'eau (ruines), braises et cendres (cryptes).
function ambiance(dec) {
  const anim = animationDecor(decorId, { reduit: reduit(), discret: discret() });
  if (!anim) return;
  ctx.save();
  if (anim.nom === 'reflets') {
    for (const [x, y, rx, ry] of dec.eau.bassins) for (let i = 0; i < 9; i++) {
      const u = Math.sin(i * 12.9 + x), w = Math.cos(i * 7.3 + y);
      const px = x + u * rx * .8 + Math.sin(time / 900 + i) * 6, py = y + w * ry * .7;
      ctx.globalAlpha = anim.force * (.25 + (Math.sin(time / 600 + i * 2) + 1) * .22);
      ctx.fillStyle = '#d8f2ff'; ctx.fillRect(Math.round(px), Math.round(py), 14, 2);
    }
  } else if (anim.nom === 'braises') {
    for (let i = 0; i < 22; i++) {
      const f = (time / 5200 + i * .137) % 1, x = (i * 97 + Math.sin(time / 1300 + i) * 18) % 960, y = 470 - f * 420;
      ctx.globalAlpha = anim.force * Math.sin(f * Math.PI) * .85;
      ctx.fillStyle = i % 3 ? '#ff9b4a' : '#b8a99a'; ctx.fillRect(Math.round(x), Math.round(y), i % 4 ? 2 : 3, i % 4 ? 2 : 3);
    }
  }
  ctx.restore();
}
function draw(now) {
  const debutPerf = sonde ? performance.now() : 0;
  const dt=previous?Math.min(50,now-previous):0;previous=now;if(!paused)time+=dt;
  queue.flush(time);
  avancerDecor();
  if(heroADessiner)composerHero();
  playDueSounds();
  const t=reduit()?0:time, age=time-attackAt;
  ctx.save();
  if(strong&&age>280&&age<520&&!reduit()&&!discret())ctx.translate(Math.sin(age)*3,Math.cos(age)*2);
  ctx.drawImage(background,0,0);
  const dec=decorDeZone(decorId);
  if(decorId==='foret'){
  for(const [x,y,z,f] of [[-35,-65,1.8,true],[95,-78,1.65,false],[245,-110,1.8,true],[410,-110,1.7,false],[560,-100,1.65,true],[710,-90,1.8,false],[860,-50,1.8,true]])tree(x,y,z,f);
  image('rock',0,0,32,32,732,246,48,48);image('rock',32,0,32,32,247,222,32,32);
  // Broken stone markers and small mushrooms along the path.
  for(let i=0;i<14;i++){let x=75+i*62,y=390+Math.sin(i*9)*23;ctx.fillStyle='#394e40';ctx.fillRect(x,y,6,12);ctx.fillStyle=i%3?'#8f8270':'#b97e5c';ctx.fillRect(x-4,y-2,14,5);}
  }
  ambiance(dec);
  fire(t,dec.eclairage.feu);
  const lunging=age>=0&&age<650;
  const approach=lunging&&!reduit()?Math.sin(Math.min(1,age/650)*Math.PI)*70:0;
  const heroX=330+approach, heroY=210;
  const seq=isBoss&&!dying?sequenceGardien(age,{reduit:reduit(),discret:discret()}):{dx:0,lueur:0};
  const enemyX=515+seq.dx+(age>370&&age<560&&!reduit()?Math.sin(age/35)*6:0);
  ellipse(heroX+64,heroY+117,36,11,'#111b2580');ellipse(enemyX+64,327,isBoss?gardienLook(zone).ombreRayon:35,isBoss?15:12,'#111b2580');
  if(lunging&&age<190)actor('hero-walk',reduit()?0:1+Math.floor(age/25)%8,HERO_ROWS.east,heroX,heroY);
  else if(lunging)actor('hero-swing',Math.min(5,Math.floor((age-190)/76)),HERO_ROWS.east,heroX,heroY);
  else actor('hero-walk',0,HERO_ROWS.east,heroX,heroY);
  // Le gardien a sa propre planche et échelle ; les autres types lisent leur entrée du catalogue visuel.
  const look=isBoss?gardienLook(zone):enemyLook(kind), sc=look.scale, rows=look.rows, cell=tailleCase(rows), place=placeEnnemi(look), zoom=look.zoom||sc;
  // Pieds et centre restent à la même place quelle que soit l'échelle.
  const ancre=ancrageEnnemi(sc), ex=(dx=0)=>enemyX+dx+ancre.x+place.dx, ey=ancre.y+place.dy;
  const deathAge=age-360;
  if(dying&&deathAge>0&&deathAge<650){actor(look.sheet,rows.death==null?0:Math.min(4,Math.floor(deathAge/100)),rows.death==null?rows.west:rows.death,ex(),ey,zoom,Math.max(0,1-deathAge/650),cell);}
  else {
    const entering=dying&&deathAge>=650?(Math.max(0,1350-age)):Math.max(0,650-(time-spawnAt));
    const attack=age>650&&age<1000&&!dying;
    const frame=colonneEnnemi(rows,{t,attaque:attack,age,reduit:reduit()});
    actor(look.sheet,frame,rows.west,ex(reduit()?0:entering*.13),ey,zoom,Math.max(.15,1-entering/1000),cell);
    if(isBoss&&!dying)teinteBraise(look,ex(reduit()?0:entering*.13),ey,zoom,frame,rows.west,seq.lueur,Math.max(.15,1-entering/1000));
  }
  if(lunging&&age>230&&age<530){
    ctx.save();ctx.globalAlpha=Math.sin((age-230)/300*Math.PI);ctx.strokeStyle=strong?'#fff1a4':'#d4e9ec';ctx.lineWidth=strong?8:4;
    ctx.beginPath();ctx.arc(510,265,strong?75:50,-1.2,1.1);ctx.stroke();ctx.restore();
  }
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i],a=(time-p.start)/1000;if(a>1){sparks.splice(i,1);continue}if(a<0||reduit()||discret())continue;ctx.globalAlpha=1-a;ctx.fillStyle=strong?'#ffd47e':'#e4c8a2';ctx.fillRect(p.x+p.vx*a,p.y+p.vy*a+100*a*a,4,4);ctx.globalAlpha=1;}
  if(age>330&&age<1050){const a=(age-330)/720;ctx.globalAlpha=1-a;ctx.font=police(strong?30:23);ctx.textAlign='center';ctx.fillStyle='#19202c';ctx.fillText(`−${damage}`,582,215-a*32);ctx.fillStyle=strong?'#ffdb89':'#fff4db';ctx.fillText(`−${damage}`,580,213-a*32);ctx.globalAlpha=1;}
  // Dégâts reçus : signe − et suffixe PV (jamais la couleur seule) ; sans flottement en mouvement réduit.
  if(taken>0&&age>680&&age<1500){const a=(age-680)/820;ctx.globalAlpha=Math.min(1,2*(1-a));ctx.font=police(22);ctx.textAlign='center';const y=190-(reduit()?0:a*28);ctx.fillStyle='#19202c';ctx.fillText(`−${taken} PV`,397,y+2);ctx.fillStyle='#ff9d8a';ctx.fillText(`−${taken} PV`,395,y);ctx.globalAlpha=1;}
  ctx.fillStyle='#1a2b27';ctx.fillRect(365,207,62,4);ctx.fillStyle='#bfd4a0';ctx.fillRect(365,207,62*heroRatio,4);
  if(decorId==='foret'){tree(-50,255,1.65,true);tree(825,265,1.8,true);tree(710,390,1.5,false);}
  const shade=ctx.createLinearGradient(0,0,0,480);shade.addColorStop(0,dec.eclairage.haut);shade.addColorStop(.5,'#17243c00');shade.addColorStop(1,dec.eclairage.bas);ctx.fillStyle=shade;ctx.fillRect(0,0,960,480);
  if(decorId==='foret'&&!reduit()&&!discret())for(let i=0;i<15;i++){const x=(i*163+Math.sin(t/2500+i)*32)%960,y=120+(i*73)%280+Math.sin(t/1700+i)*14;ctx.globalAlpha=.2+(Math.sin(t/700+i)+1)*.25;ctx.fillStyle='#dfdf9f';ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;
  ctx.restore();
  fondu();
  if (sonde) sonde.image(performance.now() - debutPerf);
  imageFinalePosee = paused; evenementEnAttente = false;
  if (doitRedessiner({ pause: paused, imageFinalePosee, evenementEnAttente })) requestAnimationFrame(draw);
  else boucleActive = false;
}
requestAnimationFrame(draw);
