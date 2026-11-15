import assert from 'node:assert/strict';
import {Soundtrack} from './dist/audio.mjs';
import {decodeMusicFile,withDeadline} from './dist/audio-import.mjs';
import {analyzeSong} from './dist/analyze-song.mjs';
class LockedContext{
  constructor(){this.currentTime=0;this.sampleRate=44100;this.state='suspended';this.destination={};this.resumes=0;this.allowed=false;}
  resume(){this.resumes++;if(!this.allowed)return new Promise(()=>{});this.state='running';return Promise.resolve();}
  node(){return {connect(n){return n;},disconnect(){},gain:{value:0,setTargetAtTime(){}},threshold:{},ratio:{}};}
  createGain(){return this.node();}createDynamicsCompressor(){return this.node();}
  createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
  createBufferSource(){return {...this.node(),start(){},stop(){}};}
  decodeAudioData(){return Promise.resolve({duration:8});}
}
globalThis.window={AudioContext:LockedContext};const audio=new Soundtrack();
const file={name:'Mon son.m4a',size:16,type:'',arrayBuffer:async()=>new ArrayBuffer(16)};
try{
  audio.prepare();assert.equal(audio.ctx.resumes,0,'Préparer/importer ne doit pas demander de lecture');
  assert.equal((await decodeMusicFile(audio.ctx,file)).duration,8);assert.equal(audio.ctx.state,'suspended');
  await assert.rejects(()=>audio.init({timeoutMs:15}),/autorisation/);assert.equal(audio.playing,false);
  audio.ctx.allowed=true;audio.select('custom',{duration:8});await audio.play();assert.equal(audio.playing,true,'Un nouveau geste peut relancer après refus');
  audio.ctx.state='interrupted';audio.ctx.onstatechange();assert.equal(audio.playing,false,'Une interruption iOS met en pause');
  await audio.play();assert.equal(audio.playing,true);audio.pause();
  await assert.rejects(()=>decodeMusicFile(audio.ctx,{...file,size:0}),/Fichier vide/);
  await assert.rejects(()=>decodeMusicFile(audio.ctx,{...file,name:'photo.jpg'}),/fichier audio/);
  await assert.rejects(()=>decodeMusicFile({decodeAudioData:async()=>{throw Error('EncodingError');}},file),/Audio illisible/);
  await assert.rejects(()=>decodeMusicFile({decodeAudioData:()=>new Promise(()=>{})},file,{timeoutMs:10}),/décodage/);
  await assert.rejects(()=>decodeMusicFile(audio.ctx,{...file,arrayBuffer:()=>new Promise(()=>{})},{timeoutMs:10}),/Lecture du fichier/);
  const cancel=new AbortController(),pending=decodeMusicFile(audio.ctx,{...file,arrayBuffer:()=>new Promise(()=>{})},{signal:cancel.signal});cancel.abort();await assert.rejects(()=>pending,{name:'AbortError'});
  const preCancelled=new AbortController();preCancelled.abort();await assert.rejects(()=>withDeadline(Promise.reject(Error('late')),100,'timeout',preCancelled.signal),{name:'AbortError'});
  window.OfflineAudioContext=class{constructor(){this.destination={};}createBufferSource(){return {connect(){},start(){}};}startRendering(){return new Promise(()=>{});}};
  const stopAnalysis=new AbortController(),analysis=analyzeSong({duration:8},()=>{},{signal:stopAnalysis.signal});stopAnalysis.abort();await assert.rejects(()=>analysis,{name:'AbortError'});
}finally{audio.pause();audio.conductor?.dispose();delete globalThis.window;}
console.log('Mobile : import sans déverrouillage audio, refus sans blocage, reprise après geste/interruption, M4A sans MIME, erreurs, délais et annulation validés.');
