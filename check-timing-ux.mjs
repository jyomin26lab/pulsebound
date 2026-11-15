import assert from 'node:assert/strict';
import { RhythmMap } from './dist/rhythm.mjs';
import { createSongChart } from './dist/song-chart.mjs';
import { judgePlayable, calibrationResult } from './dist/input-timing.mjs';
import { AudioClock } from './dist/audio-clock.mjs';

const rhythm=new RhythmMap([0,.5,1,1.5].map((time,index)=>({time,index,action:'punch'})));
const resolved=new Set([0]);
assert.equal(judgePlayable(rhythm,.3,0,0,resolved).grade,'miss');
assert.equal(resolved.has(1),false,'Une tape trop tôt ne consomme pas la note');
assert.equal(judgePlayable(rhythm,.5,0,0,resolved).grade,'perfect');
resolved.add(1);
assert.equal(judgePlayable(rhythm,.55,0,0,resolved).index,2,'Pas de double frappe sur une note résolue');
assert.equal(rhythm.playable(2,3,resolved),null);

const builtIn={id:'neon',builtin:true,duration:10,bpm:120};
const charts=['relaxed','standard','intense'].map(density=>createSongChart(builtIn,{density}));
assert.ok(charts[0].events.length<=charts[1].events.length);
assert.ok(charts[1].events.length<charts[2].events.length);
assert.deepEqual(charts[0].beats,charts[2].beats,'La difficulté ne modifie pas la musique');
assert.ok(charts[0].events.every((event,i)=>!i||event.time-charts[0].events[i-1].time>=.38));
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
console.log('Musique : frappes précoces, densités, silence, détection incertaine et calibrage robuste validés.');
