import assert from 'node:assert/strict';
import {Soundtrack} from './dist/audio.mjs';
class Context {
  constructor(){this.state='running';this.currentTime=10;this.sampleRate=44100;this.destination={};this.scheduled=[];}
  node(){return {connect:n=>n,disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},threshold:{},ratio:{}};}
  createGain(){return this.node();}createDynamicsCompressor(){return this.node();}createConvolver(){return this.node();}
  createBuffer(c,length){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return {...this.node(),start(at,offset){this.at=at;this.offset=offset;},stop(){}};}
  createOscillator(){const voice={...this.node(),frequency:{setValueAtTime(){}},start(at){this.at=at;},stop(at){this.stopAt=at;}};this.scheduled.push(voice);return voice;}
}
globalThis.window={AudioContext:Context};
const audio=new Soundtrack();
try{
  audio.select('custom',{duration:20});audio.setTempo(120);
  await audio.play({countIn:4});
  const version=audio.conductor.version;
  audio.setTempo(120);audio.refreshBeats();
  assert.equal(audio.conductor.version,version,'Reconstruire une grille identique ne replanifie pas les clics');
  const clicks=audio.ctx.scheduled;
  assert.deepEqual(clicks.map(v=>v.at),[10.12,10.62,11.12,11.62]);
  assert.equal(audio.source.at,12.12,'Le morceau démarre après les quatre clics');
  assert.equal(audio.clock.outputPositionAt(undefined,{preroll:true}),-2.119999999999999);
  audio.pause();assert(clicks.every(v=>v.stopAt===undefined),'La pause annule tous les clics encore planifiés');
  audio.ctx.currentTime=20;await audio.seek(5,false);await audio.play({countIn:4});
  assert.equal(audio.ctx.scheduled.length,4,'Reprendre un morceau ne relance pas le décompte');
  assert.equal(audio.source.offset,5);
}finally{audio.pause();audio.conductor?.dispose();delete globalThis.window;}
console.log('Décompte DSP, premier temps, annulation et reprise vérifiés.');
