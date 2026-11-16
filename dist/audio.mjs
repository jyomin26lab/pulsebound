import { demoAccent } from './rhythm.mjs';
import { AudioClock } from './audio-clock.mjs';
import { BeatConductor } from './beat-conductor.mjs';
import { impactSamples, IMPACT_STYLES } from './audio-sfx.mjs';
import { withDeadline } from './audio-import.mjs';
export const TRACKS = {
  neon: { title: 'Neon Ronin', genre: 'SYNTHWAVE', bpm: 112, root: 55, scale: [0, 0, 7, 10, 0, 3, 7, 5] },
  chrome: { title: 'Chrome Rush', genre: 'ELECTRO', bpm: 144, root: 65.406, scale: [0, 0, 12, 7, 3, 3, 10, 7] },
  after: { title: 'After Hours', genre: 'DOWNTEMPO', bpm: 90, root: 49, scale: [0, 7, 3, 10, 5, 12, 7, 3] }
};
for(const track of Object.values(TRACKS))track.duration=120;
export class Soundtrack {
  constructor(onEnd) {
    this.onEnd = onEnd;
    this.playing = false;
    this.trackId = 'neon';
    this.bpm = 112;
    this.offset = 0;
    this.position = 0;
    this.volume = 0.65;
    this.metronome = false;
    this.sfx = true;
    this.impactStyle='leather';this.sfxVolume=.8;this.impactVariant=0;this.voices=new Set();
    this.buffer = null;
    this.detectedBeatMap=null;
    this.detectedBaseOffset=0;
    this.beatMode='detected';
  }
  prepare() {
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Ce navigateur ne prend pas en charge Web Audio. Essaie Chrome, Firefox ou Safari.');
      this.ctx = new Audio({ latencyHint: 'interactive' });
      this.clock=new AudioClock(this.ctx);
      this.conductor=new BeatConductor(this.clock);
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.volume;this.musicGain.connect(this.master);
      this.effectsGain=this.ctx.createGain();this.effectsGain.gain.value=this.sfxVolume;this.effectsGain.connect(this.master);
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 5;
      this.master.connect(compressor).connect(this.ctx.destination);
      this.conductor.on('schedule',event=>{
        if(this.metronome&&this.playing&&event.type==='beat')this.tone(event.contextTime,event.index%4===0?1400:1000,.035,'sine',.13);
      });
      this.refreshBeats();
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.impactBanks=Object.fromEntries(Object.keys(IMPACT_STYLES).map(style=>[style,Array.from({length:12},(_,i)=>{const pcm=impactSamples(this.ctx.sampleRate,{critical:i%6>=3,perfect:i>=6,variant:i%3,seed:81+(i%3)*733,style});const buffer=this.ctx.createBuffer(1,pcm.length,this.ctx.sampleRate);buffer.getChannelData(0).set(pcm);return buffer;})]));
      this.ctx.onstatechange = () => {
        if (['suspended','interrupted','closed'].includes(this.ctx.state) && this.playing) this.pause();
      };
    }
    return this.ctx;
  }
  async init({timeoutMs=2500}={}) {
    const context=this.prepare();
    if(context.state==='closed')throw Error('Le son a été fermé par le navigateur. Recharge la page pour le réactiver.');
    if(context.state==='running')return;
    // Safari needs resume() in the actual play gesture, never in the file-picker callback.
    const resuming=context.resume(),unlock=context.createBufferSource();
    unlock.buffer=context.createBuffer(1,1,context.sampleRate);unlock.connect(this.master);unlock.onended=()=>unlock.disconnect();unlock.start(0);
    await withDeadline(resuming,timeoutMs,'Le son attend ton autorisation. Touche de nouveau Jouer ou Commencer ; si nécessaire, ouvre le jeu dans Safari.');
    if(context.state!=='running')throw Error('Son interrompu. Reviens dans le jeu puis touche Commencer pour le reprendre.');
  }
  time() { return this.clock?this.clock.position:this.position; }
  audibleTime(timestamp=performance.now()){
    const stamp=Number.isFinite(timestamp)?timestamp>1e12?timestamp-performance.timeOrigin:timestamp:performance.now();
    return this.clock?this.clock.outputPositionAt(stamp,{preroll:true}):this.position;
  }
  async seek(position,resume=this.playing){
    if(!Number.isFinite(position))throw new TypeError('Position audio invalide.');
    this.pause();this.position=Math.max(0,Math.min(this.duration-.001,position));
    if(this.clock){this.clock.duration=this.duration;this.clock.seek(this.position);this.conductor.reset(this.position);}
    if(resume)await this.play();
  }
  get duration(){return this.buffer?.duration??TRACKS[this.trackId]?.duration??Infinity;}
  setBeatMode(mode){
    if(!['detected','tempo'].includes(mode))throw new TypeError('Mode de beat invalide.');
    if(this.beatMode===mode)return;this.beatMode=mode;this.refreshBeats();
  }
  setBeatMap(map,baseOffset=0){this.detectedBeatMap=map;this.detectedBaseOffset=baseOffset;this.refreshBeats();}
  refreshBeats(){
    if(!this.conductor)return;
    const duration=this.duration,shift=this.offset-this.detectedBaseOffset;
    const beats=this.beatMode==='detected'&&Array.isArray(this.detectedBeatMap?.beats)
      ?this.detectedBeatMap.beats.map(time=>time+shift).filter(time=>time>=0&&time<=duration):null;
    const current=this.conductor;
    const sameBeats=beats===null?current.beats===null:
      Array.isArray(current.beats)&&beats.length===current.beats.length&&beats.every((time,i)=>time===current.beats[i]);
    if(sameBeats && current.bpm===this.bpm && current.offset===this.offset && current.duration===duration)return;
    this.conductor.setBeatMap({beats,bpm:this.bpm,offset:this.offset,duration});
    if(this.playing)this.nextStep=this.conductor.lowerBound(this.time());
  }
  async play({countIn=0}={}) {
    if (this.playing) return;
    await this.init();
    if (this.buffer && this.position >= this.buffer.duration - 0.03) this.position = 0;
    const beats=this.position===0?Math.max(0,Math.min(4,Math.floor(countIn))):0;
    const firstClick=this.ctx.currentTime+(beats > 0 ? .12 : .065);
    const startAt=firstClick+beats*60/this.bpm;
    this.countInVoices=Array.from({length:beats},(_,i)=>
      this.tone(firstClick+i*60/this.bpm, i===0?1200:900,.05,'sine',.16,this.effectsGain));
    this.clock.start({at:startAt,position:this.position,duration:this.duration});
    this.bus = this.ctx.createGain();
    this.bus.connect(this.musicGain);
    this.playing = true;
    if (this.buffer) {
      this.source = this.ctx.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.bus);
      this.source.onended = () => {
        if (!this.playing) return;
        this.position = 0;
        this.playing = false;
        this.clock.stop();this.conductor.stop();this.conductor.reset(0);
        clearInterval(this.scheduler);
        this.bus.disconnect();
        this.onEnd?.({reason:'ended'});
      };
      this.source.start(startAt, this.position);
    }
    this.nextStep=this.conductor.lowerBound(this.position);
    if(!this.buffer&&this.trackId!=='silent'){this.schedule();this.scheduler = setInterval(() => this.schedule(), 25);}
    this.conductor.start();
  }
  pause() {
    if (!this.playing) return;
    for(const voice of this.countInVoices||[]){try{voice.stop();}catch{}}
    this.countInVoices=[];
    this.position = this.clock.pause();
    this.playing = false;
    this.conductor.stop();
    clearInterval(this.scheduler);
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch {}
      this.source.disconnect();
      this.source = null;
    }
    this.bus?.disconnect();
    this.onEnd?.({reason:'paused'});
  }
  select(id, buffer = null) {
    this.pause();
    this.position = 0;
    this.clock?.stop();this.conductor?.stop();
    this.buffer = buffer;
    this.trackId = id;
    this.bpm = TRACKS[id]?.bpm || 120;
    this.offset = 0;
    this.detectedBeatMap=null;this.detectedBaseOffset=0;this.refreshBeats();this.conductor?.reset(0);
  }
  setTempo(bpm, offset = this.offset) {
    if(bpm===this.bpm && offset===this.offset)return this.playing;
    const wasPlaying = this.playing;
    this.bpm = bpm;
    this.offset = offset;
    this.refreshBeats();
    if(this.playing)this.nextStep=this.conductor.lowerBound(this.time());
    return wasPlaying;
  }
  setVolume(value) {
    this.volume = value;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(value, this.ctx.currentTime, .03);
  }
  setSfxVolume(value){this.sfxVolume=Math.max(0,Math.min(1,value));if(this.effectsGain)this.effectsGain.gain.setTargetAtTime(this.sfxVolume,this.ctx.currentTime,.02);}
  tone(time, frequency, duration, type, volume, destination = this.bus) {
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    return osc;
  }
  drum(time, kind, accent = false) {
    if (kind === 'kick') {
      const osc = this.tone(time, 135, .23, 'sine', .55);
      osc.frequency.exponentialRampToValueAtTime(42, time + .17);
      return;
    }
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = kind === 'snare' ? 1100 : 6500;
    const duration = kind === 'snare' ? .14 : .045;
    gain.gain.setValueAtTime(kind === 'snare' ? .18 : accent ? .12 : .045, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    source.connect(filter).connect(gain).connect(this.bus);
    source.start(time);
    source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    if (kind === 'snare') this.tone(time, 175, .1, 'triangle', .1);
  }
  schedule() {
    if (!this.playing||this.buffer) return;
    if(this.time()>=this.duration){this.pause();this.position=0;this.clock.stop();this.conductor.reset(0);this.onEnd?.({reason:'ended'});return;}
    let event;
    while ((event=this.conductor.event(this.nextStep))&&event.contextTime < this.ctx.currentTime + .12) {
      const time=event.contextTime,stepLength=(this.conductor.event(this.nextStep+1)?.songTime??event.songTime+30/this.bpm)-event.songTime;
      const step = ((this.nextStep % 32) + 32) % 32;
      if (time >= this.ctx.currentTime&&event.songTime<this.duration) {
        if (!this.buffer) {
          const track = TRACKS[this.trackId];
          if (step % 4 === 0 || (this.trackId === 'chrome' && step % 8 === 6)) this.drum(time, 'kick');
          if (step % 4 === 2) this.drum(time, 'snare');
          this.drum(time, 'hat', Boolean(demoAccent(this.trackId, step)));
          const progression = [0, -2, 3, -5][Math.floor(step / 8)];
          const bass = track.root * 2 ** (progression / 12);
          if (step % 2 === 0) this.tone(time, bass, stepLength * 1.2, 'triangle', .22);
          const melody = bass * 4 * 2 ** (track.scale[step % 8] / 12);
          if (this.trackId !== 'after' || step % 2 === 0) this.tone(time, melody, stepLength * .72, 'triangle', .075);
          if (step % 8 === 0) {
            for (const semitone of [0, 3, 7]) this.tone(time, bass * 2 * 2 ** (semitone / 12), stepLength * 7.5, 'sine', .035);
          }
        }
      }
      this.nextStep++;
    }
  }
  async previewImpact(){await this.init();this.playImpact(false);}
  hit(grade,critical=false) {
    if (!this.ctx || !this.playing || !this.sfx) return;
    this.playImpact(critical,grade==='perfect');
  }
  playImpact(critical=false,perfect=false) {
    if (!this.ctx || this.ctx.state!=='running') return;
    if(this.voices.size>=12){const oldest=this.voices.values().next().value;try{oldest.stop();}catch{}this.voices.delete(oldest);}
    const source=this.ctx.createBufferSource();source.buffer=this.impactBanks[this.impactStyle][(perfect?6:0)+(critical?3:0)+(this.impactVariant++%3)];
    if(source.playbackRate)source.playbackRate.value=1+(Math.random()-.5)*.07;
    source.connect(this.effectsGain);source.onended=()=>{source.disconnect();this.voices.delete(source);};this.voices.add(source);source.start();
  }
  evade() {
    if (!this.ctx || !this.playing || !this.sfx) return;
    const osc = this.tone(this.ctx.currentTime, 800, .12, 'sine', .045, this.master);
    osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + .1);
  }
  cue(kind){
    if(!this.ctx||this.ctx.state!=='running'||!this.sfx)return;
    const notes={purchase:[440,660,880],milestone:[440,554,660,880],boss:[220,330,440,660],flow:[220,440,660,880],prestige:[330,440,554,660,880]};
    for(const [i,hz]of (notes[kind]||notes.purchase).entries()){
      this.tone(this.ctx.currentTime+i*.055,hz,.17,'triangle',.075,this.effectsGain);
      this.tone(this.ctx.currentTime+i*.055+.075,hz*2,.11,'sine',.015,this.effectsGain);
    }
  }
}
