/** Beat tracking by bounded dynamic programming over spectral novelty. */
export function detectBeatMap(novelty,featureRate,{tempo=null,onsets=[],duration=novelty.length/featureRate}={}){
  if(!Number.isFinite(featureRate)||featureRate<=0||!Number.isFinite(duration)||duration<0)throw new RangeError('Durée ou fréquence de nouveauté invalide.');
  const empty={schemaVersion:1,algorithm:'spectral-dp-v1',duration,bpm:null,offset:null,confidence:0,beats:[],halfBeats:[]};
  const bpm=tempo?.bpm;
  if(!Number.isFinite(bpm)||bpm<40||bpm>240||novelty.length<3)return empty;
  let maximum=0;for(const value of novelty)if(Number.isFinite(value))maximum=Math.max(maximum,value);
  if(maximum<.0001)return empty;
  const count=novelty.length,period=60/bpm*featureRate;
  const minLag=Math.max(1,Math.floor(period*.5)),maxLag=Math.ceil(period*1.8);
  const scores=new Float64Array(count),previous=new Int32Array(count),penalties=new Float64Array(maxLag+1);
  previous.fill(-1);
  for(let lag=minLag;lag<=maxLag;lag++)penalties[lag]=2*Math.log2(lag/period)**2;
  let bestEnd=-1,bestTotal=0;
  for(let frame=0;frame<count;frame++){
    let bestPrevious=0,parent=-1;
    for(let lag=minLag;lag<=Math.min(frame,maxLag);lag++){
      const candidate=scores[frame-lag]-penalties[lag];
      if(candidate>bestPrevious){bestPrevious=candidate;parent=frame-lag;}
    }
    const local=Number.isFinite(novelty[frame])?Math.max(0,novelty[frame]/maximum):0;
    scores[frame]=local+bestPrevious;previous[frame]=parent;
    if(scores[frame]>bestTotal){bestTotal=scores[frame];bestEnd=frame;}
  }
  const reversed=[];let pointer=bestEnd;
  while(pointer>=0){reversed.push((pointer+.3)/featureRate);pointer=previous[pointer];}
  const rough=reversed.reverse();
  if(rough.length<3)return empty;
  let onsetIndex=0,supported=0;
  const beats=[];
  for(let time of rough){
    while(onsetIndex+1<onsets.length&&onsets[onsetIndex+1].time<=time)onsetIndex++;
    const before=onsets[onsetIndex],after=onsets[onsetIndex+1];
    const closest=before&&(!after||Math.abs(before.time-time)<=Math.abs(after.time-time))?before:after;
    if(closest&&Math.abs(closest.time-time)<=Math.min(.04,60/bpm*.12)){time=closest.time;supported++;}
    time=Math.round(time*10000)/10000;
    if(time>=0&&time<=duration&&(!beats.length||time>beats.at(-1)))beats.push(time);
  }
  const halfBeats=beats.slice(1).map((time,index)=>Math.round((time+beats[index])*5000)/10000);
  const confidence=Math.min(.99,Math.max(0,Number(tempo.confidence)||0)*.55+supported/rough.length*.45);
  return {...empty,bpm,offset:beats[0]??null,confidence:Math.round(confidence*1000)/1000,beats,halfBeats};
}
