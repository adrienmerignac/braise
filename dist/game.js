import {SAVE_KEY as KEY,KILLS_PER_STAGE,fresh as freshState,attack as attackOf,maxHP as maxHPOf,reward as rewardOf,cost as costOf} from './engine/state.js';
import {xpNeeded,gainXP as gainXPOf,newFight,startBoss,buyUpgrade,strike as strikeOf} from './engine/combat.js';
const $=id=>document.getElementById(id);
const fresh=()=>freshState(Date.now());
let s;try{s={...fresh(),...JSON.parse(localStorage.getItem(KEY)||'null')};if(!Number.isFinite(s.stage)||s.stage<1)throw Error();}catch{s=fresh()}
let paused=false,cool=0,f={hp:100,boss:false,enemyHP:0,enemyMax:0},saveOk=true;
const attack=()=>attackOf(s),maxHP=()=>maxHPOf(s),reward=()=>rewardOf(s),cost=k=>costOf(s,k);
const names=['Éclaireur gobelin','Pillard des Murmures','Traqueur des sous-bois'];
function log(t){$('message').textContent=t}function save(){s.last=Date.now();try{localStorage.setItem(KEY,JSON.stringify(s))}catch{saveOk=false;$('saved').textContent='Sauvegarde indisponible'}}
const titles={weapon:'Affûter la lame',armor:'Renforcer l’armure',luck:'Charme de fortune'};
window.braiseBacklog=[];
const emit=(type,detail)=>{if(window.braiseBacklog)window.braiseBacklog.push([type,detail]);window.dispatchEvent(new CustomEvent(type,{detail}))};
function apply(e){switch(e.type){
case'combat':emit('braise:combat',{damage:e.damage,strong:e.strong,defeated:e.defeated,boss:e.boss,health:e.health});$('float').textContent=`−${e.damage}`;$('float').classList.remove('hit');void $('float').offsetWidth;$('float').classList.add('hit');break;
case'spawn':emit('braise:spawn',{boss:e.boss});break;
case'levelup':log(`Niveau ${e.level} ! La braise grandit. Vitalité restaurée.`);break;
case'victory':log(`Ennemi vaincu · +${e.gold} or · +${e.xp} expérience`);break;
case'bossVictory':log(`Gardien vaincu ! L’étage ${e.stage} s’ouvre. Vitalité restaurée.`);break;
case'retreat':log('Repli au camp. Vitalité restaurée, ton butin est conservé.');break;
case'bossStart':log('Le gardien approche. Fais parler la braise !');break;
case'upgrade':log(`${titles[e.kind]} : niveau ${e.level}.`);break}}
function run(r){s=r.s;f=r.f;r.events.forEach(apply)}
function render(){for(const [id,val] of Object.entries({gold:Math.floor(s.gold).toLocaleString('fr-FR'),stage:String(s.stage).padStart(2,'0'),floor:`Étage ${s.stage}${f.boss?' · Gardien':''}`,level:s.level,attack:attack(),health:`${Math.max(0,Math.ceil(f.hp))} / ${maxHP()}`,reward:reward(),xptext:`${s.xp} / ${xpNeeded(s)}`,progress:`${s.kills} / ${KILLS_PER_STAGE} ennemis vaincus`,enemy:f.boss?'Le Gardien de braise':names[(s.stage-1)%3],enemyhp:`${Math.max(0,Math.ceil(f.enemyHP))} / ${f.enemyMax}`}))$(id).textContent=val;$('xpbar').style.width=`${s.xp/xpNeeded(s)*100}%`;$('enemybar').style.width=`${f.enemyHP/f.enemyMax*100}%`;$('dots').innerHTML=Array.from({length:KILLS_PER_STAGE},(_,i)=>`<i class="${i<s.kills?'done':''}"></i>`).join('');$('boss').disabled=s.kills<KILLS_PER_STAGE||f.boss;$('boss').innerHTML=f.boss?'⚔ Gardien en cours…':`⚔ Affronter le gardien<small>${s.kills>=KILLS_PER_STAGE?'Prêt · ouvre le prochain étage':'5 victoires requises'}</small>`;$('power').disabled=cool>0||paused;$('cooldown').textContent=cool>0?`Recharge · ${cool} s`:'Dégâts × 4 · prêt';for(const k of ['weapon','armor','luck']){const b=$('buy-'+k);b.disabled=s.gold<cost(k);b.textContent=`◈ ${cost(k)}`;$('desc-'+k).textContent=`Niv. ${s[k]} · ${k==='weapon'?'+4 attaque':k==='armor'?'+35 vitalité':'+3 or / victoire'}`}}
for(const [k,title,img] of [['weapon','Affûter la lame',104],['armor','Renforcer l’armure',100],['luck','Charme de fortune',110]]){const row=document.createElement('div');row.className='upgrade';row.innerHTML=`<img src="assets/Tiles/tile_${String(img).padStart(4,'0')}.png" alt=""><div><b>${title}</b><p id="desc-${k}"></p></div><button id="buy-${k}" aria-label="${title}"></button>`;$('upgrades').append(row);$('buy-'+k).onclick=()=>{if(s.gold<cost(k))return;run(buyUpgrade(s,f,k));save();render()}}
function strike(mult=1){if(paused)return;run(strikeOf(s,f,mult));render()}
$('boss').onclick=()=>{run(startBoss(s,f));render()};$('power').onclick=()=>{if(cool||paused)return;cool=15;strike(4)};$('pause').onclick=()=>{paused=!paused;emit('braise:pause',paused);$('pause').textContent=paused?'▶ Reprendre':'Ⅱ Pause';render()};$('reset').onclick=()=>{if(!confirm('Recommencer ? Toute la progression locale sera effacée.'))return;s=fresh();cool=0;run(newFight(s));save();render();log('Une nouvelle braise s’éveille.')};$('claim').onclick=()=>$('welcome').close();
const away=Math.max(0,Math.min(28800,(Date.now()-s.last)/1000));if(away>60){const wins=Math.floor(away/(Math.ceil((32+s.stage*14)/attack())*1.2));const gold=wins*reward();s={...s,gold:s.gold+gold};run(gainXPOf(s,f,wins*10));$('offline').textContent=`Pendant ton absence : ${wins} ennemis vaincus et ${gold.toLocaleString('fr-FR')} pièces d’or récoltées (8 h maximum).`;$('welcome').showModal()}
run(newFight(s));render();setInterval(()=>strike(),1200);setInterval(()=>{if(cool>0&&!paused)cool--;render()},1000);setInterval(save,5000);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});window.addEventListener('pagehide',save);
