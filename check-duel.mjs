import assert from 'node:assert/strict';
import { gridBeats } from './dist/song-chart.mjs';
import { RhythmMap } from './dist/rhythm.mjs';
import { duelEvents, phaseAt, pulse, songFilter, freshDuel, settle, onPoints, won, NOVA_HP, RIVAL_HP, FLOW_MAX, SURPRISE_WARN } from './dist/duel-core.mjs';

let seed=7;const random=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
const grid=(bpm,duration)=>pulse(gridBeats(duration,{bpm,offset:0,segments:[]}));
const beats=grid(112,120),events=duelEvents(beats,{random}),beat=60/112;
assert.ok(events.length>150&&events.every((e,i)=>e.index===i&&(!i||e.time>events[i-1].time)),'Notes croissantes et numérotées');
assert.ok(events[0].time>=4*beat-1e-4,'Une mesure de salut avant la première attaque');
for(const [i,e] of events.entries()){
  const phase=phaseAt(e.time/beat+1e-3).type;
  assert.equal(e.type,e.surprise==='flip'?'parry':phase,'Chaque note appartient à la phase en cours, sauf une attaque surprise');
  if(e.surprise==='flip')assert.equal(phase,'strike','Une contre-attaque tombe pendant ton tour');
  else if(i&&!events[i-1].surprise&&events[i-1].type!==e.type)assert.ok(e.time-events[i-1].time>=beat-1e-3,'Le temps de changer de main');
}
const heavy=events.filter(e=>e.heavy);
assert.equal(heavy.length,2,'Un coup lourd par assaut');
for(const e of heavy)assert.ok(e.time-events[e.index-1].time>=2*beat-1e-3,'Silence avant le coup lourd');

// Sudden blows: none while learning, then some in every round, never at the same place twice, always playable.
for(const bpm of [60,90,112,144,174,220]){
  const list=duelEvents(grid(bpm,180),{random}),map=new RhythmMap(list),sudden=list.filter(e=>e.surprise);
  assert.ok(sudden.length>=6,'Des attaques surprises à '+bpm+' BPM ('+sudden.length+')');
  assert.ok(sudden.every(e=>e.round>0&&!e.heavy&&e.type==='parry'),'Aucune surprise dans la première manche, aucune sur un coup lourd');
  assert.ok(sudden.some(e=>e.surprise==='flip')&&sudden.some(e=>e.surprise==='dart'),'Les deux sortes de surprises');
  for(const e of sudden){
    const before=list[e.index-1],after=list[e.index+1];
    assert.ok(e.time-before.time>=(e.surprise==='flip'?.38:.2)-1e-6&&after.time-e.time>=.19,'Une surprise reste jouable à '+bpm+' BPM');
    if(e.surprise==='flip')assert.ok(!before.surprise&&!after.surprise,'Jamais deux surprises de suite');
  }
  for(const e of list)assert.ok(map.windows(e).perfect>=.06&&map.windows(e).good>=.08,'Fenêtres jouables à '+bpm+' BPM');
}
assert.ok(SURPRISE_WARN>=.5&&SURPRISE_WARN<=.7,'Très rapide, mais au-dessus du temps de réaction');
const places=()=>duelEvents(beats,{random}).filter(e=>e.surprise).map(e=>e.time.toFixed(2)).join();
assert.notEqual(places(),places(),'Deux duels ne se ressemblent pas');

// Any song: silence stays empty, off-beats follow the music, short and long songs are the same fight.
const song={events:[{time:10.26,strength:.5},{time:12.26,strength:.1}],waveform:Array.from({length:100},(_,i)=>i<5?0:.6)},filter=songFilter(song,100,0);
assert.equal(filter(2,false),null,'Pas de note dans le silence');assert.equal(filter(20,false),20);
assert.equal(filter(10.25,true),10.26,'Un contretemps suit l’attaque entendue');assert.equal(filter(12.25,true),null);assert.equal(filter(30.25,true),null);
assert.equal(songFilter(song,100,.5)(10.75,true),10.76,'Le calage du joueur déplace aussi les contretemps');
assert.deepEqual(duelEvents([]),[]);

const play=(judge,list=duelEvents(beats,{random}))=>{const s=freshDuel(list.length);let end=list.length;for(const e of list){settle(s,e,judge(e));if(s.over){end=e.index;break;}}if(!s.over)onPoints(s);return {...s,at:end/list.length};};
const skill=(perfect,good)=>()=>{const r=random();return r<perfect?'perfect':r<perfect+good?'good':'miss';};
const rate=(perfect,good,song=beats)=>Array.from({length:200},()=>play(skill(perfect,good),duelEvents(song,{random})));
const wins=list=>list.filter(won).length/list.length;

assert.equal(play(()=>'miss').over,'ko-nova','Ne rien faire perd');
const flawless=play(()=>'perfect',events);assert.equal(flawless.over,'ko-rival');assert.equal(flawless.nova,NOVA_HP);
assert.ok(flawless.at*events.length>heavy[0].index&&flawless.at<.95,'Un sans-faute gagne avant la fin, mais après le premier coup lourd ('+flawless.at.toFixed(2)+')');
for(const [name,song] of [['Neon Ronin',beats],['court',grid(128,60)],['long',grid(128,300)],['rapide',grid(174,180)],['lent',grid(70,200)]]){
  const strong=wins(rate(.6,.35,song)),fair=wins(rate(.35,.5,song)),weak=wins(rate(.15,.4,song)),masher=wins(rate(.05,.25,song));
  console.log(name.padEnd(10),'solide '+strong+', moyen '+fair+', débutant '+weak+', martèlement '+masher);
  assert.ok(strong>.95,'Un bon joueur gagne');assert.ok(fair>.35&&fair<.97,'Un joueur moyen a un vrai combat');assert.ok(weak<.2&&masher<.02,'Marteler ne suffit pas');
}

const strikeNote=events.find(e=>e.type==='strike'),parryNote=events.find(e=>e.type==='parry'&&!e.surprise),suddenNote=events.find(e=>e.surprise);
const s=freshDuel();settle(s,strikeNote,'good');const plain=RIVAL_HP-s.rival;s.flow=FLOW_MAX;const before=s.rival;settle(s,strikeNote,'good');
assert.ok(Math.abs(before-s.rival-plain*1.5)<1e-9,'Le Flow plein renforce les coups');
settle(s,parryNote,'miss');assert.ok(s.flow<FLOW_MAX&&s.combo===0&&s.nova<NOVA_HP,'Une parade ratée coûte de la vie, le combo et du Flow');
const b=freshDuel();b.flow=FLOW_MAX;assert.ok(settle(b,heavy[0],'good').broke&&b.flow===0&&b.nova===NOVA_HP,'Un Flow plein brise le coup lourd');
const g=freshDuel();assert.ok(!settle(g,heavy[0],'good').broke&&g.nova<NOVA_HP,'Sans Flow, le coup lourd passe en partie');
const d=freshDuel();settle(d,suddenNote,'good');assert.ok(d.nova===NOVA_HP&&d.rival<RIVAL_HP,'Une surprise parée ouvre l’Ombre');settle(d,suddenNote,'miss');assert.ok(d.nova<NOVA_HP,'Une surprise ratée blesse');
const done=freshDuel();done.over='ko-rival';assert.equal(settle(done,strikeNote,'perfect'),null,'Plus rien après le K.-O.');
assert.equal(onPoints({...freshDuel(),rival:RIVAL_HP*.5,nova:NOVA_HP*.4}),'points-rival');
console.log(events.length+' notes, alternance, '+events.filter(e=>e.surprise).length+' attaques surprises, coups lourds, Flow et équilibrage du duel validés.');
