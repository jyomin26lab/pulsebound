import { calibrationResult } from './input-timing.mjs';
const $ = selector => document.querySelector(selector);

export class DeviceCalibration {
  constructor(audio,onApply){
    this.audio=audio;
    this.onApply=onApply;
    this.serial=0;
    this.running=false;
    this.timer=null;
    this.voices=[];
    this.samples=new Map();
    $('#start-calibration').addEventListener('click',()=>this.start());
    $('#calibration-tap').addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();this.tap(event.timeStamp);
    });
    $('#calibration-tap').addEventListener('click',event=>{if(event.detail===0)this.tap(event.timeStamp);});
    $('#settings-dialog').addEventListener('keydown',event=>{
      if(!this.running || !['KeyD','KeyF','Space'].includes(event.code) || event.repeat || event.target.matches('input,select,textarea'))return;
      event.preventDefault();event.stopPropagation();this.tap(event.timeStamp);
    });
    $('#apply-calibration').addEventListener('click',()=>{
      if(!this.result)return;
      onApply(this.result.offset);
      $('#calibration-status').textContent='Calage appliqué à cet appareil · '+this.result.offset+' ms.';
      $('#apply-calibration').disabled=true;
    });
    $('#settings-dialog').addEventListener('close',()=>this.stop());
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden && this.running){this.stop();$('#calibration-status').textContent='Calibrage interrompu. Relance-le quand tu es prêt.';}
    });
  }
  stop(){
    this.serial++;
    this.running=false;
    clearInterval(this.timer);
    for(const voice of this.voices){try{voice.stop();}catch{}}
    this.voices=[];
    this.gain?.disconnect();
    this.gain=null;
    $('#calibration-tap').disabled=true;
  }
  async start(){
    this.stop();
    const serial=this.serial;
    this.result=null;this.samples.clear();
    $('#calibration-panel').hidden=false;
    $('#apply-calibration').disabled=true;
    $('#calibration-status').textContent='Écoute les quatre premiers clics, puis tape régulièrement sur les suivants.';
    try{
      await this.audio.init();
      if(serial!==this.serial || !$('#settings-dialog').open)return;
      this.audio.pause();
      const context=this.audio.ctx;
      this.gain=context.createGain();this.gain.gain.value=.8;this.gain.connect(this.audio.master);
      this.startAt=context.currentTime+.5;
      this.period=.6;
      this.voices=Array.from({length:16},(_,i)=>
        this.audio.tone(this.startAt+i*this.period,i%4===0?1200:900,.045,'sine',.2,this.gain));
      this.running=true;
      $('#calibration-tap').disabled=false;
      this.timer=setInterval(()=>this.tick(),25);
    }catch(error){this.stop();$('#calibration-status').textContent=error.message;}
  }
  tap(timestamp){
    if(!this.running)return;
    const stamp=timestamp>1e12?timestamp-performance.timeOrigin:timestamp;
    const time=this.audio.clock.outputContextTimeAt(stamp);
    const index=Math.round((time-this.startAt)/this.period);
    if(index<4 || index>=16 || this.samples.has(index))return;
    const error=(time-this.startAt-index*this.period)*1000;
    if(Math.abs(error)>280)return;
    this.samples.set(index,error);
    $('#calibration-status').textContent=this.samples.size+' / 12 tapes enregistrées. Continue sur les clics.';
  }
  tick(){
    if(this.audio.ctx.state!=='running'){
      this.stop();$('#calibration-status').textContent='Audio interrompu. Relance le calibrage.';return;
    }
    if(this.audio.clock.outputContextTimeAt(performance.now())<this.startAt+16*this.period)return;
    this.result=calibrationResult([...this.samples.values()]);
    this.stop();
    if(this.result){
      $('#calibration-status').textContent='Calage proposé · '+this.result.offset+' ms · régularité ±'+this.result.spread+' ms.';
      $('#apply-calibration').disabled=false;
    }else $('#calibration-status').textContent='Il manque des tapes régulières. Relance et suis les clics tranquillement.';
  }
}
