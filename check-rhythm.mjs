import assert from 'node:assert/strict';
import { analyzeTrack, RhythmMap, demoMap } from './dist/rhythm.mjs';
const rate=11025,times=[.13,.63,.91,1.42,1.83,2.41,2.68,3.05,3.87,4.1,4.47,5.14,5.6,6.07,6.44,7.12];
const samples=new Float32Array(rate*8);
for(let event=0;event<times.length;event++){
  const start=Math.round(times[event]*rate),freq=[90,650,3200][event%3];
  for(let i=0;i<Math.round(.11*rate);i++)samples[start+i]+=Math.sin(i/rate*freq*2*Math.PI)*Math.exp(-i/(rate*.018))*.7;
}
const result=analyzeTrack(samples,rate);
for(const time of times)assert.ok(result.events.some(e=>Math.abs(e.time-time)<.04),`Attaque manquée à ${time}s`);
assert.ok(result.events.length<=times.length+2,'Trop de faux accents');
const silent=analyzeTrack(new Float32Array(rate*8),rate);
assert.equal(silent.events.length,0);assert.deepEqual(silent.beatMap.beats,[]);assert.equal(silent.beatMap.offset,null);assert.equal(silent.duration,8);
assert.deepEqual(analyzeTrack([],0).beatMap.beats,[]);
const late=new Float32Array(rate*96);
for(const time of [.13,.78,94.17,95.11]){
  const start=Math.round(time*rate);for(let i=0;i<700;i++)late[start+i]=Math.sin(i*.17)*Math.exp(-i/100);
}
assert.ok(analyzeTrack(late,rate).events.some(e=>Math.abs(e.time-94.17)<.04),'L’analyse doit couvrir la fin du morceau, après 90 s');
const held=new Float32Array(rate*4);
for(let i=rate;i<rate*3;i++)held[i]=Math.sin(i/rate*2*Math.PI*440)*.3;
assert.ok(analyzeTrack(held,rate).events.length<=2,'Une note tenue ne doit pas créer une grille de faux accents');
const map=new RhythmMap(result.events);
const first=map.event(0);assert.equal(map.judge(first.time+.01).grade,'perfect');
assert.equal(map.nearest(100).index,result.events.length-1);
assert.ok(result.events.every(e=>e.action==='punch'));
const demo=demoMap('neon',112);
assert.ok(demo.events.some((e,i)=>i&&Math.abs(e.time-demo.events[i-1].time-60/112)>.1));
assert.ok(demo.event(10000).time>0);
assert.equal(demo.nearest(demo.event(10000).time).index,10000);
assert.equal(new RhythmMap([]).judge(1),null);
assert.equal(new RhythmMap([]).next('dodge',0),null);
console.log('Accents non réguliers, fréquences, silences, jugements et boucles validés.');
