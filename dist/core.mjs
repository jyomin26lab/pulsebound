import { MASTERS } from './masters.mjs';

export const SAVE_KEY = 'pulsebound-save-v1';
export const UPGRADE_INFO = {
  power: { base: 3, growth: 1.28, max: 100 },
  focus: { base: 12, growth: 1.75, max: 8 },
  fury: { base: 24, growth: 1.5, max: 20 }
};
/*
 * Dojo ladder, from the street to an alien planet. Each venue has equipment to buy; once everything is bought, its
 * master must be beaten in a duel, then the next venue can be bought. Money comes from hits, broken bags and the end-of-session takings.
 * Tuning: venue prices grow by PRICE_GROWTH per level on Earth and ALIEN_PRICE_GROWTH on the alien planet,
 * takings by TAKINGS_GROWTH; DIFFICULTY scales every price, ENTRY the price of moving in. Check the result with simulate-progression.mjs.
 */
export const DIFFICULTY=1,ENTRY=.5,PRICE_GROWTH=6.8,ALIEN_PRICE_GROWTH=3.9,TAKINGS_GROWTH=3.4;
const EARTH=[
  ['La Rue',[['bag','Sac d’occasion',1,.15],['speaker','Enceinte portable',0,.2]]],
  ['Salle délabrée',[['mats','Tapis de sol',2,.05],['poster','Posters de champions',0,.1],['windows','Fenêtres réparées',1,.1],['fan','Ventilateur',1,.1],['lockers','Vestiaires',2,.05]]],
  ['Dojo gymnase',[['tatami','Tatamis neufs',3,.05],['mirrors','Miroirs muraux',1,.1],['rack','Râtelier d’armes',2,.05],['lights','Éclairage neuf',1,.1],['showers','Douches',3,.1]]],
  ['Dojo de quartier',[['sign','Enseigne lumineuse',2,.1],['ring','Ring d’entraînement',4,.05],['sauna','Sauna',2,.15],['trophies','Vitrine à trophées',1,.15],['assistant','Coach assistant',5,.05]]],
  ['Dojo renommé',[['garden','Jardin zen',2,.15],['dummies','Mannequins de bois',4,.05],['press','Salle de presse',3,.1],['physio','Kinésithérapeute',4,.1],['tournament','Tournoi annuel',6,.1]]],
  ['Dojo de luxe',[['marble','Sol en marbre',3,.1],['spa','Spa privé',3,.15],['chef','Chef cuisinier',4,.1],['limousine','Navette en limousine',5,.1],['champion','Champion invité',7,.1]]],
  ['Dojo militaire',[['obstacle','Parcours d’obstacles',5,.05],['armory','Armurerie',4,.1],['bunker','Bunker d’entraînement',6,.1],['helipad','Héliport',5,.1],['general','Général instructeur',8,.1]]],
  ['Dojo high-tech',[['holo','Sparring holographique',6,.1],['sensors','Capteurs de frappe',5,.1],['robots','Robots partenaires',7,.1],['ai','Coach IA',8,.1],['vr','Salle de réalité virtuelle',9,.1]]],
  ['Dojo spatial',[['gravity','Gravité artificielle',7,.1],['airlock','Sas d’accueil',6,.1],['window','Baie panoramique sur la Terre',6,.15],['shuttle','Navette de recrutement',9,.1],['station','Station d’entraînement orbitale',10,.1]]]
];
// Levels 10-17 retrace levels 1-8 on an alien planet.
const LADDER=[...EARTH,...EARTH.slice(0,8).map(([name,items])=>[name==='La Rue'?'Rue alien':name+' alien',items.map(([id,label,count,ease])=>['alien-'+id,label+' alien',(name==='La Rue'?0:count)+8,ease])])];
const SHARES=[.2,.35,.5,.7,1];// equipment cost as a share of the venue's worth
export const VENUES=LADDER.map(([name,items],index)=>{
  const level=index+1,worth=level===1?0:Math.round(25*PRICE_GROWTH**(Math.min(level,10)-2)*ALIEN_PRICE_GROWTH**Math.max(0,level-10)*DIFFICULTY);
  return {level,name,price:worth*ENTRY,fee:.5*TAKINGS_GROWTH**(level-1),tip:.02*TAKINGS_GROWTH**(level-1),art:'venues/'+String(level).padStart(2,'0')+'.webp',
    items:items.map(([id,label,count,ease],i)=>({id,name:label,students:count,comfort:ease,art:'items/'+id+'.webp',cost:level===1?[3,6][i]*DIFFICULTY:Math.round(worth*SHARES[i])}))};
});
export const MAX_VENUE=VENUES.length;
export function venueOf(s){return VENUES[Math.min(MAX_VENUE,Math.max(1,s.venue||1))-1];}
export function students(s){return venueOf(s).items.filter(item=>s.items.includes(item.id)).reduce((n,item)=>n+item.students,0);}
export function comfort(s){return 1+venueOf(s).items.filter(item=>s.items.includes(item.id)).reduce((n,item)=>n+item.comfort,0);}
export function fullyEquipped(s){return venueOf(s).items.every(item=>s.items.includes(item.id));}
export function buyItem(s,id){
  const item=venueOf(s).items.find(entry=>entry.id===id);
  if(!item||s.items.includes(id)||s.coins<item.cost)return false;
  s.coins-=item.cost;s.items.push(id);return true;
}
export function expandCost(s){return s.venue<MAX_VENUE?VENUES[s.venue].price:Infinity;}
/*
 * Masters (masters.mjs): s.masters counts those beaten, always in order and for good; s.tired is how many times the next
 * one has won. Force and Critique weigh on the fight: each master has an advised level of Force.
 */
export const MAX_TIRED=4;
export function masterOf(s){return MASTERS[s.venue-1]||null;}
export function masterBeaten(s){return !masterOf(s)||s.venue<=s.masters;}
export function canChallenge(s){return fullyEquipped(s)&&!masterBeaten(s);}
// The level of Force that hits as hard as Nova does now: seals and boons count too.
export function forceLevel(s){return Math.max(0,Math.round((attackPower(s)-8)/4));}
export function masterEdge(s,master){return Math.max(.6,Math.min(1.5,Math.sqrt((8+4*forceLevel(s))/(8+4*master.force))));}
/** A fight against a master is over. Returns true when the way to the next dojo has just opened. */
export function settleMaster(s,level,victory){
  if(level!==s.masters+1)return false;// an old master, for the pleasure
  if(victory){s.masters=level;s.tired=0;return true;}
  s.tired=Math.min(MAX_TIRED,s.tired+1);return false;
}
export function canExpand(s){return fullyEquipped(s)&&masterBeaten(s)&&s.coins>=expandCost(s);}
export function expand(s){if(!canExpand(s))return false;s.coins-=expandCost(s);s.venue++;s.items=[];return true;}
export const GRADE_TAKINGS={S:2,A:1.5,B:1.2,C:1};
// End-of-session takings: fans tip, students pay their fee; the grade of the song multiplies it.
export function sessionPayout(s,grade=null){
  const v=venueOf(s),base=(s.fans||0)*v.tip+students(s)*v.fee;
  return Math.round(base*comfort(s)*(GRADE_TAKINGS[grade]||1)*legacyMultiplier(s)*(1+.2*boon(s,'income'))*2**(s.dimension||0)*100)/100;
}
export function canJump(s){return s.venue===MAX_VENUE&&fullyEquipped(s);}
// The first students of the street and of the first hall: the cheapest equipment that brings some, while nobody trains there yet.
export function recruitPlan(s){
  if(students(s)>0||s.venue>2)return null;
  const first=venueOf(s).items.filter(item=>item.students).sort((a,b)=>a.cost-b.cost)[0];
  return {cost:first.cost,item:first.id,students:first.students};
}
export function recruit(s){const plan=recruitPlan(s);return Boolean(plan)&&buyItem(s,plan.item);}
// Auto strike comes with the first hall and stays: going back to the street takes a transmission or a dimension jump.
export function autoUnlocked(s){return s.venue>=2||s.prestiges>0||s.dimension>0;}
// Dimension jump: alien technology opens a new dojo in another dimension. Back to the street, takings ×2 each time.
export function dimensionJump(s,now=Date.now()){
  if(!canJump(s))return false;
  s.dimension=(s.dimension||0)+1;startOver(s,now);return true;
}
function startOver(s,now){
  s.coins=0;s.runCoins=0;s.stage=1;s.hp=enemyHealth(1);s.savedAt=now;s.venue=1;s.items=[];s.fans=perk(s,'headstart')*50;
  for(const key of Object.keys(UPGRADE_INFO))s.upgrades[key]=0;
  s.boons={};s.pendingBoons=0;s.upgrades.power=1;
}
export const ACHIEVEMENTS=[
  {id:'first',name:'Premier impact',text:'Briser ton premier sac',reward:0.15,test:s=>s.kills>=1},
  {id:'room',name:'Un toit',text:'Acheter ta première salle',reward:2,test:s=>s.venue>=2},
  {id:'combo',name:'Dans le flow',text:'Enchaîner 20 actions réussies',reward:0.8,test:s=>s.bestCombo>=20},
  {id:'boss',name:'Briser le silence',text:'Briser un sac renforcé',reward:1.0,test:s=>s.bosses>=1},
  {id:'flow',name:'Incandescence',text:'Déclencher le Flow',reward:1.2,test:s=>s.flows>=1},
  {id:'gym',name:'Un vrai dojo',text:'Ouvrir le dojo gymnase',reward:10,test:s=>s.venue>=3},
  {id:'hundred',name:'La précision du geste',text:'Réussir 100 frappes parfaites',reward:1.5,test:s=>s.perfects>=100},
  {id:'fans100',name:'Premiers admirateurs',text:'Réunir 100 fans',reward:3,test:s=>s.fans>=100},
  {id:'legacy',name:'Un nouveau départ',text:'Transmettre ton dojo',reward:1.0,test:s=>s.prestiges>=1},
  // Long-term goals tied to grades, the daily challenge and boons. Hidden ones show as ??? until earned.
  {id:'kills100',name:'Cent sacs',text:'Briser 100 sacs',reward:2,test:s=>s.kills>=100},
  {id:'kills1000',name:'Le sac n’a qu’à bien se tenir',text:'Briser 1 000 sacs',reward:20,test:s=>s.kills>=1000},
  {id:'bosses10',name:'Dix épreuves',text:'Briser 10 sacs renforcés',reward:4,test:s=>s.bosses>=10},
  {id:'stage25',name:'Série 25',text:'Atteindre la série 25',reward:3,test:s=>s.highestStage>=25},
  {id:'stage50',name:'Série 50',text:'Atteindre la série 50',reward:25,test:s=>s.highestStage>=50},
  {id:'combo50',name:'Cinquante sans rupture',text:'Enchaîner 50 frappes réussies',reward:3,test:s=>s.bestCombo>=50},
  {id:'combo128',name:'Transe',text:'Enchaîner 128 frappes réussies',reward:12,hidden:true,test:s=>s.bestCombo>=128},
  {id:'perfect500',name:'Main sûre',text:'Réussir 500 frappes parfaites',reward:6,test:s=>s.perfects>=500},
  {id:'perfect2000',name:'Le geste juste',text:'Réussir 2 000 frappes parfaites',reward:25,test:s=>s.perfects>=2000},
  {id:'flow10',name:'Brasier',text:'Déclencher 10 Flows',reward:4,test:s=>s.flows>=10},
  {id:'gradeS',name:'Note parfaite',text:'Obtenir un S sur un morceau',reward:5,test:s=>Object.values(s.grades||{}).includes('S')},
  {id:'gradeA3',name:'Répertoire',text:'Obtenir A ou mieux sur 3 morceaux',reward:6,test:s=>Object.values(s.grades||{}).filter(g=>g==='S'||g==='A').length>=3},
  {id:'gradeS5',name:'Virtuose',text:'Obtenir S sur 5 morceaux',reward:30,hidden:true,test:s=>Object.values(s.grades||{}).filter(g=>g==='S').length>=5},
  {id:'daily1',name:'Rendez-vous',text:'Réussir un défi du jour',reward:1,test:s=>(s.daily?.streak||0)>=1},
  {id:'daily3',name:'Trois jours de suite',text:'Réussir le défi 3 jours d’affilée',reward:5,test:s=>(s.daily?.streak||0)>=3},
  {id:'daily7',name:'Une semaine au dojo',text:'Réussir le défi 7 jours d’affilée',reward:15,hidden:true,test:s=>(s.daily?.streak||0)>=7},
  {id:'boons5',name:'Dojo béni',text:'Cumuler 5 dons durables dans une même école',reward:4,test:s=>Object.values(s.boons||{}).reduce((n,v)=>n+v,0)>=5},
  {id:'fervor3',name:'Triple ferveur',text:'Choisir 3 fois Ferveur dans une même école',reward:6,hidden:true,test:s=>(s.boons?.income||0)>=3},
  {id:'renown',name:'Réputation',text:'Ouvrir le dojo renommé',reward:200,test:s=>s.venue>=5},
  {id:'military',name:'Garde à vous',text:'Ouvrir le dojo militaire',reward:5000,test:s=>s.venue>=7},
  {id:'space',name:'En orbite',text:'Ouvrir le dojo spatial',reward:1e5,test:s=>s.venue>=9},
  {id:'alien',name:'Premier contact',text:'Arriver sur la planète alien',reward:5e5,hidden:true,test:s=>s.venue>=10},
  {id:'fans1000',name:'Un fan-club',text:'Réunir 1 000 fans',reward:20,test:s=>s.fans>=1000},
  {id:'dimension',name:'Au-delà',text:'Faire un saut de dimension',reward:10,hidden:true,test:s=>(s.dimension||0)>=1},
  {id:'legacy3',name:'Lignée',text:'Transmettre 3 fois ton dojo',reward:8,test:s=>s.prestiges>=3},
  {id:'seals10',name:'Dix sceaux',text:'Réunir 10 sceaux',reward:20,hidden:true,test:s=>s.seals>=10}
];
export const GRADES=['S','A','B','C'];
// Good counts half a perfect; under 16 judged notes (skipped or very short) there is no grade.
export function songGrade({perfects=0,goods=0,notes=0}={}){
  if(!(notes>=16))return null;
  const accuracy=(perfects+goods*.5)/notes;
  return accuracy>=.9?'S':accuracy>=.75?'A':accuracy>=.55?'B':'C';
}
export function recordGrade(s,trackId,grade){
  if(!trackId||!GRADES.includes(grade))return false;
  const previous=s.grades[trackId];
  if(previous&&GRADES.indexOf(previous)<=GRADES.indexOf(grade))return false;
  s.grades[trackId]=grade;return true;
}
// Boons: pick one of three after each reinforced bag. Stacking bonuses last until the next transmission.
export const BOONS={
  income:{label:'Ferveur',text:'+20 % de recette de séance'},
  power:{label:'Poings de braise',text:'+15 % de dégâts par frappe'},
  crit:{label:'Œil du tigre',text:'+4 % de chances de critique'},
  bag:{label:'Butin',text:'+25 % de pièces par sac brisé'},
  word:{label:'Bouche-à-oreille',text:'+25 % de fans par sac brisé'},
  coins:{label:'Offrande',text:'La moitié d’une recette de séance tout de suite (3 pièces min.)',instant:true}
};
export function boon(s,id){return s.boons?.[id]||0;}
export function boonChoices(random=Math.random,count=3){
  const ids=Object.keys(BOONS);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids.slice(0,count);
}
// Seal shop: permanent perks that survive every transmission. Spending seals keeps their +20 % power.
export const PERKS={
  headstart:{label:'Relève assurée',text:'+50 fans au début de chaque nouvelle école',max:3,cost:level=>level+1},
  blessing:{label:'Bénédiction',text:'Un don durable au hasard au début de chaque nouvelle école',max:3,cost:level=>2+level*2},
  fourth:{label:'Quatrième voie',text:'4 dons proposés au lieu de 3',max:1,cost:()=>3},
  reroll:{label:'Seconde chance',text:'Relancer une fois chaque tirage de dons',max:1,cost:()=>2},
  devotion:{label:'Assiduité',text:'Récompense du défi du jour ×2',max:1,cost:()=>3}
};
export function perk(s,id){return s.perks?.[id]||0;}
export function sealsAvailable(s){return Math.max(0,s.seals-(s.sealsSpent||0));}
export function perkCost(s,id){const p=PERKS[id];return !p||perk(s,id)>=p.max?Infinity:p.cost(perk(s,id));}
export function buyPerk(s,id){
  const cost=perkCost(s,id);if(!Number.isFinite(cost)||sealsAvailable(s)<cost)return false;
  s.sealsSpent=(s.sealsSpent||0)+cost;s.perks[id]=perk(s,id)+1;return true;
}
export function applyBoon(s,id){
  if(!Object.hasOwn(BOONS,id))return false;
  if(id==='coins')addCoins(s,Math.max(3,sessionPayout(s)*.5));
  else s.boons[id]=boon(s,id)+1;
  return true;
}
// Daily challenge: same track and goal for everyone on a given day, chosen from the day string.
export const CHALLENGES=[{kind:'combo',target:16},{kind:'combo',target:32},{kind:'grade',target:'A'},{kind:'grade',target:'S'},{kind:'perfects',target:40},{kind:'perfects',target:80}];
export function previousDay(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
export function dailyChallenge(day,trackIds){
  if(!trackIds?.length)return null;
  let h=2166136261;for(const ch of day)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
  const ids=[...trackIds].sort();// sorted so reordering the playlist does not change today's challenge
  return {day,trackId:ids[h%ids.length],...CHALLENGES[(h>>>8)%CHALLENGES.length]};
}
export function challengeMet(c,{combo=0,grade=null,perfects=0}={}){
  if(!c)return false;
  if(c.kind==='combo')return combo>=c.target;
  if(c.kind==='grade')return GRADES.includes(grade)&&GRADES.indexOf(grade)<=GRADES.indexOf(c.target);
  return perfects>=c.target;
}
// Missing a day only restarts the streak; nothing is ever taken away.
export function dailyStreak(s,day){return s.daily.lastDone===day||s.daily.lastDone===previousDay(day)?s.daily.streak:0;}
export function completeChallenge(s,day){
  if(s.daily.lastDone===day)return 0;
  s.daily.streak=s.daily.lastDone===previousDay(day)?s.daily.streak+1:1;s.daily.lastDone=day;
  // One session's takings (5 coins minimum), +10 % per streak day up to +70 %.
  const reward=Math.round(Math.max(5,sessionPayout(s))*(1+Math.min(s.daily.streak-1,7)*.1)*(perk(s,'devotion')?2:1)*100)/100;
  addCoins(s,reward);return reward;
}
export function freshState(now = Date.now()) {
  return { version: 1, dojoLit: false, coins: 0, stage: 1, hp: enemyHealth(1), kills: 0,
    hits: 0, perfects: 0, dodges: 0, dodgesMissed: 0, bestCombo: 0, totalCoins: 0, totalDamage: 0,
    runCoins:0, highestStage:1, bosses:0, flows:0, seals:0, prestiges:0, achievements:[], grades:{}, daily:{lastDone:'',streak:0}, boons:{}, pendingBoons:0, perks:{}, sealsSpent:0,
    venue:1, items:[], fans:0, dimension:0, masters:0, tired:0, upgrades: { power: 0, focus: 0, fury: 0 }, savedAt: now };
}
export function rival(stage){
  // Every reinforced bag (each 5th) grants a boon pick, so the next one is always shown as a near goal.
  const boss=stage%5===0,left=boss?0:5-stage%5;
  return {kind:'bag',name:boss?'SAC RENFORCÉ':'SAC DE FRAPPE',hint:boss?'ÉPREUVE · DON + RÉCOMPENSE ×4':'DON DANS '+left+' SAC'+(left>1?'S':''),boss,boonIn:left};
}
export function enemyHealth(stage) { return Math.round(90 * Math.pow(1.16, stage - 1)*Math.pow(1.08,Math.max(0,stage-5))*(stage%5===0?3:1)); }
export function enemyReward(stage) { return (5 + Math.min(stage-1,95)) * (stage%5===0?4:1) / 100; }
// Coup de grâce: below 30 % health the next note turns gold; a Perfect on it that breaks the bag doubles its reward.
export function finisherReady(s){return s.hp<=enemyHealth(s.stage)*.3;}
export function legacyMultiplier(s){return 1+(s.seals||0)*.2;}
export function attackPower(s) { return (8 + s.upgrades.power * 4)*legacyMultiplier(s)*(1+.15*boon(s,'power')); }
export function upgradeCost(s, key) {
  const spec = UPGRADE_INFO[key];if(!spec)return Infinity;
  return s.upgrades[key] >= spec.max ? Infinity : Math.ceil(100 * spec.base * Math.pow(spec.growth, s.upgrades[key])) / 100;
}
export function buyUpgrade(s, key) {
  if (!Object.hasOwn(UPGRADE_INFO, key)) return false;
  const cost = upgradeCost(s, key);
  if (s.coins < cost || !Number.isFinite(cost)) return false;
  s.coins -= cost;
  s.upgrades[key]++;
  return true;
}
export function addCoins(s, amount) { if(!Number.isFinite(amount)||amount<=0)return;s.coins=Math.min(1e30,s.coins+amount);s.totalCoins=Math.min(1e30,s.totalCoins+amount);s.runCoins=Math.min(1e30,(s.runCoins||0)+amount); }
// Each broken bag also brings fans (×fanBoost during the Flow, +25 % per Bouche-à-oreille boon).
export function damageEnemy(s, amount, fanBoost = 1) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  let defeats = 0;
  s.totalDamage = Math.min(1e30,s.totalDamage+amount);
  while (amount >= s.hp && defeats<500) {
    amount -= s.hp;
    addCoins(s, enemyReward(s.stage)*(1+.25*boon(s,'bag')));
    if(s.stage%5===0)s.bosses++;
    s.fans=Math.min(1e15,(s.fans||0)+fanBoost*(1+.25*boon(s,'word')));
    s.kills++;
    s.stage=Math.min(500,s.stage+1);s.highestStage=Math.max(s.highestStage,s.stage);
    s.hp = enemyHealth(s.stage);
    defeats++;
  }
  s.hp = Math.max(Number.EPSILON, s.hp - amount);
  return defeats;
}
export function judgeTiming(seconds, bpm, offset = 0, calibrationMs = 0, focus = 0) {
  const period = 60 / bpm;
  const position = (seconds - offset - calibrationMs / 1000) / period;
  const beat = Math.round(position);
  const error = (position - beat) * period * 1000;
  const perfectWindow = Math.min(65 + focus * 6, period * 1000 * 0.23);
  const goodWindow = Math.min(145 + focus * 4, period * 1000 * 0.43);
  return { beat, error, grade: Math.abs(error) <= perfectWindow ? 'perfect' : Math.abs(error) <= goodWindow ? 'good' : 'miss' };
}
export function critChance(s) { return 0.05 + s.upgrades.fury * 0.025 + boon(s,'crit') * 0.04; }
export function hitDamage(s, grade, combo, random = Math.random()) {
  const critical = grade !== 'miss' && random < critChance(s);
  const multiplier = grade === 'perfect' ? 2.7 : grade === 'good' ? 1.4 : 0.25;
  return { damage: Math.round(attackPower(s) * multiplier * (1 + Math.min(combo, 50) * 0.025) * (critical ? 2 : 1)), critical };
}
export function claimAchievements(s){
  const earned=[];
  for(const a of ACHIEVEMENTS)if(!s.achievements.includes(a.id)&&a.test(s)){s.achievements.push(a.id);addCoins(s,a.reward);earned.push(a);}
  return earned;
}
export function dojoTier(s){return Math.min(3,Math.floor(((s.venue||1)-1)/2));}
// Transmission only from the dilapidated room (2) to the military dojo (7); later, the way out is the dimension jump.
export function canTransmit(s){return s.venue>=2&&s.venue<=7;}
export function prestigeGain(s){return canTransmit(s)?Math.floor(Math.sqrt(s.runCoins/12000)):0;}
export function prestige(s,now=Date.now(),random=Math.random){
  const gain=prestigeGain(s);if(gain<1)return 0;
  s.seals+=gain;s.prestiges++;startOver(s,now);
  const lasting=Object.keys(BOONS).filter(id=>!BOONS[id].instant);
  for(let i=0;i<perk(s,'blessing');i++)applyBoon(s,lasting[Math.floor(random()*lasting.length)]);
  return gain;
}
export function currentGoal(s){
  if(canJump(s))return {label:'Un portail s’ouvre',detail:'Saut de dimension : recettes ×2 pour toujours',current:1,target:1,action:'dojo'};
  const next=venueOf(s).items.filter(item=>!s.items.includes(item.id)).sort((a,b)=>a.cost-b.cost)[0];
  if(next)return {label:next.name,detail:venueOf(s).name,current:s.coins,target:next.cost,action:'dojo'};
  if(!masterBeaten(s))return {label:'Battre '+masterOf(s).name,detail:venueOf(s).name,current:forceLevel(s),target:masterOf(s).force,action:'dojo',master:true};
  return {label:'Agrandir',detail:VENUES[s.venue].name,current:s.coins,target:expandCost(s),action:'dojo'};
}
export function beatAction(beat) { return beat >= 0 && beat % 8 === 7 ? 'dodge' : 'punch'; }
export function actionOutcome(action, expected, grade, guard, riposte = false) {
  if (action === expected && grade !== 'miss') {
    return expected === 'dodge'
      ? { success: true, guard: Math.min(3, guard + (grade === 'perfect' ? 1 : 0)), riposte: true, damageMultiplier: 0, staggered: false }
      : { success: true, guard, riposte: false, damageMultiplier: riposte ? 1.6 : 1, staggered: false };
  }
  const nextGuard = expected === 'dodge' ? guard - 1 : guard;
  return { success: false, guard: nextGuard <= 0 ? 3 : nextGuard, riposte: false, damageMultiplier: 0, staggered: nextGuard <= 0 };
}
export function restoreState(raw, now = Date.now()) {
  const s = freshState(now);
  if (!raw || raw.version !== 1) return s;
  for (const key of ['coins', 'kills', 'hits', 'perfects', 'dodges', 'dodgesMissed', 'bestCombo', 'totalCoins', 'totalDamage','runCoins','bosses','flows','seals','prestiges']) {
    if (Number.isFinite(raw[key]) && raw[key] >= 0) s[key] = Math.min(raw[key], 1e30);
  }
  s.dojoLit = raw.dojoLit === true;
  s.stage = Number.isInteger(raw.stage) ? Math.max(1, Math.min(500, raw.stage)) : 1;
  s.highestStage=Number.isInteger(raw.highestStage)?Math.max(s.stage,Math.min(500,raw.highestStage)):s.stage;
  for(const key of ['bosses','flows','seals','prestiges'])s[key]=Math.floor(Math.min(key==='seals'?1e6:1e12,s[key]));
  if(!Number.isFinite(raw.runCoins))s.runCoins=s.totalCoins;
  // Saves from before the dojo ladder: their run total belongs to the old economy and must not unlock a transmission.
  if(!Number.isInteger(raw.venue))s.runCoins=0;
  if(!Number.isFinite(raw.bosses))s.bosses=Math.floor((s.stage-1)/5);
  s.achievements=Array.isArray(raw.achievements)?ACHIEVEMENTS.filter(a=>raw.achievements.includes(a.id)).map(a=>a.id):[];
  // Grades come from imported save files too: keep only short ids and known letters.
  if(raw.grades&&typeof raw.grades==='object')for(const [id,grade]of Object.entries(raw.grades).slice(0,1000))if(id.length<=200&&GRADES.includes(grade))s.grades[id]=grade;
  if(typeof raw.daily?.lastDone==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.daily.lastDone)&&Number.isInteger(raw.daily.streak))s.daily={lastDone:raw.daily.lastDone,streak:Math.max(0,Math.min(100000,raw.daily.streak))};
  if(Number.isInteger(raw.pendingBoons))s.pendingBoons=Math.max(0,Math.min(50,raw.pendingBoons));
  if(raw.boons&&typeof raw.boons==='object')for(const id of Object.keys(BOONS))if(Number.isInteger(raw.boons[id])&&raw.boons[id]>0)s.boons[id]=Math.min(1000,raw.boons[id]);
  if(raw.perks&&typeof raw.perks==='object')for(const id of Object.keys(PERKS))if(Number.isInteger(raw.perks[id])&&raw.perks[id]>0)s.perks[id]=Math.min(PERKS[id].max,raw.perks[id]);
  s.venue=Number.isInteger(raw.venue)?Math.max(1,Math.min(MAX_VENUE,raw.venue)):1;
  if(Array.isArray(raw.items)){const ids=venueOf(s).items.map(item=>item.id);s.items=ids.filter(id=>raw.items.includes(id));}
  if(Number.isFinite(raw.fans)&&raw.fans>=0)s.fans=Math.min(1e15,raw.fans);
  if(Number.isInteger(raw.dimension)&&raw.dimension>=0)s.dimension=Math.min(1000,raw.dimension);
  // Saves from before the masters: every dojo already opened, in this school or an earlier one, has none left to beat.
  const opened=s.dimension?MAX_VENUE:Math.max(s.venue,...Object.entries({room:2,gym:3,renown:5,military:7,space:9,alien:10}).map(([id,level])=>s.achievements.includes(id)?level:1));
  s.masters=Number.isInteger(raw.masters)?Math.max(s.venue-1,Math.min(MASTERS.length,raw.masters)):opened-1;
  if(Number.isInteger(raw.tired))s.tired=Math.max(0,Math.min(MAX_TIRED,raw.tired));
  s.sealsSpent=Number.isInteger(raw.sealsSpent)?Math.max(0,Math.min(s.seals,raw.sealsSpent)):0;
  s.hp = Number.isFinite(raw.hp) && raw.hp > 0 ? Math.min(raw.hp, enemyHealth(s.stage)) : enemyHealth(s.stage);
  for (const key of Object.keys(UPGRADE_INFO)) {
    const level = raw.upgrades?.[key];
    if (Number.isInteger(level)) s.upgrades[key] = Math.max(0, Math.min(UPGRADE_INFO[key].max, level));
  }
  s.savedAt = Number.isFinite(raw.savedAt) ? Math.min(now, Math.max(0, raw.savedAt)) : now;
  return s;
}

// Onset autocorrelation estimates a regular beat grid; syncopation can imply half/double tempo.
export function estimateTempo(samples, sampleRate) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate < 4000) return null;
  const hop = Math.max(1, Math.round(sampleRate / 200));
  const rate = sampleRate / hop;
  const count = Math.floor(samples.length / hop);
  if (count < rate * 5) return null;
  const onset = new Float32Array(count);
  let previous = 0, bass = 0, peak = 0;
  const alpha = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let i = 0; i < count; i++) {
    let energy = 0, bassEnergy = 0;
    for (let j = 0; j < hop; j++) {
      const v = samples[i * hop + j];
      bass += alpha * (v - bass);
      energy += v * v;
      bassEnergy += bass * bass;
    }
    const level = Math.log(1 + 1000 * (energy + bassEnergy * 3) / hop);
    onset[i] = Math.max(0, level - previous);
    peak = Math.max(peak, onset[i]);
    previous = level;
  }
  if (peak < 0.015) return null;
  let active = 0;
  for (let i = 0; i < count; i++) { onset[i] = Math.max(0, onset[i] - peak * 0.045); active += onset[i]; }
  if (active < 0.1) return null;
  const scores = [];
  for (let lag = Math.floor(rate * 60 / 195); lag <= Math.ceil(rate * 60 / 68); lag++) {
    let product = 0, normA = 0, normB = 0;
    for (let i = lag; i < count; i++) {
      product += onset[i] * onset[i - lag];
      normA += onset[i] ** 2;
      normB += onset[i - lag] ** 2;
    }
    scores[lag] = product / Math.sqrt(normA * normB || 1);
  }
  let bestLag = 0, bestScore = 0;
  for (let lag = 1; lag < scores.length; lag++) {
    if (!Number.isFinite(scores[lag])) continue;
    const bpm = 60 * rate / lag;
    const preference = bpm >= 90 && bpm <= 160 ? 1.035 : 1;
    const score = (scores[lag] + (scores[lag * 2] || 0) * 0.16) * preference;
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  if (bestScore < 0.06) return null;
  if (60 * rate / bestLag < 95) {
    const half = Math.round(bestLag / 2);
    if (Math.max(scores[half - 1] || 0, scores[half] || 0, scores[half + 1] || 0) > scores[bestLag] * 0.55) bestLag = half;
  }
  const a = scores[bestLag - 1] || 0, b = scores[bestLag], c = scores[bestLag + 1] || 0;
  const correction = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / (a - 2 * b + c || 1)));
  const bpm = Math.round(60 * rate / (bestLag + correction) * 10) / 10;
  const period = 60 / bpm;
  const bins = Math.round(period * rate);
  const phases = new Float32Array(bins);
  for (let i = 0; i < count; i++) phases[Math.round((i / rate % period) / period * bins) % bins] += onset[i];
  let phase = 0, strongest = 0;
  for (let i = 0; i < bins; i++) {
    const value = phases[i] + (phases[(i + 1) % bins] + phases[(i + bins - 1) % bins]) * 0.6;
    if (value > strongest) { strongest = value; phase = i; }
  }
  return { bpm, offset: phase / bins * period, confidence: Math.min(0.99, b), };
}
