import assert from 'node:assert/strict';
import {freshState,restoreState,VENUES,MAX_VENUE,venueOf,students,comfort,fullyEquipped,masterOf,masterBeaten,canChallenge,settleMaster,masterEdge,forceLevel,MAX_TIRED,currentGoal,buyItem,recruitPlan,recruit,expandCost,canExpand,expand,sessionPayout,canJump,dimensionJump,canTransmit,autoUnlocked,prestigeGain,prestige,damageEnemy,enemyHealth,addCoins} from './dist/core.mjs';
// The ladder: 17 venues, each pricier than the last, equipment always cheaper as a whole than the next venue is out of reach.
assert.equal(VENUES.length,17);assert.equal(MAX_VENUE,17);assert.equal(VENUES[0].name,'La Rue');assert.equal(VENUES[9].name,'Rue alien');
for(let i=1;i<VENUES.length;i++)assert.ok(VENUES[i].price>VENUES[i-1].price,'Chaque dojo coûte plus cher que le précédent');
assert.equal(new Set(VENUES.flatMap(v=>v.items.map(item=>item.id))).size,VENUES.reduce((n,v)=>n+v.items.length,0),'Identifiants d’équipement uniques');
// Street: no students yet, the takings are the fans' tips; every broken bag brings a fan.
const s=freshState(0);
assert.equal(s.venue,1);assert.equal(students(s),0);assert.equal(sessionPayout(s),0,'Personne ne paie au début');
s.hp=1;assert.equal(damageEnemy(s,1),1);assert.equal(s.fans,1);damageEnemy(s,enemyHealth(2),2);assert.equal(s.fans,3,'Le Flow double les fans');
const tips=sessionPayout(s);assert.ok(tips>0);assert.equal(sessionPayout(s,'S'),Math.round(tips*2*100)/100,'Une note S double la recette');
// Equipment: bought once, only in the current venue, and only with enough coins.
assert.equal(buyItem(s,'bag'),false,'Pas assez de pièces');
s.coins=100;assert.equal(buyItem(s,'mats'),false,'Pas un objet de la Rue');
assert.equal(buyItem(s,'bag'),true);assert.equal(buyItem(s,'bag'),false,'Déjà installé');assert.ok(comfort(s)>1);
assert.equal(canExpand(s),false,'Tout équiper avant d’agrandir');buyItem(s,'speaker');assert.equal(fullyEquipped(s),true);
// Its master first: nothing opens before the duel is won; each defeat tires the master, up to a limit; only the next one counts.
assert.equal(canChallenge(s),true);assert.equal(canExpand(s),false,'Le maître garde la porte');assert.equal(expand(s),false);assert.equal(currentGoal(s).label,'Battre '+masterOf(s).name);
for(let i=1;i<7;i++){assert.equal(settleMaster(s,1,false),false);assert.equal(s.tired,Math.min(MAX_TIRED,i));}
assert.equal(settleMaster(s,3,true),false,'On ne saute pas de maître');assert.equal(s.masters,0);
assert.equal(settleMaster(s,1,true),true);assert.equal(s.masters,1);assert.equal(s.tired,0);assert.equal(masterBeaten(s),true);assert.equal(canChallenge(s),false);
assert.equal(settleMaster(s,1,false),false);assert.equal(s.tired,0,'Une revanche pour le plaisir ne fatigue personne');
// Half price: moving in costs half of what the venue's equipment is priced on.
assert.equal(VENUES[1].price,12.5);assert.equal(VENUES[1].items.reduce((n,item)=>n+item.cost,0),70,'Le prix des équipements ne bouge pas');
// Force: the advised level hits fully; it weighs between ×0.6 and ×1.5, and seals count as Force.
const force=level=>({...freshState(),upgrades:{power:level,focus:0,fury:0}}),m5={...masterOf({venue:5})};
assert.equal(masterEdge(force(m5.force),m5),1);assert.ok(masterEdge(force(0),m5)<.7&&masterEdge(force(100),m5)===1.5);assert.ok(forceLevel({...force(10),seals:5})>10);
// Expand: pay the next venue, keep the rest of the purse and the fans, start with an empty room.
const fans=s.fans,purse=s.coins;assert.equal(canExpand(s),true);assert.equal(expand(s),true);
assert.equal(s.venue,2);assert.deepEqual(s.items,[]);assert.equal(s.fans,fans);assert.equal(s.coins,purse-VENUES[1].price);
s.coins=1e6;for(const item of venueOf(s).items)buyItem(s,item.id);assert.equal(students(s),6);
assert.ok(sessionPayout(s)>tips*10,'Les élèves paient bien plus que les pourboires');
// Transmission only between levels 2 and 7.
assert.equal(canChallenge(s),true,'Chaque dojo a son maître');
assert.equal(canTransmit(s),true);s.venue=1;assert.equal(canTransmit(s),false);s.venue=8;assert.equal(canTransmit(s),false);assert.equal(prestigeGain({...s,runCoins:1e9}),0);
s.venue=3;s.items=[];s.runCoins=12000;s.masters=2;assert.equal(prestige(s),1);assert.equal(s.masters,2,'Battu pour toujours');assert.equal(masterBeaten(s),true);assert.equal(s.venue,1);assert.equal(s.fans,0);assert.equal(s.coins,0);
// Dimension jump: only from a fully equipped level 17; back to the street, takings ×2 for good, seals kept.
const d=freshState();d.venue=17;d.seals=3;d.masters=16;assert.equal(masterOf(d),null,'Le dernier dojo n’a pas de maître');assert.equal(canJump(d),false);
d.items=venueOf(d).items.map(item=>item.id);assert.equal(canJump(d),true);assert.equal(expandCost(d),Infinity);
const before=sessionPayout({...freshState(),fans:100});assert.equal(dimensionJump(d),true);
assert.equal(d.venue,1);assert.equal(d.masters,16);assert.equal(d.dimension,1);assert.equal(d.seals,3);assert.deepEqual(d.items,[]);
d.fans=100;assert.equal(sessionPayout(d),Math.round(before*2*1.6*100)/100,'Recette ×2 par dimension (et sceaux)');
// Save: venue, equipment of that venue, fans and dimension survive; nonsense is filtered.
const saved=restoreState(JSON.parse(JSON.stringify({...d,venue:2,items:['mats','bag','hack'],fans:42})));
assert.equal(saved.venue,2);assert.deepEqual(saved.items,['mats']);assert.equal(saved.fans,42);assert.equal(saved.dimension,1);
const bad=restoreState({version:1,venue:99,items:'x',fans:-5,dimension:1.5});assert.equal(bad.venue,17);assert.deepEqual(bad.items,[]);assert.equal(bad.fans,0);assert.equal(bad.dimension,0);
// Saves from before the masters keep every door already opened; nonsense is filtered.
for(const [raw,masters,tired] of [[{venue:4},3,0],[{venue:1,achievements:['room','gym','renown']},4,0],[{venue:1,achievements:['room']},1,0],[{venue:2,dimension:1},16,0],[{venue:3,masters:1,tired:9},2,4],[{venue:3,masters:99,tired:-2},16,0],[{venue:6,masters:'x',tired:.5},5,0]]){const r=restoreState({version:1,...raw});assert.equal(r.masters,masters,JSON.stringify(raw));assert.equal(r.tired,tired);}
addCoins(d,NaN);assert.ok(Number.isFinite(d.coins));
// First student in the street: the very first purchase (3 coins) brings one, who pays from the first song on.
{const r=freshState();assert.equal(recruitPlan(r).cost,3);assert.equal(recruitPlan(r).students,1);r.coins=2.99;assert.equal(recruit(r),false);assert.deepEqual(r.items,[]);
r.coins=4;assert.equal(recruit(r),true);assert.equal(r.venue,1);assert.equal(students(r),1);assert.ok(Math.abs(r.coins-1)<1e-9);assert.ok(sessionPayout(r)>=.5);assert.equal(recruitPlan(r),null);assert.equal(recruit(r),false);
assert.equal(VENUES[9].items.reduce((n,item)=>n+item.students,0),16,'La Rue alien garde ses 16 élèves');
// Auto strike: locked in a first street, opened by the first hall, kept after a transmission or a dimension jump.
assert.equal(autoUnlocked(r),false);assert.equal(autoUnlocked({...r,venue:2}),true);assert.equal(autoUnlocked({...r,prestiges:1}),true);assert.equal(autoUnlocked({...r,dimension:1}),true);
const h=freshState();h.venue=2;h.items=[];h.coins=5;assert.equal(recruitPlan(h).cost,5);assert.equal(recruit(h),true);assert.equal(students(h),2);}
console.log('Dojos : 17 niveaux, fans, équipements, maître à battre, agrandissement à moitié prix, premier élève à 3 pièces, Frappe auto à la première salle, recette de séance, transmission 2-7, saut de dimension et sauvegarde vérifiés.');
