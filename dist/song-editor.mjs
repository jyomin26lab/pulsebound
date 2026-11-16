import {alignBeat} from './sync-help.mjs';
import { createSongChart, songSettings } from './song-chart.mjs';
const $=s=>document.querySelector(s);
const clock=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');

export class SongEditor {
  constructor({audio,onApply,onClose,onAnalyze}){
    this.audio=audio;this.onApply=onApply;this.dialog=$('#song-editor');this.canvas=$('#editor-waveform');this.cursor=0;this.zoom=8;this.start=0;
    $('#editor-play').addEventListener('click',async()=>{try{if(audio.playing)audio.pause();else{this.preview();await audio.play();}}catch(error){this.status(error.message);}});
    $('#editor-position').addEventListener('input',async event=>{await this.seek(Number(event.target.value));});
    $('#editor-zoom').addEventListener('change',event=>{this.zoom=Number(event.target.value);this.draw();});
    this.canvas.addEventListener('pointerdown',event=>{const rect=this.canvas.getBoundingClientRect();void this.seek(this.start+(event.clientX-rect.left)/rect.width*this.zoom);});
    this.canvas.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();void this.seek(this.cursor+(event.key==='ArrowLeft'?-.01:.01));}});
    $('#editor-source').addEventListener('change',event=>{this.draft.source=event.target.value;this.refresh();});
    for(const [id,key,scale]of [['editor-bpm','bpm',1],['editor-offset','offset',.001]])$( '#'+id).addEventListener('input',event=>{const value=Number(event.target.value)*scale;if(!event.target.value||!Number.isFinite(value)||key==='bpm'&&(value<40||value>240)||key==='offset'&&(value<0||value>this.track.duration)){this.status('BPM : 40 à 240. Le premier temps doit être dans le morceau.');return;}this.draft[key]=value;if(key==='bpm')this.draft.source='grid';this.refresh();});
    for(const button of document.querySelectorAll('[data-offset-nudge]'))button.addEventListener('click',()=>{this.draft.offset=Math.max(0,Math.min(this.track.duration,this.draft.offset+Number(button.dataset.offsetNudge)/1000));this.refresh();});
    $('#editor-first-beat').addEventListener('click',()=>{this.draft=alignBeat(this.draft,this.chart().beats,this.cursor,this.track.duration);this.refresh();this.status('Un temps est aligné sur le curseur. Les temps précédents restent présents.');});
    $('#editor-add-section').addEventListener('click',()=>{
      const bpm=Number($('#editor-section-bpm').value);
      if(!Number.isFinite(bpm)||bpm<40||bpm>240||this.cursor<=this.draft.offset+.05||this.cursor>=this.track.duration-.05||this.draft.segments.some(s=>Math.abs(s.time-this.cursor)<.05)||this.draft.segments.length>=128){this.status('Place le curseur après le premier temps, à un nouvel instant, avec 40 à 240 BPM.');return;}
      this.draft.segments.push({time:Math.round(this.cursor*1000)/1000,bpm});this.draft.source='grid';this.refresh();
    });
    $('#editor-sections').addEventListener('click',event=>{const button=event.target.closest('[data-remove-section]');if(button){this.draft.segments.splice(Number(button.dataset.removeSection),1);this.draft.source='grid';this.refresh();}});
    $('#editor-sections').addEventListener('change',event=>{
      const input=event.target.closest('input[data-section]');if(!input)return;
      const index=Number(input.dataset.section),key=input.dataset.field,value=Number(input.value);
      if(!Number.isFinite(value)||key==='bpm'&&(value<40||value>240)||key==='time'&&(value<=this.draft.offset+.05||value>=this.track.duration||this.draft.segments.some((s,i)=>i!==index&&Math.abs(s.time-value)<.05))){this.status('Section invalide : vérifie son instant et son BPM.');this.refresh();return;}
      this.draft.segments[index][key]=value;this.draft.source='grid';this.refresh();
    });
    this.taps=[];$('#editor-tap').addEventListener('click',()=>{const now=performance.now();if(now-(this.taps.at(-1)||0)>2000)this.taps=[];this.taps.push(now);this.taps=this.taps.slice(-8);if(this.taps.length<2){$('#editor-tap').textContent='Encore…';return;}const gaps=this.taps.slice(1).map((t,i)=>t-this.taps[i]).sort((a,b)=>a-b),bpm=60000/gaps[Math.floor(gaps.length/2)];if(bpm>=40&&bpm<=240){this.draft.bpm=Math.round(bpm*10)/10;this.draft.source='grid';this.refresh();}$('#editor-tap').textContent=this.taps.length+' taps';});
    $('#editor-reanalyze').addEventListener('click',async()=>{const button=$('#editor-reanalyze');button.disabled=true;try{const analysis=await onAnalyze(p=>this.status('Analyse complète · '+p+' %'));this.draft={version:1,source:'auto',bpm:analysis.tempo?.bpm||this.track.bpm,offset:analysis.beatMap?.offset??this.track.offset,segments:[]};this.refresh();this.status('Analyse mise à jour. Écoute puis enregistre le calage pour l’appliquer.');}catch(error){this.status(error.message);}finally{button.disabled=false;}});
    $('#editor-save').addEventListener('click',async()=>{const button=$('#editor-save');if(!this.readForm())return;button.disabled=true;try{audio.pause();await onApply(this.draft);this.dialog.close();}catch(error){this.status(error.message);}finally{button.disabled=false;}});
    $('#editor-export').addEventListener('click',()=>{const chart=this.chart(),blob=new Blob([JSON.stringify({schema:'pulsebound-chart',version:1,title:this.track.title,duration:this.track.duration,config:chart.config,beats:chart.beats,events:chart.events})],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='pulsebound-carte.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    this.dialog.addEventListener('close',()=>{audio.pause();onClose();});
    new ResizeObserver(()=>{if(this.dialog.open)this.draw();}).observe(this.canvas);
  }
  get open(){return this.dialog.open;}
  status(text){$('#editor-status').textContent=text;}
  readForm(){
    const fields=[...this.dialog.querySelectorAll('input[type=number]')];
    const invalid=fields.find(input=>!input.value||!input.checkValidity());
    if(invalid){this.status('Vérifie les valeurs : 40 à 240 BPM et des instants dans le morceau.');invalid.reportValidity();return false;}
    const bpm=Number($('#editor-bpm').value),offset=Number($('#editor-offset').value)/1000;
    const sections=[...$('#editor-sections').querySelectorAll('.editor-section')].map(row=>({time:Number(row.querySelector('[data-field=time]').value),bpm:Number(row.querySelector('[data-field=bpm]').value)})).sort((a,b)=>a.time-b.time);
    if(sections.some((s,i)=>s.time<=offset+.05||s.time>=this.track.duration||(i&&s.time-sections[i-1].time<.05))){this.status('Chaque section doit commencer après le premier temps, à un instant distinct.');return false;}
    this.draft={...this.draft,bpm,offset,segments:sections};this.cachedChart=null;return true;
  }
  chart(){return this.cachedChart||(this.cachedChart=createSongChart({...this.track,chart:this.draft}));}
  show(track){
    this.track=track;this.draft=songSettings(track);this.cursor=this.audio.time();this.taps=[];$('#editor-title').textContent=track.title;$('#editor-position').max=track.duration;this.canvas.setAttribute('aria-valuemax',track.duration);$('#editor-section-bpm').value=this.draft.bpm;$('#editor-offset').max=Math.floor(track.duration*1000);$('#editor-reanalyze').hidden=track.builtin;this.dialog.showModal();this.refresh();
    this.status(track.builtin?'Original synthétisé : la grille pilote aussi la musique du dojo.':'Clique la forme d’onde pour écouter un passage. Les lignes verticales marquent les temps.');
  }
  preview(){const chart=this.chart();this.audio.setTempo(this.draft.bpm,this.draft.offset);this.audio.setBeatMode('detected');this.audio.setBeatMap({beats:chart.beats},this.draft.offset);}
  async seek(time){this.cursor=Math.max(0,Math.min(this.track.duration-.001,time));await this.audio.seek(this.cursor,false);this.draw();}
  refresh(){
    this.cachedChart=null;
    this.draft=songSettings({...this.track,chart:this.draft});
    $('#editor-source').value=this.draft.source;$('#editor-bpm').value=this.draft.bpm;$('#editor-offset').value=Math.round(this.draft.offset*1000);
    const chart=this.chart(),analysis=this.track.analysis;
    $('#editor-analysis').textContent=chart.automatic?'ANALYSE AUDIO · '+chart.beats.length+' TEMPS · '+chart.events.length+' COUPS · CONFIANCE '+Math.round((analysis.beatMap.confidence||0)*100)+' %':'GRILLE · '+chart.beats.length+' TEMPS · '+(this.draft.segments.length+1)+' SECTION'+(this.draft.segments.length?'S':'');
    const list=$('#editor-sections');list.replaceChildren();
    this.draft.segments.forEach((section,index)=>{
      const row=document.createElement('div');row.className='editor-section';
      for(const [key,label,value]of [['time','Début en secondes',section.time],['bpm','BPM de la section',section.bpm]]){const wrapper=document.createElement('label');wrapper.textContent=key==='time'?'À (s)':'BPM';const input=document.createElement('input');Object.assign(input,{type:'number',value,min:key==='time'?0:40,max:key==='time'?this.track.duration:240,step:key==='time'?.001:.1});input.dataset.section=index;input.dataset.field=key;input.setAttribute('aria-label',label+' '+(index+1));wrapper.append(input);row.append(wrapper);}
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.dataset.removeSection=index;remove.setAttribute('aria-label','Retirer la section '+(index+1));row.append(remove);list.append(row);
    });
    $('#editor-section-note').textContent=this.draft.source==='auto'?'L’analyse suit les attaques du fichier. Le décalage translate la carte. Modifier un BPM ou ajouter une section active la grille manuelle.':'Chaque section commence par un temps à l’instant indiqué. Le BPM reste actif jusqu’à la suivante.';
    this.preview();this.draw();
  }
  tick(now){
    if(!this.open)return;
    $('#editor-play').textContent=this.audio.playing?'Ⅱ PAUSE':'▶ ÉCOUTER';
    if(this.audio.playing){this.cursor=this.audio.audibleTime(now);this.draw();}
  }
  draw(){
    if(!this.track||!this.dialog.open)return;
    const width=Math.max(280,this.canvas.clientWidth),height=210,dpr=Math.min(2,devicePixelRatio||1);
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==height*dpr){this.canvas.width=Math.round(width*dpr);this.canvas.height=height*dpr;}
    const c=this.canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.fillStyle='#19373b';c.fillRect(0,0,width,height);
    this.start=Math.max(0,Math.min(Math.max(0,this.track.duration-this.zoom),this.cursor-this.zoom*.3));
    const x=t=>(t-this.start)/this.zoom*width,chart=this.chart();
    c.strokeStyle='#a8c4bc33';c.fillStyle='#a8c4bc';c.font='10px sans-serif';
    for(let t=Math.ceil(this.start);t<=this.start+this.zoom;t++){const px=x(t);c.beginPath();c.moveTo(px,20);c.lineTo(px,height);c.stroke();c.fillText(clock(t),px+4,14);}
    const wave=this.track.analysis?.waveform;
    if(Array.isArray(wave)&&wave.length){c.fillStyle='#a1c4ba';for(let px=0;px<width;px+=2){const a=Math.floor((this.start+px/width*this.zoom)/this.track.duration*wave.length),b=Math.ceil((this.start+(px+2)/width*this.zoom)/this.track.duration*wave.length);let peak=0;for(let i=a;i<=b;i++)peak=Math.max(peak,wave[i]||0);const h=peak*65;c.fillRect(px,113-h,1.5,Math.max(1,h*2));}}
    else{c.fillStyle='#a8c4bc';c.font='12px sans-serif';c.fillText(this.track.builtin?'SYNTHÈSE DU DOJO · GRILLE MUSICALE':'FORME D’ONDE DISPONIBLE APRÈS ANALYSE',16,110);}
    c.strokeStyle='#ffc72f';c.lineWidth=1.5;
    for(const time of chart.beats){if(time<this.start||time>this.start+this.zoom)continue;const px=x(time);c.beginPath();c.moveTo(px,26);c.lineTo(px,height-14);c.stroke();}
    c.fillStyle='#ef8745';for(const event of chart.events){if(event.beat||event.time<this.start||event.time>this.start+this.zoom)continue;const px=x(event.time);c.beginPath();c.moveTo(px,37);c.lineTo(px-4,30);c.lineTo(px+4,30);c.fill();}
    c.strokeStyle='#ff6d68';c.lineWidth=2;const cursor=x(this.cursor);c.beginPath();c.moveTo(cursor,20);c.lineTo(cursor,height);c.stroke();
    c.fillStyle='#ff6d68';c.beginPath();c.moveTo(cursor-5,20);c.lineTo(cursor+5,20);c.lineTo(cursor,28);c.fill();
    $('#editor-position').value=this.cursor;$('#editor-time').textContent=clock(this.cursor)+' / '+clock(this.track.duration);this.canvas.setAttribute('aria-valuenow',this.cursor.toFixed(3));
  }
}
