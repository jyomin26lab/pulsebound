import assert from 'node:assert/strict';
import { Soundtrack } from './dist/audio.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
class TestAudioContext {
  constructor(){this.currentTime=5;this.state='suspended';this.sampleRate=48000;this.destination={};this.started=[];}
  resume(){this.state='running';return Promise.resolve();}
  node(){return {connect(node){return node;},disconnect(){},gain:{value:0,setTargetAtTime(){}},threshold:{value:0},ratio:{value:0}};}
  createGain(){return this.node();}
  createDynamicsCompressor(){return this.node();}createConvolver(){return this.node();}
  createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
  createBufferSource(){
    const source=this.node();source.start=(at,offset)=>{source.startAt=at;source.offset=offset;this.started.push(source);};source.stop=()=>{};return source;
  }
}
globalThis.window={AudioContext:TestAudioContext};
const endings=[],audio=new Soundtrack(event=>endings.push(event.reason));
try{
  audio.select('custom',{duration:10});await audio.play();
  close(audio.source.startAt,audio.clock.contextTimeFor(0));close(audio.time(),0);
  audio.ctx.currentTime=6;close(audio.time(),.935);audio.pause();close(audio.position,.935);
  audio.ctx.currentTime=100;close(audio.time(),.935);await audio.play();
  close(audio.source.offset,.935);close(audio.time(),.935);
  audio.ctx.currentTime=101.065;close(audio.time(),1.935);
  audio.setTempo(120,.1);audio.setBeatMap({beats:[.1,.6,1.1,1.6,2.1]},.1);
  assert.deepEqual(audio.conductor.beats,[.1,.6,1.1,1.6,2.1]);
  audio.setBeatMode('tempo');assert.equal(audio.conductor.beats,null);
  audio.setBeatMode('detected');assert.equal(audio.conductor.beats.length,5);
  await audio.seek(3.25,false);close(audio.time(),3.25);assert.equal(audio.playing,false);await audio.play();close(audio.source.offset,3.25);
  await assert.rejects(()=>audio.seek(NaN),TypeError);
  audio.source.onended();assert.equal(audio.playing,false);close(audio.time(),0);
  assert.equal(endings.at(-1),'ended');
  await audio.play();close(audio.source.offset,0);
  audio.pause();assert.equal(endings.at(-1),'paused');
  audio.select('silent');await audio.play();assert.equal(audio.duration,Infinity);assert.equal(audio.scheduler,undefined);
  audio.pause();audio.select('neon');assert.equal(audio.duration,120);
}finally{audio.pause();audio.conductor?.dispose();delete globalThis.window;}
console.log('Transport intégré : source et horloge au même timestamp DSP, reprise exacte, beat map et replay validés.');
