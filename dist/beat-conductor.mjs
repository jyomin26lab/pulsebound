function lowerBound(values,value){let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>1;if(values[mid]<value)lo=mid+1;else hi=mid;}return lo;}

/** Timers wake the scheduler; all timestamps and phase come from AudioClock. */
export class BeatConductor {
  constructor(clock,{lookAhead=.12,intervalMs=25,maxCatchUp=.25}={}){
    if(!clock||typeof clock.contextTimeFor!=='function')throw new TypeError('AudioClock requis.');
    if(!Number.isFinite(lookAhead)||lookAhead<0||!Number.isFinite(intervalMs)||intervalMs<=0||!Number.isFinite(maxCatchUp)||maxCatchUp<0)throw new RangeError('Configuration de planification invalide.');
    this.clock=clock;this.lookAhead=lookAhead;this.intervalMs=intervalMs;this.maxCatchUp=maxCatchUp;
    this.listeners=new Map();this.timer=null;this.version=0;this.setBeatMap({bpm:120});
  }
  on(type,listener){
    if(!['beat','halfbeat','schedule','resync'].includes(type)||typeof listener!=='function')throw new TypeError('Événement ou fonction invalide.');
    if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(listener);
    return ()=>this.listeners.get(type)?.delete(listener);
  }
  emit(type,event){for(const listener of this.listeners.get(type)||[])listener(event);}
  setBeatMap({beats=null,bpm=120,offset=0,duration=Infinity}={}){
    if(!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(offset)||offset<0||(duration!==Infinity&&(!Number.isFinite(duration)||duration<0)))throw new RangeError('Beat map invalide.');
    if(beats!==null&&(!Array.isArray(beats)||beats.some((t,i)=>!Number.isFinite(t)||t<0||t>duration||(i>0&&t<=beats[i-1]))))throw new TypeError('Les beats doivent être croissants, uniques et dans la piste.');
    this.beats=beats===null?null:beats.slice();this.bpm=bpm;this.offset=offset;this.duration=duration;this.version++;
    this.reset(this.clock.position);
  }
  event(slot){
    if(slot<0)return null;
    const index=Math.floor(slot/2),half=slot%2===1;
    let songTime;
    if(this.beats){
      if(index>=this.beats.length||(half&&index+1>=this.beats.length))return null;
      // shortcut: demi-temps interpolés ; suivre les subdivisions audio pour gérer le swing.
      songTime=half?(this.beats[index]+this.beats[index+1])/2:this.beats[index];
    }else songTime=this.offset+slot*30/this.bpm;
    if(songTime>this.duration)return null;
    return {type:half?'halfbeat':'beat',index,songTime,contextTime:this.clock.contextTimeFor(songTime)};
  }
  lowerBound(time){
    if(!this.beats)return Math.max(0,Math.ceil((time-this.offset)*this.bpm/30-1e-9));
    if(!this.beats.length)return 0;
    const beat=lowerBound(this.beats,time);
    if(beat===0)return 0;
    return (this.beats[beat-1]+(this.beats[beat]??Infinity))/2>=time?beat*2-1:beat*2;
  }
  reset(position=this.clock.position){
    this.dueCursor=this.lowerBound(position);this.scheduleCursor=this.dueCursor;this.lastPosition=position;
  }
  start(){
    if(this.timer!==null)return;
    this.scheduleCursor=Math.max(this.dueCursor,this.lowerBound(this.clock.position));
    this.timer=setInterval(()=>this.poll(),this.intervalMs);this.poll();
  }
  stop(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;}
  poll(){
    if(!this.clock.playing)return;
    const now=this.clock.position,contextNow=this.clock.context.currentTime,version=this.version;
    if(now+1e-8<this.lastPosition)this.reset(now);
    this.lastPosition=now;
    const catchUp=this.lowerBound(Math.max(0,now-this.maxCatchUp));
    if(catchUp>this.dueCursor){
      const skipped=catchUp-this.dueCursor;this.dueCursor=catchUp;this.scheduleCursor=Math.max(this.scheduleCursor,catchUp);
      this.emit('resync',{songTime:now,contextTime:contextNow,skipped});
      if(version!==this.version||!this.clock.playing)return;
    }
    let event;
    while((event=this.event(this.scheduleCursor))&&event.songTime<=now+this.lookAhead){
      this.scheduleCursor++;
      if(event.contextTime>=contextNow)this.emit('schedule',{...event,lateBy:0});
      if(version!==this.version||!this.clock.playing)return;
    }
    if(!this.clock.started)return;
    while((event=this.event(this.dueCursor))&&event.songTime<=now+1e-9){
      this.dueCursor++;this.emit(event.type,{...event,lateBy:Math.max(0,contextNow-event.contextTime)});
      if(version!==this.version||!this.clock.playing)return;
    }
  }
  dispose(){this.stop();this.listeners.clear();}
}
