// Rules of a musical duel, with no DOM and no audio: who strikes when, and what each note costs.
// A round is eight bars: the rival attacks for four, Nova answers for four. Every third round is the rival's assault. A master's style may change any of it (masters.mjs).
export const SALUTE_BEATS=4;
export const NOVA_HP=100,RIVAL_HP=350,FLOW_MAX=100,SURPRISE_WARN=.55;// seconds between a sudden blow's alert and its contact
export const FATIGUE={life:.1,blows:.15};// what each defeat takes off a master
const REFERENCE_NOTES=230;// a song of this length deals exactly the damage written in settle()
// Half-beats of a bar that carry a note, per level; the second list is for odd bars.
const PARRY=[[[0,4],[0,4,6]],[[0,2,4,6],[0,3,4,6]],[[0,2,3,4,6],[0,2,4,6,7]]];
const STRIKE=[[[0,2,4,6],[0,2,4,6]],[[0,2,4,6],[0,2,3,4,6]],[[0,2,3,4,6],[0,2,3,4,6,7]]];
// turn: beats each fighter attacks for; levels: note density of the first round, the next ones and the assaults; flips: sudden counters per round before and from the third; heavy: a heavy blow every round.
export const SHADOW={turn:16,levels:[0,1,2],flips:[1,2],darts:1,heavy:false,parry:PARRY};

export function phaseAt(beat,{turn,levels}=SHADOW){
  const b=Math.max(0,Math.floor(beat)),round=Math.floor(b/(turn*2)),assault=round%3===2;
  return {round,assault,type:b%(turn*2)<turn?'parry':'strike',level:levels[assault?2:round?1:0]};
}
/** Slow songs give two pulses per beat and fast ones one every other beat, so the patterns stay playable on any music. */
export function pulse(beats){
  const gaps=beats.slice(1).map((time,i)=>time-beats[i]).sort((a,b)=>a-b),gap=gaps[gaps.length>>1];
  if(gap<.4)return beats.filter((_,i)=>i%2===0);
  if(gap>.8)return beats.flatMap((time,i)=>i+1<beats.length?[time,(time+beats[i+1])/2]:[time]);
  return beats;
}
/** For an analysed song: no note in silence, and an off-beat only where the music really has an attack. Returns the note's time, or null. */
export function songFilter({events=[],waveform=[]},duration,shift=0){
  return (time,off)=>{
    if(off){const onset=events.find(e=>Math.abs(e.time+shift-time)<.04&&e.strength>=.2);return onset?onset.time+shift:null;}
    const level=waveform[Math.floor((time-shift)/duration*waveform.length)];
    return level===undefined||level>.04?time:null;
  };
}
// Sudden blows, from the second round on, at random so no fight can be learnt by heart: a strike note turns into a parry
// at the last moment ('flip'), or an extra blow darts in half a beat after an announced one ('dart').
function ambush(events,random,style){
  const pick=list=>list.splice(Math.floor(random()*list.length),1)[0],darts=[];
  for(let round=1;round<=(events.at(-1)?.round??0);round++){
    const apart=(a,b)=>Boolean(a&&b)&&b.time-a.time>=.38,inRound=events.map((e,i)=>({e,i})).filter(({e})=>e.round===round);
    let strikes=inRound.filter(({e})=>e.type==='strike').slice(3,-1).filter(({e,i})=>apart(events[i-1],e)&&apart(e,events[i+1]));
    for(let n=style.flips[round<3?0:1];n&&strikes.length;n--){
      const {e,i}=pick(strikes);e.type='parry';e.surprise='flip';strikes=strikes.filter(s=>Math.abs(s.i-i)>3);
    }
    let parries=inRound.filter(({e,i})=>e.type==='parry'&&!e.surprise&&!e.off&&!e.heavy&&events[i+1]?.type==='parry'&&!events[i+1].heavy&&events[i+1].time-e.time>=.4);
    for(let n=style.darts;n&&parries.length;n--){
      const {e,i}=pick(parries);darts.push({time:e.time+Math.min(e.step,events[i+1].time-e.time)/2,type:'parry',surprise:'dart',round});parries=parries.filter(p=>Math.abs(p.i-i)>2);
    }
  }
  return [...events,...darts].sort((a,b)=>a.time-b.time);
}
/** One note list for the whole song, from its beats. The last beat of every phase is silent: time to change hands. */
export function duelEvents(beats,{accept=time=>time,random=Math.random,style=SHADOW}={}){
  const events=[];
  for(let b=SALUTE_BEATS;b<beats.length-1;b++){
    const {type,level,assault,round}=phaseAt(b,style),step=beats[b+1]-beats[b],p=b%style.turn,bar=Math.floor(p/4),last=type==='parry'&&(assault||style.heavy&&round>0)&&p>=style.turn-3;
    if(p===style.turn-1||last&&p===style.turn-3)continue;
    const slots=last?[(p%4)*2]:(type==='parry'?style.parry:STRIKE)[level][bar%2];
    for(const half of [0,1])if(slots.includes((p%4)*2+half)){
      const time=accept(beats[b]+half*step/2,Boolean(half));
      if(time!==null)events.push({time,type,round,step,off:Boolean(half),...(last?{heavy:true}:{})});
    }
  }
  return ambush(events,random,style).map((event,index)=>({...event,index}));
}
/** Damage is spread over the song's notes, so a short song and a long one are the same fight. */
export function freshDuel(notes=REFERENCE_NOTES){return {scale:Math.max(.15,notes/REFERENCE_NOTES),nova:NOVA_HP,rival:RIVAL_HP,life:RIVAL_HP,hurt:1,power:1,critical:0,last:0,flow:0,combo:0,best:0,perfects:0,goods:0,notes:0,over:null};}
/** A master's fight, the same on any song: its life is a share of what a flawless player deals on these very notes, its blows a share of what parrying none of them costs. */
export function masterDuel(events,master,{power=1,critical=0,tired=0}={}){
  const s=freshDuel(events.length),total=(grade,loss)=>{const dry={...s,nova:Infinity,rival:Infinity};return events.reduce((sum,event)=>sum+settle(dry,event,grade)[loss],0);};
  const life=total('perfect','rivalLoss')*master.toughness*(1-tired*FATIGUE.life),hurt=NOVA_HP*master.hurt*(1-tired*FATIGUE.blows)/total('miss','novaLoss');
  return {...s,rival:life,life,hurt,power,critical,last:Math.floor(events.length*.92)};
}
/** Settle one note ('perfect', 'good' or 'miss'). Returns what the scene must show. */
export function settle(s,event,grade,random=Math.random){
  if(s.over)return null;
  const hit=grade!=='miss',perfect=grade==='perfect',full=s.flow>=FLOW_MAX,out={novaLoss:0,rivalLoss:0,broke:false,critical:false};
  s.notes++;if(perfect)s.perfects++;else if(hit)s.goods++;
  s.combo=hit?s.combo+1:0;s.best=Math.max(s.best,s.combo);
  if(event.type==='parry'){
    if(!hit)out.novaLoss=event.heavy?20:event.surprise?5:3.7;
    else if(event.surprise)out.rivalLoss=perfect?8:4;// a sudden blow stopped opens the rival
    else if(event.heavy&&full){out.broke=true;out.rivalLoss=30;}
    else if(perfect)out.rivalLoss=1;// riposte
    else out.novaLoss=event.heavy?8:.3;// guarded, but it stings
  }else if(hit){
    out.critical=s.critical>0&&random()<s.critical;
    out.rivalLoss=(perfect?4:2.5)*(full?1.5:1)*(out.critical?1.5:1);
  }
  out.novaLoss*=s.hurt/s.scale;out.rivalLoss*=s.power/s.scale;
  s.flow=out.broke?0:Math.max(0,Math.min(FLOW_MAX,s.flow+(perfect?4:hit?1:-25)));
  // A master's life cannot run out ahead of the song: whatever Nova's strength, it only falls on the last notes.
  const least=s.last?s.life*Math.max(0,1-(event.index+1)/s.last):0;
  s.nova=Math.max(0,s.nova-out.novaLoss);s.rival=Math.min(s.rival,Math.max(least,s.rival-out.rivalLoss));
  // Both can only fall on different notes, so there is never a double knock-out.
  if(!s.nova)s.over='ko-nova';else if(!s.rival)s.over='ko-rival';
  return out;
}
/** The song ran out: the fighter with the larger share of health left wins on points. */
export function onPoints(s){if(!s.over)s.over=s.nova/NOVA_HP>=s.rival/s.life?'points-nova':'points-rival';return s.over;}
export const won=s=>s.over==='ko-rival'||s.over==='points-nova';
