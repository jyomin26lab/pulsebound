function nonNegative(value,name){
  if(!Number.isFinite(value)||value<0)throw new RangeError(`${name} doit être un nombre positif ou nul.`);
}

/** Song transport derived exclusively from the Web Audio processing clock. */
export class AudioClock {
  constructor(context){
    if(!context||!Number.isFinite(context.currentTime))throw new TypeError('AudioContext requis.');
    this.context=context;this.state='stopped';this.heldPosition=0;this.startPosition=0;this.startAt=0;this.duration=Infinity;
  }
  get playing(){return this.state==='playing';}
  get started(){return this.playing&&this.context.state!=='suspended'&&this.context.state!=='closed'&&this.context.currentTime>=this.startAt;}
  get position(){return this.playing?this.positionAtContextTime(this.context.currentTime):this.heldPosition;}
  start({at=this.context.currentTime,position=this.heldPosition,duration=this.duration}={}){
    nonNegative(at,'at');nonNegative(position,'position');
    if(duration!==Infinity)nonNegative(duration,'duration');
    if(position>duration)throw new RangeError('Position après la fin de la piste.');
    this.startAt=at;this.startPosition=position;this.heldPosition=position;this.duration=duration;this.state='playing';
    return at;
  }
  pause(){
    this.heldPosition=this.position;this.state='paused';return this.heldPosition;
  }
  stop(){this.heldPosition=0;this.startPosition=0;this.startAt=0;this.state='stopped';}
  seek(position){
    nonNegative(position,'position');
    if(this.playing)throw new Error('Mettre en pause avant de déplacer la lecture.');
    this.heldPosition=Math.min(position,this.duration);this.startPosition=this.heldPosition;this.state='paused';return this.heldPosition;
  }
  positionAtContextTime(contextTime){
    if(!Number.isFinite(contextTime))throw new TypeError('Timestamp audio invalide.');
    if(!this.playing)return this.heldPosition;
    return Math.min(this.duration,Math.max(this.startPosition,this.startPosition+contextTime-this.startAt));
  }
  contextTimeFor(songTime){
    nonNegative(songTime,'songTime');
    return this.playing?this.startAt+songTime-this.startPosition:null;
  }
  outputContextTimeAt(performanceTime){
    if(this.context.state==='running' && Number.isFinite(performanceTime) && typeof this.context.getOutputTimestamp==='function'){
      const stamp=this.context.getOutputTimestamp();
      if(Number.isFinite(stamp?.contextTime) && stamp.contextTime>0 && Number.isFinite(stamp.performanceTime)){
        return stamp.contextTime+(performanceTime-stamp.performanceTime)/1000;
      }
    }
    const latency=[this.context.baseLatency,this.context.outputLatency]
      .reduce((sum,value)=>sum+(Number.isFinite(value)&&value>0?value:0),0);
    const eventAge=Number.isFinite(performanceTime)?(performanceTime-performance.now())/1000:0;
    return this.context.currentTime-Math.min(1,latency)+eventAge;
  }
  /** Input events and rendered notes use the same audible output timeline. */
  outputPositionAt(performanceTime,{preroll=false}={}){
    if(!this.playing)return this.heldPosition;
    if(this.context.state!=='running')return this.position;
    const contextTime=this.outputContextTimeAt(performanceTime);
    if(preroll && this.startPosition===0)return Math.min(this.duration,contextTime-this.startAt);
    return this.positionAtContextTime(contextTime);
  }
}
