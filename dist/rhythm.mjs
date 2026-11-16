import { estimateTempo } from './core.mjs';
import { detectBeatMap } from './beat-analysis.mjs';

export function demoAccent(trackId, step) {
  step=((step%32)+32)%32;
  if(step%2===0)return {kind:step%4===0?'bass':'drum',strength:step%4===0?.95:.8};
  if(trackId==='after')return step===7||step===23?{kind:'high',strength:.55}:null;
  return step%8===3||step%8===7?{kind:'note',strength:.65}:null;
}
export function assignActions(peaks) {
  return peaks.map((peak,index)=>({...peak,index,action:'punch'}));
}
export function demoMap(trackId,bpm,offset=0,mode='accents') {
  const step=30/bpm,peaks=[];
  for(let i=0;i<32;i++){
    const accent=mode==='tempo'?(i%2===0?{kind:'beat',strength:.8}:null):demoAccent(trackId,i);
    if(accent)peaks.push({time:i*step,...accent});
  }
  return new RhythmMap(assignActions(peaks),32*step,offset);
}
export class RhythmMap {
  constructor(events=[],repeat=0,shift=0){this.events=events;this.repeat=repeat;this.shift=shift;}
  event(index){
    if(index<0||!this.events.length||(!this.repeat&&index>=this.events.length))return null;
    const base=this.events[index%this.events.length],cycle=this.repeat?Math.floor(index/this.events.length):0;
    return {...base,index,time:base.time+cycle*this.repeat+this.shift};
  }
  lowerBound(time){
    if(!this.events.length)return 0;
    const cycle=this.repeat?Math.max(0,Math.floor((time-this.shift)/this.repeat)):0;
    const local=time-this.shift-cycle*this.repeat;let lo=0,hi=this.events.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(this.events[mid].time<local)lo=mid+1;else hi=mid;}
    return cycle*this.events.length+lo;
  }
  nearest(time){
    const index=this.lowerBound(time),next=this.event(index),previous=this.event(index-1);
    if(!next)return previous;
    return previous&&Math.abs(previous.time-time)<=Math.abs(next.time-time)?previous:next;
  }
  upcoming(time,ahead=1.05,before=.16){
    const result=[];let index=this.lowerBound(time-before),event;
    while((event=this.event(index++))&&event.time<=time+ahead)result.push(event);
    return result;
  }
  next(action,time){
    const start=this.lowerBound(time),limit=this.repeat?this.events.length:this.events.length-start;
    for(let i=0;i<limit;i++){const event=this.event(start+i);if(event?.action===action)return event;}
    return null;
  }
  windows(event,focus=0){
    const previous=this.event(event.index-1),next=this.event(event.index+1);
    const gap=Math.min(previous?event.time-previous.time:1,next?next.time-event.time:1);
    return {perfect:Math.min(.065+focus*.006,gap*.35),good:Math.min(.145+focus*.004,gap*.46)};
  }
  playable(time,lastExpired=-1,resolved=new Set()){
    let index=Math.max(lastExpired+1,this.lowerBound(time)-1);
    let best=null;
    for(let attempts=0;attempts<4;attempts++,index++){
      const event=this.event(index);
      if(!event)break;
      if(!resolved.has(index) && (!best || Math.abs(event.time-time)<Math.abs(best.time-time)))best=event;
      if(event.time>time && !resolved.has(index))break;
    }
    return best;
  }
  judge(time,focus=0){
    const event=this.nearest(time);if(!event)return null;
    const error=(time-event.time)*1000,window=this.windows(event,focus);
    return {event,index:event.index,error,grade:Math.abs(error)<=window.perfect*1000?'perfect':Math.abs(error)<=window.good*1000?'good':'miss'};
  }
}

// Spectral novelty / local adaptive peak picking, following Müller's FMP approach.
// Detected times remain unquantized; these are salient attacks, not isolated instruments.
export function analyzeTrack(samples,sampleRate,onProgress=()=>{}) {
  const duration=samples?.length&&Number.isFinite(sampleRate)&&sampleRate>=4000?samples.length/sampleRate:0;
  const empty=()=>({events:[],tempo:null,duration,beatMap:detectBeatMap([],1,{duration})});
  if(!duration)return empty();
  const n=512,hop=Math.max(1,Math.round(sampleRate/86)),frames=Math.ceil(samples.length/hop);
  const real=new Float64Array(n),imag=new Float64Array(n),previous=new Float64Array(n/2);
  const window=new Float64Array(n),reverse=new Uint16Array(n),cos=new Float64Array(n/2),sin=new Float64Array(n/2);
  for(let i=0;i<n;i++){window[i]=.5-.5*Math.cos(2*Math.PI*i/(n-1));let v=i,r=0;for(let j=0;j<9;j++){r=r*2+(v&1);v>>=1;}reverse[i]=r;}
  for(let i=0;i<n/2;i++){cos[i]=Math.cos(2*Math.PI*i/n);sin[i]=-Math.sin(2*Math.PI*i/n);}
  const flux=new Float32Array(frames),low=new Float32Array(frames),mid=new Float32Array(frames),high=new Float32Array(frames),dominant=new Uint8Array(frames);
  let maxFlux=0;
  for(let frame=0;frame<frames;frame++){
    const start=frame*hop-n/2;
    for(let i=0;i<n;i++){const j=reverse[i],sample=start+i;real[j]=(sample>=0&&sample<samples.length?samples[sample]:0)*window[i];imag[j]=0;}
    for(let width=2;width<=n;width*=2){
      const half=width/2,stride=n/width;
      for(let base=0;base<n;base+=width)for(let j=0;j<half;j++){
        const a=base+j,b=a+half,k=j*stride,tr=real[b]*cos[k]-imag[b]*sin[k],ti=real[b]*sin[k]+imag[b]*cos[k];
        real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;
      }
    }
    let bands=[0,0,0],counts=[0,0,0];
    for(let k=2;k<n/2;k++){
      const hz=k*sampleRate/n,band=hz<230?0:hz<2000?1:2;
      const magnitude=Math.log1p(100*Math.hypot(real[k],imag[k])/n);
      if(frame>0)bands[band]+=Math.max(0,magnitude-previous[k]);
      counts[band]++;previous[k]=magnitude;
    }
    low[frame]=bands[0]/Math.max(1,counts[0]);mid[frame]=bands[1]/Math.max(1,counts[1]);high[frame]=bands[2]/Math.max(1,counts[2]);
    dominant[frame]=bands[0]*1.4>Math.max(bands[1],bands[2]*.85)?0:bands[1]>bands[2]*.85?1:2;
    flux[frame]=low[frame]*1.4+mid[frame]+high[frame]*.85;maxFlux=Math.max(maxFlux,flux[frame]);
    if(frame%512===0)onProgress(Math.round(frame/frames*85));
  }
  if(maxFlux<.001){onProgress(100);return empty();}
  const prefix=new Float64Array(frames+1),square=new Float64Array(frames+1);
  for(let i=0;i<frames;i++){prefix[i+1]=prefix[i]+flux[i];square[i+1]=square[i]+flux[i]**2;}
  const radius=Math.max(4,Math.round(.25*sampleRate/hop)),candidates=[];
  for(let i=1;i<frames-1;i++){
    const a=Math.max(0,i-radius),b=Math.min(frames,i+radius+1),mean=(prefix[b]-prefix[a])/(b-a);
    const std=Math.sqrt(Math.max(0,(square[b]-square[a])/(b-a)-mean**2));
    const threshold=Math.max(maxFlux*.035,mean+std*.75);
    if(flux[i]<=threshold||flux[i]<flux[i-1]||flux[i]<=flux[i+1])continue;
    const kind=['bass','note','high'][dominant[i]];
    const candidate={time:Math.max(0,(i*hop+hop*.3)/sampleRate),strength:Math.min(1,flux[i]/maxFlux),kind};
    const previous=candidates.at(-1);
    if(previous&&candidate.time-previous.time<.18){if(candidate.strength>previous.strength)candidates[candidates.length-1]=candidate;}
    else candidates.push(candidate);
  }
  onProgress(93);
  const tempo=estimateTempo(samples.subarray(0,Math.min(samples.length,Math.round(sampleRate*90))),sampleRate);
  const beatMap=detectBeatMap(flux,sampleRate/hop,{tempo,onsets:candidates,duration});
  onProgress(100);
  return {events:assignActions(candidates),tempo,beatMap,duration};
}
