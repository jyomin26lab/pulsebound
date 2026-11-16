const median=values=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
/** Absolute song times are reduced to a phase: tapping at 70 s cannot erase the intro. */
export function gridFromTaps(times){
  if(times.length<6||times.some((t,i)=>!Number.isFinite(t)||t<0||i&&t<=times[i-1]))return null;
  const gaps=times.slice(1).map((t,i)=>t-times[i]),period=median(gaps);
  if(period<.25||period>1.5||gaps.filter(g=>Math.abs(g-period)<period*.18).length<gaps.length*.75)return null;
  const bpm=Math.round(60/period*10)/10,step=60/bpm,anchor=times[0];
  const origin=median(times.map(t=>t-Math.round((t-anchor)/step)*step));
  return {version:1,source:'grid',bpm,offset:Math.round(((origin%step)+step)%step*100000)/100000,segments:[]};
}
export function nudgeConfig(config,delta,duration){
  const offset=Math.max(0,Math.min(duration,config.offset+delta)),shift=offset-config.offset;
  return {...config,offset,segments:config.segments.map(s=>({...s,time:s.time+shift})).filter(s=>s.time>offset&&s.time<duration)};
}
export function alignBeat(config,beats,cursor,duration){
  if(!beats.length)return config;
  let lo=0,hi=beats.length;while(lo<hi){const m=(lo+hi)>>1;if(beats[m]<cursor)lo=m+1;else hi=m;}
  const near=lo>0&&(lo===beats.length||cursor-beats[lo-1]<beats[lo]-cursor)?beats[lo-1]:beats[lo];
  return nudgeConfig(config,cursor-near,duration);
}
