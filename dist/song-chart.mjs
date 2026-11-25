import { RhythmMap, demoAccent } from './rhythm.mjs';

export const ANALYSIS_VERSION=2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function songSettings(track){
  const duration=Number.isFinite(track?.duration)?track.duration:120;
  const raw=track?.chart||{},bpm=clamp(Number(raw.bpm)||Number(track?.bpm)||120,40,240);
  const offset=clamp(Number.isFinite(raw.offset)?raw.offset:Number(track?.offset)||0,0,duration);
  const segments=(Array.isArray(raw.segments)?raw.segments:[]).filter(s=>Number.isFinite(s?.time)&&s.time>offset&&s.time<duration&&Number.isFinite(s.bpm)&&s.bpm>=40&&s.bpm<=240).map(s=>({time:Math.round(s.time*1000)/1000,bpm:s.bpm})).sort((a,b)=>a.time-b.time).slice(0,128);
  return {version:1,source:raw.source==='grid'?'grid':'auto',bpm,offset,segments:segments.filter((s,i)=>!i||s.time-segments[i-1].time>=.05)};
}
export function gridBeats(duration,config){
  const beats=[],sections=[{time:config.offset,bpm:config.bpm},...config.segments];
  for(let i=0;i<sections.length;i++){
    const {time,bpm}=sections[i],end=sections[i+1]?.time??duration+.00001;
    for(let n=0,t=time;t<end-1e-7&&t<=duration;n++,t=time+n*60/bpm)beats.push(Math.round(t*100000)/100000);
  }
  return beats;
}
function nearestIndex(values,time){
  let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>1;if(values[mid]<time)lo=mid+1;else hi=mid;}
  return lo>0&&(lo===values.length||time-values[lo-1]<=values[lo]-time)?lo-1:lo;
}
/**
 * Hold notes. A note becomes a hold (`hold` = seconds to keep the key down) when the music sustains after it:
 * a long gap before the next note, or an attack followed by a beat with no detected attack (that beat is absorbed).
 * Real mixes rarely leave such gaps (an attack is detected on nearly every beat), so after 12 notes without a hold
 * the first note followed by a weaker or equal one is held across it: about one hold every 13 notes at least.
 * A hold always ends before the next note, leaving time to release and strike again.
 */
export function markHolds(events,automatic=false){
  const result=[];let sinceHold=4;
  for(let i=0;i<events.length;i++){
    const event=events[i],next=events[i+1],after=events[i+2];
    const gap=next?next.time-event.time:0,span=after?after.time-event.time:0;
    const absorb=Boolean(next)&&(automatic&&event.supported&&next.beat&&!next.supported||sinceHold>=12&&(next.strength??0)<=(event.strength??0));
    let hold=0,skip=0;
    if(sinceHold>=4){
      if(gap>=.9)hold=Math.min(gap,2.7)-.3;
      else if(absorb&&span>=.8&&span<=2.7){hold=span-.3;skip=1;}
    }
    if(hold){result.push({...event,hold});i+=skip;sinceHold=0;}else{result.push(event);sinceHold++;}
  }
  return result;
}
/** The beat clock and the playable attacks share song timestamps, but stay distinct. */
export function createSongChart(track,{density='standard'}={}){
  const config=songSettings(track),duration=Number.isFinite(track?.duration)?track.duration:3600;
  const analysis=track?.analysis;
  const automatic=config.source==='auto' && !!analysis && (Array.isArray(analysis.events)||Array.isArray(analysis.beatMap?.beats));
  const detected=automatic && Array.isArray(analysis.beatMap?.beats) && analysis.beatMap.beats.length>2;
  const shift=config.offset-(analysis?.beatMap?.offset||0);
  const beats=detected?[...new Set(analysis.beatMap.beats.map(t=>t+shift).filter(t=>Number.isFinite(t)&&t>=0&&t<=duration))].sort((a,b)=>a-b):gridBeats(duration,config);
  const onsets=automatic?(Array.isArray(analysis.events)?analysis.events:[]).map(e=>({...e,time:e.time+shift,strength:clamp(Number(e.strength)||0,0,1)})).filter(e=>Number.isFinite(e.time)&&e.time>=0&&e.time<=duration).sort((a,b)=>a.time-b.time):[];
  const times=onsets.map(e=>e.time);
  let events=automatic&&!detected?onsets.map(event=>({...event,action:'punch',beat:false,supported:true})):beats.map((time,index)=>{
    const onset=onsets[nearestIndex(times,time)],supported=onset&&Math.abs(onset.time-time)<.075;
    return {time:supported?onset.time:time,index,action:'punch',kind:supported?onset.kind:'beat',strength:supported?onset.strength:.6,beat:true,supported:Boolean(supported)};
  });
  if(automatic)events=events.filter(event=>{
    const wave=analysis.waveform,energy=Array.isArray(wave)?wave[Math.min(wave.length-1,Math.max(0,Math.floor((event.time-shift)/duration*wave.length)))]:1;
    return event.supported||(analysis.beatMap?.confidence||0)>=.5&&energy>.04;
  });
  // Relaxed keeps one beat out of two, unless the song is slow already.
  if(density==='relaxed'&&config.bpm>80)events=events.filter(event=>!event.beat||event.index%2===0);
  if(track?.builtin && density==='intense'){
    for(let i=0;i<beats.length-1;i++){
      const accent=demoAccent(track.id,i*2+1);
      if(accent)events.push({time:(beats[i]+beats[i+1])/2,action:'punch',beat:false,...accent});
    }
  }
  const attackTimes=events.map(e=>e.time).sort((a,b)=>a-b);
  // Only strong offbeats become extra punches; a minimum gap keeps dense mixes playable.
  for(const onset of onsets){
    if(density==='relaxed' || onset.strength<(density==='intense'?.18:.28))continue;
    const index=nearestIndex(attackTimes,onset.time),attack=attackTimes[index];
    if(attack!==undefined&&Math.abs(attack-onset.time)<.19)continue;
    events.push({...onset,action:'punch',beat:false});
  }
  events.sort((a,b)=>a.time-b.time);
  const spaced=[];
  for(const event of events){const previous=spaced.at(-1);if(previous&&event.time-previous.time<.18){if(!previous.beat&&(event.beat||event.strength>previous.strength))spaced[spaced.length-1]=event;}else spaced.push(event);}
  const playable=[];
  for(const event of spaced){
    if(density==='relaxed' && playable.length && event.time-playable.at(-1).time<.38)continue;
    playable.push(event);
  }
  const held=markHolds(playable,automatic);
  held.forEach((e,i)=>e.index=i);
  return {config,beats,events:held,rhythm:new RhythmMap(held),automatic,duration};
}
export function waveformPeaks(samples,count=4096){
  const length=Math.min(count,samples.length),peaks=new Array(length).fill(0);let maximum=0;
  for(let i=0;i<length;i++){
    const start=Math.floor(i*samples.length/length),end=Math.floor((i+1)*samples.length/length);let peak=0;
    for(let j=start;j<end;j++)peak=Math.max(peak,Math.abs(samples[j]));
    peaks[i]=peak;maximum=Math.max(maximum,peak);
  }
  return peaks.map(v=>Math.round(v/Math.max(maximum,.00001)*1000)/1000);
}
