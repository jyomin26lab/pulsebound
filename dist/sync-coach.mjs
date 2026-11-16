import {createSongChart,songSettings} from './song-chart.mjs';
import {gridFromTaps,nudgeConfig} from './sync-help.mjs';
const $=s=>document.querySelector(s);
export class SyncCoach {
  constructor({audio,onApply,onClose,onAdvanced}){
    this.audio=audio;this.dialog=$('#sync-coach');this.taps=[];
    $('#coach-play').addEventListener('click',async()=>{try{if(audio.playing)audio.pause();else{this.preview();await audio.play();}}catch(e){this.status(e.message);}});
    $('#coach-click').addEventListener('change',e=>audio.metronome=e.target.checked);
    $('#coach-position').addEventListener('input',async e=>{audio.pause();this.taps=[];await audio.seek(Number(e.target.value),false);this.tick();});
    $('#coach-tap').addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();this.tap(e.timeStamp);}});
    $('#coach-tap').addEventListener('click',e=>{if(e.detail===0)this.tap(e.timeStamp);});
    for(const button of this.dialog.querySelectorAll('[data-coach-shift]'))button.addEventListener('click',()=>{const before=this.draft.offset;this.draft=nudgeConfig(this.draft,Number(button.dataset.coachShift),this.track.duration);this.preview();this.status(before===this.draft.offset?'Le repère est déjà au début du morceau. Tape avec la batterie pour proposer une autre pulsation.':'Calage déplacé de '+Math.round(Number(button.dataset.coachShift)*1000)+' ms. Écoute pour comparer.');});
    $('#coach-reset').addEventListener('click',()=>{this.draft=songSettings(this.track);this.taps=[];this.preview();this.status('Réglage enregistré restauré.');});
    $('#coach-save').addEventListener('click',async()=>{const b=$('#coach-save');b.disabled=true;try{audio.pause();await onApply(this.draft);this.dialog.close();}catch(e){this.status(e.message);}finally{b.disabled=false;}});
    $('#open-advanced-editor').addEventListener('click',()=>{this.dialog.close();onAdvanced();});
    this.dialog.addEventListener('close',()=>{audio.pause();onClose();});
  }
  get open(){return this.dialog.open;}
  status(text){$('#coach-status').textContent=text;}
  show(track){this.track=track;this.draft=songSettings(track);this.taps=[];$('#coach-title').textContent=track.title;$('#coach-position').max=track.duration;$('#coach-click').checked=true;this.audio.metronome=true;this.dialog.showModal();this.preview();this.status('Écoute : le clic doit suivre la batterie. Si ça colle, tu peux déjà jouer.');this.tick();}
  preview(){const c=createSongChart({...this.track,chart:this.draft});this.audio.setTempo(c.config.bpm,c.config.offset);this.audio.setBeatMode('detected');this.audio.setBeatMap({beats:c.beats},c.config.offset);}
  tap(timestamp){
    if(!this.audio.playing){this.status('Appuie sur Écouter, puis tape sur la batterie au moins 6 fois.');return;}
    const time=this.audio.audibleTime(timestamp);
    if(this.taps.length&&(time-this.taps.at(-1)>2||time<=this.taps.at(-1)))this.taps=[];
    this.taps.push(time);this.taps=this.taps.slice(-8);
    const config=gridFromTaps(this.taps);
    if(config){this.draft=config;this.preview();this.status('Rythme proposé après '+this.taps.length+' tapes. Écoute le clic pour vérifier, puis garde ce réglage.');}
    else this.status(this.taps.length<6?this.taps.length+' / 6 tapes · continue sur la batterie.':'Tapes irrégulières : recommence tranquillement sur un passage régulier.');
    $('#coach-tap').classList.remove('tapped');void $('#coach-tap').offsetWidth;$('#coach-tap').classList.add('tapped');
  }
  tick(){if(!this.open)return;const t=this.audio.audibleTime();$('#coach-position').value=t;$('#coach-time').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');$('#coach-play').textContent=this.audio.playing?'Ⅱ PAUSE':'▶ ÉCOUTER';$('#coach-bpm').textContent=this.draft.bpm+' BPM · '+Math.round(this.draft.offset*1000)+' ms';const chart=this.audio.conductor?.beats||[],next=chart.find(b=>b>=t);$('#coach-pulse').classList.toggle('on',this.audio.playing&&next!==undefined&&next-t<.1);}
}
