import assert from 'node:assert/strict';
import {freshState,buyUpgrade,upgradeCost,damageEnemy,enemyHealth,claimAchievements,restoreState,prestigeGain,prestige,dojoTier,currentGoal,addCoins} from './dist/core.mjs';
import {FlowMeter} from './dist/flow.mjs';
import {demoMap} from './dist/rhythm.mjs';
const s=freshState(1000);s.coins=10000;
assert.equal(buyUpgrade(s,'echo'),false,'Plus de recrues à acheter');assert.equal(upgradeCost(s,'unknown'),Infinity);assert.ok(buyUpgrade(s,'power'));
s.venue=7;assert.equal(dojoTier(s),3);const earned=claimAchievements(s);assert.ok(earned.length>=3);const coins=s.coins;assert.equal(claimAchievements(s).length,0);assert.equal(s.coins,coins,'Succès attribués une seule fois');
const migrated=restoreState({version:1,stage:13,hp:1,totalCoins:9000,upgrades:{echo:4,power:2},savedAt:0},1000);
assert.equal(migrated.highestStage,13);assert.equal(migrated.upgrades.echo,undefined,'Les anciennes recrues disparaissent');assert.equal(migrated.upgrades.power,2);assert.equal(migrated.runCoins,0,'L’ancien total d’école ne débloque pas de transmission');assert.equal(migrated.venue,1,'Les anciennes sauvegardes repartent de la Rue');
const restored=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(restored.venue,7);assert.deepEqual(restored.achievements,s.achievements);
const boss=freshState();boss.stage=5;boss.highestStage=5;boss.hp=enemyHealth(5);assert.equal(damageEnemy(boss,boss.hp),1);assert.equal(boss.bosses,1);assert.equal(boss.stage,6);
const legacy=freshState();legacy.runCoins=48000;assert.equal(prestigeGain(legacy),0,'Pas de transmission depuis la Rue');legacy.venue=8;assert.equal(prestigeGain(legacy),0,'Ni après le dojo militaire');assert.equal(prestige(legacy),0);
legacy.venue=3;legacy.stage=21;legacy.kills=20;legacy.achievements=['first'];assert.equal(prestigeGain(legacy),2);
assert.equal(prestige(legacy,5000),2);assert.equal(legacy.seals,2);assert.equal(legacy.stage,1);assert.equal(legacy.venue,1);assert.equal(legacy.coins,0);assert.equal(legacy.runCoins,0);assert.equal(legacy.upgrades.power,1);assert.equal(legacy.kills,20);assert.deepEqual(legacy.achievements,['first']);
const f=new FlowMeter();for(let i=0;i<50;i++)f.hit('perfect',.5);assert.equal(f.armed,true);assert.equal(f.active,false);
assert.equal(f.beat({songTime:10}),true);assert.equal(f.remaining,32);f.beat({songTime:10});assert.equal(f.remaining,32);
for(let i=1;i<=31;i++)f.beat({songTime:10+i*.5});assert.equal(f.active,true);f.beat({songTime:26});assert.equal(f.active,false);assert.equal(f.charge,0);
const fast=new FlowMeter(),slow=new FlowMeter();for(let i=0;i<80;i++)fast.hit('perfect',.25);for(let i=0;i<40;i++)slow.hit('perfect',.5);assert.equal(fast.charge,slow.charge,'La densité des notes ne multiplie pas le Flow');
fast.charge=100;fast.armed=true;fast.beat({songTime:0});fast.resync(64);assert.equal(fast.active,false);
const map=demoMap('neon',112);for(let i=0;i<100;i++)assert.equal(map.event(i).action,'punch','Aucune esquive dans la session de frappe');
assert.ok(currentGoal(freshState()).label);const capped=freshState();addCoins(capped,NaN);assert.ok(Number.isFinite(capped.coins));
import("./dist/core.mjs").then(({songGrade,recordGrade})=>{
  assert.equal(songGrade({perfects:15,goods:0,notes:15}),null,"Moins de 16 notes : pas de note");
  assert.equal(songGrade({perfects:18,goods:0,notes:20}),"S");assert.equal(songGrade({perfects:16,goods:4,notes:20}),"S");
  assert.equal(songGrade({perfects:13,goods:4,notes:20}),"A");assert.equal(songGrade({perfects:9,goods:4,notes:20}),"B");assert.equal(songGrade({perfects:2,goods:4,notes:20}),"C");
  const g=freshState();assert.equal(recordGrade(g,"neon","B"),true);assert.equal(recordGrade(g,"neon","C"),false);assert.equal(g.grades.neon,"B");assert.equal(recordGrade(g,"neon","S"),true);assert.equal(recordGrade(g,"",  "S"),false);
  assert.deepEqual(restoreState({version:1,grades:{neon:"S",bad:"Z",x:5}}).grades,{neon:"S"},"Notes importées filtrées");assert.equal(restoreState(JSON.parse(JSON.stringify(g))).grades.neon,"S");
});
import("./dist/core.mjs").then(({dailyChallenge,challengeMet,completeChallenge,dailyStreak,previousDay})=>{
  const ids=["neon","chrome","after"],c=dailyChallenge("2026-11-16",ids);assert.deepEqual(dailyChallenge("2026-11-16",[...ids].reverse()),c,"Même défi quel que soit l’ordre");assert.ok(ids.includes(c.trackId));assert.equal(dailyChallenge("2026-11-16",[]),null);
  assert.equal(previousDay("2026-03-01"),"2026-02-28");assert.equal(challengeMet({kind:"combo",target:32},{combo:32}),true);assert.equal(challengeMet({kind:"grade",target:"A"},{grade:"B"}),false);assert.equal(challengeMet({kind:"grade",target:"A"},{grade:"S"}),true);assert.equal(challengeMet({kind:"perfects",target:40},{perfects:39}),false);
  const d=freshState();assert.equal(completeChallenge(d,"2026-11-15"),5);assert.equal(completeChallenge(d,"2026-11-15"),0,"Une seule récompense par jour");assert.equal(completeChallenge(d,"2026-11-16"),5.5);assert.equal(d.daily.streak,2);
  assert.equal(dailyStreak(d,"2026-11-17"),2);assert.equal(dailyStreak(d,"2026-11-19"),0);completeChallenge(d,"2026-11-19");assert.equal(d.daily.streak,1,"Un jour manqué relance la série sans rien retirer");
  assert.deepEqual(restoreState({version:1,daily:{lastDone:"hier",streak:3}}).daily,{lastDone:"",streak:0});assert.deepEqual(restoreState(JSON.parse(JSON.stringify(d))).daily,d.daily);
});
import("./dist/core.mjs").then(({BOONS,boonChoices,applyBoon,attackPower,sessionPayout})=>{
  const picks=boonChoices();assert.equal(picks.length,3);assert.equal(new Set(picks).size,3,"Trois dons différents");assert.ok(picks.every(id=>BOONS[id]));
  const b=freshState();b.venue=2;b.items=["mats","lockers"];const income=sessionPayout(b),power=attackPower(b);
  assert.equal(applyBoon(b,"income"),true);assert.ok(Math.abs(sessionPayout(b)-income*1.2)<.011,"Ferveur : +20 % de recette");applyBoon(b,"power");assert.ok(Math.abs(attackPower(b)-power*1.15)<1e-12);
  applyBoon(b,"word");assert.equal(b.boons.word,1);b.hp=1;const fans=b.fans;b.hp=1;damageEnemy(b,1);assert.equal(b.fans-fans,1.25,"Bouche-à-oreille : +25 % de fans");const before=b.coins;applyBoon(b,"coins");assert.ok(b.coins-before>=3);assert.equal(applyBoon(b,"nope"),false);
  assert.deepEqual(restoreState(JSON.parse(JSON.stringify(b))).boons,{income:1,power:1,word:1});assert.deepEqual(restoreState({version:1,boons:{income:-2,hack:5,crit:2}}).boons,{crit:2});
  b.pendingBoons=2;assert.equal(restoreState(JSON.parse(JSON.stringify(b))).pendingBoons,2,"Dons en attente sauvegardés");assert.equal(restoreState({version:1,pendingBoons:-3}).pendingBoons,0);
  b.stage=21;b.runCoins=12000;prestige(b);assert.deepEqual(b.boons,{},"La transmission remet les dons à zéro");assert.equal(b.pendingBoons,0);
});
import("./dist/core.mjs").then(({finisherReady,enemyHealth})=>{const f=freshState();assert.equal(finisherReady(f),false,'Sac neuf : pas de coup de grâce');f.hp=enemyHealth(1)*.3;assert.equal(finisherReady(f),true);f.stage=5;f.hp=enemyHealth(5)*.31;assert.equal(finisherReady(f),false,'Seuil relatif au sac renforcé');});
import("./dist/core.mjs").then(({ACHIEVEMENTS,rival,claimAchievements})=>{
  assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,ACHIEVEMENTS.length,"Identifiants de trophées uniques");assert.ok(ACHIEVEMENTS.length>=30);assert.ok(ACHIEVEMENTS.filter(a=>a.hidden).length>=3);
  const t=freshState();t.grades={a:"S",b:"A",c:"A"};t.daily={lastDone:"2026-11-16",streak:3};t.boons={income:3,power:2};const ids=claimAchievements(t).map(a=>a.id);for(const id of ["gradeS","gradeA3","daily1","daily3","boons5","fervor3"])assert.ok(ids.includes(id),id);assert.ok(!ids.includes("gradeS5")&&!ids.includes("daily7"));
  assert.equal(rival(1).hint,"DON DANS 4 SACS");assert.equal(rival(4).hint,"DON DANS 1 SAC");assert.equal(rival(5).boss,true);assert.equal(rival(6).boonIn,4);
});
import("./dist/core.mjs").then(({PERKS,buyPerk,perkCost,sealsAvailable,legacyMultiplier,completeChallenge,boonChoices})=>{
  const p=freshState();p.seals=4;const power=legacyMultiplier(p);assert.equal(perkCost(p,"headstart"),1);assert.equal(buyPerk(p,"headstart"),true);assert.equal(sealsAvailable(p),3);assert.equal(legacyMultiplier(p),power,"Dépenser un sceau garde son bonus");
  assert.equal(buyPerk(p,"fourth"),true);assert.equal(sealsAvailable(p),0);assert.equal(buyPerk(p,"reroll"),false,"Pas assez de sceaux");assert.equal(buyPerk(p,"nope"),false);assert.equal(perkCost(p,"fourth"),Infinity,"Niveau max");
  p.seals=20;buyPerk(p,"blessing");p.venue=3;p.runCoins=12000;prestige(p,1,()=>0);assert.equal(p.fans,50,"Relève assurée");assert.equal(Object.values(p.boons).reduce((n,v)=>n+v,0),1,"Bénédiction");assert.equal(p.perks.headstart,1,"Les achats survivent à la transmission");
  assert.equal(boonChoices(Math.random,4).length,4);const q=freshState();q.perks.devotion=1;assert.equal(completeChallenge(q,"2026-11-16"),10);
  const back=restoreState(JSON.parse(JSON.stringify(p)));assert.deepEqual(back.perks,p.perks);assert.equal(back.sealsSpent,p.sealsSpent);assert.equal(restoreState({version:1,seals:2,sealsSpent:9,perks:{fourth:5,x:1}}).sealsSpent,2);assert.deepEqual(restoreState({version:1,perks:{fourth:5,x:1}}).perks,{fourth:1});
});
console.log('Progression : achats, succès uniques, migration vers la Rue, sacs renforcés, transmission 2-7, Flow 32 temps, dons, défis et boutique de sceaux validés.');
