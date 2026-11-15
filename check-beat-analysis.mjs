import assert from 'node:assert/strict';
import { detectBeatMap } from './dist/beat-analysis.mjs';
const rate=100,novelty=new Float32Array(1300),onsets=[],expected=[];
for(let beat=0;beat<20;beat++){
  const time=2.13+beat*.5;expected.push(time);
  if(beat!==8){novelty[Math.round(time*rate)]=1;onsets.push({time,strength:1});}
  const half=time+.25;novelty[Math.round(half*rate)]=.35;onsets.push({time:half,strength:.35});
}
onsets.sort((a,b)=>a.time-b.time);
const map=detectBeatMap(novelty,rate,{tempo:{bpm:120,confidence:.9},onsets,duration:13});
assert.ok(map.beats.length>=19&&map.beats.length<=21);
assert.ok(Math.abs(map.offset-2.13)<.03,'Pas de faux beats dans l’introduction silencieuse');
for(const time of expected)assert.ok(map.beats.some(t=>Math.abs(t-time)<.04),`Beat manquant à ${time}`);
assert.ok(map.halfBeats.some(t=>Math.abs(t-2.38)<.04));
assert.ok(map.confidence>.7);
const variable=new Float32Array(1200),variableOnsets=[];
let time=.13;
for(let beat=0;beat<24;beat++){
  variable[Math.round(time*rate)]=1;variableOnsets.push({time,strength:1});time+=beat<10?.5:.4;
}
const changing=detectBeatMap(variable,rate,{tempo:{bpm:120,confidence:.8},onsets:variableOnsets,duration:12});
for(const onset of variableOnsets.slice(-6))assert.ok(changing.beats.some(t=>Math.abs(t-onset.time)<.04),'Le suivi doit accepter un changement de tempo modéré');
assert.equal(detectBeatMap(new Float32Array(100),rate,{tempo:{bpm:120}}).beats.length,0);
assert.equal(detectBeatMap(novelty,rate).bpm,null);
assert.throws(()=>detectBeatMap(novelty,0),RangeError);
assert.deepEqual(JSON.parse(JSON.stringify(map)).beats,map.beats);
console.log('Beat map : temps/demi-temps distincts des onsets, offset, beat manquant, silence et tempo variable validés.');
