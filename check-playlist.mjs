import assert from 'node:assert/strict';
import { MusicLibrary,moveItem } from './dist/music-library.mjs';
import {impactSamples,freestyleInterval,reverbImpulse} from './dist/audio-sfx.mjs';
class MemoryStore{
  constructor(){this.records=new Map();this.queue=undefined;}
  async load(){return structuredClone({records:[...this.records.values()],queue:this.queue});}
  async write({queue,record,removeId}){if(record)this.records.set(record.id,structuredClone(record));if(removeId)this.records.delete(removeId);this.queue=structuredClone(queue);}
}
const store=new MemoryStore(),library=await new MusicLibrary(store).load();
assert.equal(library.items.length,3);
const track={id:'custom-a',title:'Mon morceau',blob:new Blob(['test'],{type:'audio/wav'}),duration:8,bpm:120,offset:.1,builtin:false};
assert.equal(await library.add(track),true);await library.select(track.id);assert.equal(library.current.title,'Mon morceau');
await library.move(track.id,0);assert.equal(library.items[0].id,track.id);
const reopened=await new MusicLibrary(store).load();assert.equal(reopened.current.id,track.id);assert.equal(await reopened.current.blob.text(),'test');assert.equal(reopened.items[0].id,track.id);
reopened.current.chart={source:'grid',bpm:120,offset:.1,segments:[{time:4,bpm:150}]};reopened.current.analysis={version:2,beatMap:{beats:[.1,.6,1.1]},waveform:[0,.5,1]};await reopened.persist({record:reopened.current});
const cached=(await new MusicLibrary(store).load()).current;assert.deepEqual(cached.chart.segments,[{time:4,bpm:150}]);assert.deepEqual(cached.analysis.waveform,[0,.5,1]);
const removed=await reopened.remove(track.id);assert.equal(store.records.has(track.id),false);assert.equal(reopened.selected,'neon');await reopened.restore(removed);assert.equal(reopened.items[0].id,track.id);assert.equal(store.records.has(track.id),true);
await reopened.select('after');reopened.repeat=false;assert.equal(reopened.next(),null);reopened.repeat=true;assert.equal(reopened.next(),track.id);
reopened.all.get('neon').bpm=98;await reopened.persist();assert.equal((await new MusicLibrary(store).load()).all.get('neon').bpm,98);
for(const item of [...reopened.items])await reopened.remove(item.id);const empty=await new MusicLibrary(store).load();assert.equal(empty.items.length,0);assert.equal(empty.current,null);assert.equal(empty.next(),null);await empty.addOriginal('chrome');assert.equal(empty.current.id,'chrome');
assert.deepEqual(moveItem(['a','b','c'],'a',2),['b','c','a']);assert.deepEqual(moveItem(['a'],'bad',0),['a']);
const unavailable=await new MusicLibrary({load:async()=>{throw Error('disabled');}}).load();assert.equal(unavailable.persistent,false);assert.equal(unavailable.items.length,3);
const normal=impactSamples(48000),critical=impactSamples(48000,{critical:true}),variant=impactSamples(48000,{variant:2,seed:99});
for(const samples of [normal,critical,variant]){
  assert.ok(samples[0]===0);assert.ok(samples.every(Number.isFinite));assert.ok(Math.max(...samples.map(Math.abs))<.85,'Pas de saturation numérique');
  const energy=(a,b)=>samples.slice(a,b).reduce((sum,x)=>sum+x*x,0)/Math.max(1,b-a);
  assert.ok(energy(0,2400)>energy(samples.length-960,samples.length)*20,'Attaque nette et fin amortie');assert.ok(Math.abs(samples.at(-1))<.002,'Pas de clic de fin');
}
assert.notDeepEqual(normal,variant);assert.ok(critical.length>normal.length);
assert.equal(freestyleInterval(1,NaN),.3);assert.equal(freestyleInterval(1,0),.5);assert.equal(freestyleInterval(1,.99),.085);
{const [left,right]=reverbImpulse(48000);assert.equal(left.length,Math.ceil(48000*1.6));assert.notDeepEqual(left.slice(2000,2100),right.slice(2000,2100),"Réverbe stéréo");const energy=(d,a,b)=>d.slice(a,b).reduce((s,v)=>s+v*v,0);assert.ok(energy(left,0,7680)>50*energy(left,69120,76800),"La queue de réverbe s’éteint");assert.ok(left.every(v=>Number.isFinite(v)&&Math.abs(v)<1));assert.ok(left.slice(0,500).every(v=>v===0),"Pré-délai");}
console.log('Playlist : fichiers persistés, sélection, ordre, suppression/annulation, boucle, liste vide et repli validés. SFX sans écrêtage, variantes et Freestyle validés.');
