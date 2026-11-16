// Combat charge follows musical time; pause never consumes active Flow beats.
export class FlowMeter {
  constructor(){this.reset();}
  reset(){this.charge=0;this.remaining=0;this.armed=false;this.lastBeat=null;}
  get active(){return this.remaining>0;}
  hit(grade,interval,action='punch'){
    if(this.active||this.armed||grade==='miss')return;
    this.charge=Math.min(100,this.charge+Math.max(.12,Math.min(1.5,interval))*(grade==='perfect'?4:2)*(action==='dodge'?1.25:1));
    if(this.charge>=100)this.armed=true;
  }
  miss(){if(!this.active&&!this.armed)this.charge=Math.max(0,this.charge-3);}
  beat(event){
    if(event.songTime===this.lastBeat)return false;this.lastBeat=event.songTime;
    if(this.active){this.remaining--;if(!this.remaining)this.charge=0;return false;}
    if(!this.armed)return false;
    this.armed=false;this.remaining=32;return true;
  }
  resync(skipped){if(this.active){this.remaining=Math.max(0,this.remaining-Math.floor(skipped/2));if(!this.remaining)this.charge=0;}}
}
