import assert from 'node:assert/strict';
import {SCORES} from './dist/scores.mjs';
import {Band,SONGS,partAt,written} from './dist/music.mjs';
import {Soundtrack} from './dist/audio.mjs';
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(v){assert.ok(v>0);},setTargetAtTime(v,t,c){assert.ok(Number.isFinite(v)&&t>=0&&c>0);}});
class Context{
  constructor(){this.currentTime=10;this.sampleRate=8000;this.state='running';this.destination={};this.voices=[];}
  node(){return {gain:param(),frequency:param(),detune:param(),Q:param(),delayTime:param(),threshold:param(),ratio:param(),connect:to=>to,disconnect(){}};}
  voice(){const voice={...this.node(),start(at=0){voice.at=at;},stop(at){voice.end=at??-1;}};this.voices.push(voice);return voice;}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  createOscillator(){return this.voice();}createBufferSource(){return this.voice();}
}
for(const name of ['Gain','Delay','BiquadFilter','WaveShaper','Convolver','DynamicsCompressor'])Context.prototype['create'+name]=function(){return this.node();};
const note=({mark})=>'123'.includes(mark);
for(const [id,score] of Object.entries(SCORES)){
  // What is written: a part, a chord per bar, eight pitches per bar and readable patterns for every bar of the score.
  score.forEach((step,i)=>{
    const {part,bar,size}=partAt(id,i),where=`${id} ${step.section} ${step.take+1}, mesure ${bar+1}`;
    assert.ok(part.chords.length>=size/8,where+' : un accord par mesure');assert.ok(part.lead.length>=size/8,where+' : une mélodie par mesure');
    assert.ok(part.lead[bar].length===8&&part.lead[bar].every(pitch=>pitch>=60&&pitch<=88),where+' : mélodie lisible');
    if(step.section==='silence')assert.ok(!part.kick&&!part.snare&&!part.hat&&!part.bass,where+' : un silence sans batterie ni basse');
  });
  for(const part of Object.values(SONGS[id].sections).flat())for(const [name,allowed] of [['comp','xo'],['bass','058'],['arp','0123'],['kick','xo'],['snare','xo'],['hat','xo'],['open','xo'],['crash','xo']])
    for(const bar of part[name]||[])assert.ok([1,4,8,16].includes(bar.length)&&[...bar].every(mark=>(allowed+'.-').includes(mark)),`${id} ${name} ${bar}`);
  // What is played: the lead strikes the score exactly, everything starts on its eighth note and ends.
  const ctx=new Context(),band=new Band(ctx,ctx.node(),id,{noise:{},room:ctx.node()}),loops=ctx.voices.length,length=.25,leads=[],snares=[];
  const play=band.note,hit=band.hit;
  band.note=function(voice,midi,time,...rest){if(voice===this.song.lead)leads.push([time,midi]);return play.call(this,voice,midi,time,...rest);};
  band.hit=function(drum,time,...rest){if(drum==='snare')snares.push(time);return hit.call(this,drum,time,...rest);};
  for(let i=0;i<score.length;i++){
    const before=ctx.voices.length,time=20+i*length,{part,bar,beat,section}=partAt(id,i);leads.length=snares.length=0;band.play(i,time,length);
    assert.equal(leads.length,note(score[i])?part.double?2:1:0,`${id} ${i} : la mélodie joue la partition`);
    if(leads.length)assert.deepEqual(leads[0],[time,part.lead[bar][beat]]);
    if(section==='roulement')assert.equal(snares.filter(at=>at===time).length,note(score[i])?1:0,`${id} ${i} : la caisse claire joue le roulement`);
    const voices=ctx.voices.slice(before);
    assert.ok(voices.length<=34,`${id} ${i} : ${voices.length} voix d’un coup`);
    for(const voice of voices)assert.ok(voice.at>=time&&voice.at<time+length&&voice.end>voice.at&&voice.end<time+6,`${id} ${i} : chaque voix commence sur sa croche et se termine`);
  }
  band.stop();assert.ok(ctx.voices.slice(0,loops).every(voice=>voice.end===-1),id+' : la pause arrête les boucles');
}
assert.equal(written(['x-..'],0,0).sixteenths,8);assert.equal(written(['x-..'],0,2),null);assert.equal(written(undefined,0,0),null);
// In the game: a built-in song plays with its band, an imported one stays alone, and a pause silences both.
globalThis.window={AudioContext:Context};const audio=new Soundtrack();
try{
  audio.select('neon');await audio.play();assert.equal(audio.band.trackId,'neon');assert.ok(audio.nextStep>0,'La première croche est planifiée d’avance');
  audio.pause();assert.equal(audio.band,null);
  audio.select('custom',{duration:9});await audio.play();assert.equal(audio.band,null,'Un morceau importé reste seul');
}finally{audio.pause();audio.conductor?.dispose();delete globalThis.window;}
console.log('Musique : les trois morceaux couvrent leur partition, la mélodie la joue note pour note, chaque voix se termine et la pause arrête tout.');
