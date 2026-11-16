// Plays songs back to back (2 min 30 at 112 BPM, one note per beat) and prints the play time needed to reach each dojo.
// Purchases happen between songs: cheapest equipment first, then expand; Poings when they cost under a quarter of the purse.
import {freshState,claimAchievements,addCoins,damageEnemy,hitDamage,buyUpgrade,upgradeCost,songGrade,sessionPayout,venueOf,buyItem,canExpand,expand,boonChoices,applyBoon,VENUES,MAX_VENUE} from './dist/core.mjs';
import {FlowMeter} from './dist/flow.mjs';
const SONG=150,BREAK=10,BPM=112,LIMIT_HOURS=400;
function simulate(mode,seed=7){
  let rng=seed;const random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
  const s={...freshState(0),boonsTaken:0},flow=new FlowMeter(),reached={1:0},period=60/BPM;let time=0,songs=0;
  while(s.venue<MAX_VENUE&&time<LIMIT_HOURS*3600){
    let combo=0,perfects=0,goods=0,notes=0;
    for(let beat=0;beat<SONG/period;beat++){
      const grade=mode==='beginner'?(beat%5===0?'miss':beat%5===1?'perfect':'good'):beat%5?'perfect':'good';
      notes++;combo=grade==='miss'?0:combo+1;
      if(flow.beat({songTime:beat*period}))s.flows++;
      if(grade==='miss'){flow.miss();continue;}
      if(grade==='perfect')perfects++;else goods++;
      s.hits++;s.bestCombo=Math.max(s.bestCombo,combo);s.perfects+=grade==='perfect'?1:0;
      addCoins(s,.01);damageEnemy(s,hitDamage(s,grade,combo,random()).damage*(flow.active?2.5:1),flow.active?2:1);flow.hit(grade,period);
    }
    while(s.bosses>s.boonsTaken){applyBoon(s,boonChoices(random)[0]);s.boonsTaken++;}
    addCoins(s,sessionPayout(s,songGrade({perfects,goods,notes})));claimAchievements(s);
    time+=SONG+BREAK;songs++;
    for(let bought=true;bought;){
      bought=false;
      const next=venueOf(s).items.filter(item=>!s.items.includes(item.id)).sort((a,b)=>a.cost-b.cost)[0];
      if(next&&buyItem(s,next.id))bought=true;
      else if(canExpand(s)){expand(s);reached[s.venue]=time;bought=true;}
      else if(upgradeCost(s,'power')<=s.coins*.25&&buyUpgrade(s,'power'))bought=true;
    }
  }
  return {mode,reached,songs,stage:s.stage,fans:Math.round(s.fans)};
}
const hours=t=>t<3600?Math.round(t/60)+' min':(t/3600).toFixed(1)+' h';
for(const mode of ['manual','beginner']){
  const r=simulate(mode);
  console.log(`\n${mode} — ${r.songs} morceaux, série ${r.stage}, ${r.fans} fans`);
  for(const v of VENUES)console.log(String(v.level).padStart(2),v.name.padEnd(26),r.reached[v.level]!==undefined?hours(r.reached[v.level]):'—');
}
