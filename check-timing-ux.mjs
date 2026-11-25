import assert from 'node:assert/strict';
import { RhythmMap } from './dist/rhythm.mjs';
import { createSongChart } from './dist/song-chart.mjs';
import { judgePlayable, calibrationResult } from './dist/input-timing.mjs';
import { songGrade } from './dist/core.mjs';
import { AudioClock } from './dist/audio-clock.mjs';

const rhythm=new RhythmMap([0,.5,1,1.5].map((time,index)=>({time,index,action:'punch'})));
const resolved=new Set([0]);
assert.equal(judgePlayable(rhythm,.2,0,0,resolved).grade,'miss');
assert.equal(judgePlayable(rhythm,.2,0,0,resolved).early,false,'Une tape bien avant la note la laisse disponible');
assert.equal(judgePlayable(rhythm,.3,0,0,resolved).early,true,'Une tape juste avant la fenêtre perd la note');
assert.equal(judgePlayable(rhythm,.36,0,0,resolved).early,false,'Dans la fenêtre, la note est touchée');
assert.equal(judgePlayable(rhythm,.5,0,0,resolved).grade,'perfect');
resolved.add(1);
assert.equal(judgePlayable(rhythm,.55,0,0,resolved).index,2,'Pas de double frappe sur une note résolue');
assert.equal(rhythm.playable(2,3,resolved),null);

const builtIn={id:'neon',builtin:true,duration:10,bpm:120};
const charts=['relaxed','standard','intense'].map(density=>createSongChart(builtIn,{density}));
assert.ok(charts[0].events.length<charts[1].events.length*.65,'Détente retire vraiment des notes');
assert.ok(charts[1].events.length<charts[2].events.length);
assert.deepEqual(charts[0].beats,charts[2].beats,'La difficulté ne modifie pas la musique');
assert.ok(charts[0].events.every((event,i)=>!i||event.time-charts[0].events[i-1].time>=.38));
const slow=density=>createSongChart({id:'neon',builtin:true,duration:60,bpm:70},{density}).events.length;
assert.equal(slow('relaxed'),slow('standard'),'Un morceau déjà lent garde tous ses temps');

// Hammering never replaces listening; a player who follows the notes keeps the same grade as before.
let seed=7;const random=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
function run({events,rhythm},taps){
  const done=new Set();let expired=-1,perfects=0,goods=0,missed=0,combo=0,best=0;
  const expire=time=>{for(let e;(e=events[expired+1])&&time>e.time+rhythm.windows(e).good;expired++)if(!done.has(e.index)){missed++;combo=0;}};
  for(const time of taps){
    expire(time);const j=judgePlayable(rhythm,time,0,expired,done);if(!j)continue;
    if(j.grade!=='miss'){done.add(j.index);if(j.grade==='perfect')perfects++;else goods++;best=Math.max(best,++combo);}
    else if(j.early){done.add(j.index);missed++;combo=0;}
  }
  expire(Infinity);assert.equal(perfects+goods+missed,events.length,'Chaque note est jugée une fois');
  return {best,grade:songGrade({perfects,goods,notes:events.length})};
}
for(const [id,bpm] of [['neon',112],['chrome',144],['after',90]]){
  const chart=createSongChart({id,builtin:true,duration:120,bpm},{density:'standard'});
  for(const rate of [4,6,9,12]){
    const taps=[];for(let time=.3;time<120;time+=(.9+.2*random())/rate)taps.push(time);
    const r=run(chart,taps);assert.equal(r.grade,'C',id+' : marteler '+rate+' fois par seconde');assert.ok(r.best<40,id+' : pas de combo en martelant ('+r.best+')');
  }
  const player=run(chart,chart.events.map(e=>e.time+(random()-.5)*.14));
  assert.ok(player.grade==='S'&&player.best===chart.events.length,id+' : un joueur à moins de 70 ms ne perd rien');
}
const empty=createSongChart({duration:10,analysis:{events:[],waveform:Array(100).fill(0),beatMap:{beats:[],confidence:0}}});
assert.equal(empty.events.length,0,'Une analyse silencieuse ne devient pas une grille inventée');
const attacks=[.34,1.05,2.7].map(time=>({time,strength:.8,kind:'note'}));
const uncertain=createSongChart({duration:5,analysis:{events:attacks,beatMap:{beats:[],confidence:0}}});
assert.deepEqual(uncertain.events.map(event=>event.time),attacks.map(event=>event.time),'Sans tempo fiable, conserver les attaques réellement détectées');

const offsets=[78,82,79,77,81,80,83,78,79,84,240,-170];
assert.ok(Math.abs(calibrationResult(offsets).offset-80)<=2);
assert.equal(calibrationResult([10,20,30]),null);
assert.equal(calibrationResult([-200,200,-180,180,-160,160,-140,140,-120,120]),null);
const context={state:'running',currentTime:4,baseLatency:.01,outputLatency:.09};
const clock=new AudioClock(context);clock.start({at:2});
assert.ok(Math.abs(clock.outputPositionAt()-1.9)<1e-9,'Repli sur la latence audio déclarée');
clock.start({at:5});assert.ok(clock.outputPositionAt(1000,{preroll:true})<0,'Temps de préparation visible avant le premier beat');
console.log('Musique : frappes précoces, martèlement, densités, silence, détection incertaine et calibrage robuste validés.');
