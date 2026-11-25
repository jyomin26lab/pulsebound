// Plays songs back to back (2 min 30 at 112 BPM, one note per beat) and prints the play time needed to reach each dojo,
// the median of nine games: the boons drawn make one game up to a quarter faster or slower than another.
// Purchases happen between songs: cheapest equipment first, then the master's duel (a song of its own, fought again until won), then expand;
// Poings when they cost under a quarter of the purse.
import {freshState,claimAchievements,addCoins,damageEnemy,hitDamage,buyUpgrade,upgradeCost,songGrade,sessionPayout,venueOf,buyItem,canExpand,expand,canChallenge,settleMaster,masterOf,masterEdge,critChance,boonChoices,applyBoon,VENUES,MAX_VENUE} from './dist/core.mjs';
import {FlowMeter} from './dist/flow.mjs';
import {duelEvents,masterDuel,settle,onPoints,won,pulse} from './dist/duel-core.mjs';
import {gridBeats} from './dist/song-chart.mjs';
const SONG=150,BREAK=10,BPM=112,LIMIT_HOURS=400,BEATS=pulse(gridBeats(SONG,{bpm:BPM,offset:0,segments:[]}));
function fight(s,mode,random){
  const master=masterOf(s),events=duelEvents(BEATS,{random,style:master.style}),duel=masterDuel(events,master,{power:masterEdge(s,master),critical:critChance(s),tired:s.tired});
  for(const event of events){
    const r=random();settle(duel,event,mode==='beginner'?(r<.2?'perfect':r<.8?'good':'miss'):r<.8?'perfect':'good',random);
    if(duel.over)break;
  }
  onPoints(duel);const victory=won(duel),opened=settleMaster(s,master.level,victory);
  addCoins(s,(duel.perfects+duel.goods)*.01+(victory?sessionPayout(s,songGrade(duel)):0));return opened;
}
function simulate(mode,seed=7){
  let rng=seed;const random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
  const s={...freshState(0),boonsTaken:0},flow=new FlowMeter(),reached={1:0},losses={},period=60/BPM;let time=0,songs=0;
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
      while(canChallenge(s)){const level=s.venue;if(!fight(s,mode,random))losses[level]=(losses[level]||0)+1;time+=SONG+BREAK;songs++;}
      const next=venueOf(s).items.filter(item=>!s.items.includes(item.id)).sort((a,b)=>a.cost-b.cost)[0];
      if(next&&buyItem(s,next.id))bought=true;
      else if(canExpand(s)){expand(s);reached[s.venue]=time;bought=true;}
      else if(upgradeCost(s,'power')<=s.coins*.25&&buyUpgrade(s,'power'))bought=true;
    }
  }
  return {mode,reached,losses,songs,stage:s.stage,fans:Math.round(s.fans)};
}
const hours=t=>t<3600?Math.round(t/60)+' min':(t/3600).toFixed(1)+' h';
for(const mode of ['manual','beginner']){
  const games=Array.from({length:9},(_,i)=>simulate(mode,7+i*7919)),median=pick=>games.map(pick).sort((a,b)=>a-b)[4];
  console.log(`\n${mode} — ${median(r=>r.songs)} morceaux, série ${median(r=>r.stage)}, ${median(r=>r.fans)} fans`);
  for(const v of VENUES)console.log(String(v.level).padStart(2),v.name.padEnd(26),(games.every(r=>r.reached[v.level]!==undefined)?hours(median(r=>r.reached[v.level])):'—').padEnd(9),'défaites contre son maître : '+median(r=>r.losses[v.level]||0));
}
