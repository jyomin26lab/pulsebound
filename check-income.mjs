import assert from 'node:assert/strict';
import {freshState,restoreState,VENUES,MAX_VENUE,venueOf,students,comfort,fullyEquipped,buyItem,recruitPlan,recruit,expandCost,canExpand,expand,sessionPayout,canJump,dimensionJump,canTransmit,prestigeGain,prestige,damageEnemy,enemyHealth,addCoins} from './dist/core.mjs';
// The ladder: 17 venues, each pricier than the last, equipment always cheaper as a whole than the next venue is out of reach.
assert.equal(VENUES.length,17);assert.equal(MAX_VENUE,17);assert.equal(VENUES[0].name,'La Rue');assert.equal(VENUES[9].name,'Rue alien');
for(let i=1;i<VENUES.length;i++)assert.ok(VENUES[i].price>VENUES[i-1].price,'Chaque dojo coûte plus cher que le précédent');
assert.equal(new Set(VENUES.flatMap(v=>v.items.map(item=>item.id))).size,VENUES.reduce((n,v)=>n+v.items.length,0),'Identifiants d’équipement uniques');
// Street: no students, the takings are the fans' tips; every broken bag brings a fan.
const s=freshState(0);
assert.equal(s.venue,1);assert.equal(students(s),0);assert.equal(sessionPayout(s),0,'Personne ne paie au début');
s.hp=1;assert.equal(damageEnemy(s,1),1);assert.equal(s.fans,1);damageEnemy(s,enemyHealth(2),2);assert.equal(s.fans,3,'Le Flow double les fans');
const tips=sessionPayout(s);assert.ok(tips>0);assert.equal(sessionPayout(s,'S'),Math.round(tips*2*100)/100,'Une note S double la recette');
// Equipment: bought once, only in the current venue, and only with enough coins.
assert.equal(buyItem(s,'bag'),false,'Pas assez de pièces');
s.coins=100;assert.equal(buyItem(s,'mats'),false,'Pas un objet de la Rue');
assert.equal(buyItem(s,'bag'),true);assert.equal(buyItem(s,'bag'),false,'Déjà installé');assert.ok(comfort(s)>1);
assert.equal(canExpand(s),false,'Tout équiper avant d’agrandir');buyItem(s,'speaker');assert.equal(fullyEquipped(s),true);
// Expand: pay the next venue, keep the rest of the purse and the fans, start with an empty room.
const fans=s.fans,purse=s.coins;assert.equal(canExpand(s),true);assert.equal(expand(s),true);
assert.equal(s.venue,2);assert.deepEqual(s.items,[]);assert.equal(s.fans,fans);assert.equal(s.coins,purse-VENUES[1].price);
s.coins=1e6;for(const item of venueOf(s).items)buyItem(s,item.id);assert.equal(students(s),6);
assert.ok(sessionPayout(s)>tips*10,'Les élèves paient bien plus que les pourboires');
// Transmission only between levels 2 and 7.
assert.equal(canTransmit(s),true);s.venue=1;assert.equal(canTransmit(s),false);s.venue=8;assert.equal(canTransmit(s),false);assert.equal(prestigeGain({...s,runCoins:1e9}),0);
s.venue=3;s.items=[];s.runCoins=12000;assert.equal(prestige(s),1);assert.equal(s.venue,1);assert.equal(s.fans,0);assert.equal(s.coins,0);
// Dimension jump: only from a fully equipped level 17; back to the street, takings ×2 for good, seals kept.
const d=freshState();d.venue=17;d.seals=3;assert.equal(canJump(d),false);
d.items=venueOf(d).items.map(item=>item.id);assert.equal(canJump(d),true);assert.equal(expandCost(d),Infinity);
const before=sessionPayout({...freshState(),fans:100});assert.equal(dimensionJump(d),true);
assert.equal(d.venue,1);assert.equal(d.dimension,1);assert.equal(d.seals,3);assert.deepEqual(d.items,[]);
d.fans=100;assert.equal(sessionPayout(d),Math.round(before*2*1.6*100)/100,'Recette ×2 par dimension (et sceaux)');
// Save: venue, equipment of that venue, fans and dimension survive; nonsense is filtered.
const saved=restoreState(JSON.parse(JSON.stringify({...d,venue:2,items:['mats','bag','hack'],fans:42})));
assert.equal(saved.venue,2);assert.deepEqual(saved.items,['mats']);assert.equal(saved.fans,42);assert.equal(saved.dimension,1);
const bad=restoreState({version:1,venue:99,items:'x',fans:-5,dimension:1.5});assert.equal(bad.venue,17);assert.deepEqual(bad.items,[]);assert.equal(bad.fans,0);assert.equal(bad.dimension,0);
addCoins(d,NaN);assert.ok(Number.isFinite(d.coins));
// First students in one tap: the real path costs 39 coins from a fresh save (3 + 6 + 25 + 5), never half-bought.
{const r=freshState();assert.equal(recruitPlan(r).cost,39);assert.equal(recruitPlan(r).students,2);r.coins=38.99;assert.equal(recruit(r),false);assert.equal(r.venue,1);assert.deepEqual(r.items,[]);
r.coins=40;assert.equal(recruit(r),true);assert.equal(r.venue,2);assert.equal(students(r),2);assert.ok(Math.abs(r.coins-1)<1e-9);assert.equal(recruitPlan(r),null);assert.equal(recruit(r),false);
const h=freshState();h.venue=2;h.items=[];h.coins=5;assert.equal(recruitPlan(h).cost,5);assert.equal(recruit(h),true);assert.equal(students(h),2);}
console.log('Dojos : 17 niveaux, fans, équipements, agrandissement, premier recrutement à 39 pièces, recette de séance, transmission 2-7, saut de dimension et sauvegarde vérifiés.');
