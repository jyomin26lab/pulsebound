import { judgePlayable } from './input-timing.mjs';
import { DeviceCalibration } from './device-calibration.mjs';
import { SAVE_KEY, freshState, restoreState, offlineReward, enemyHealth, enemyReward, attackPower, autoPower, autoIncome, producerIncome, earnPassive, upgradeCost, buyUpgrade, damageEnemy, hitDamage, addCoins, PRODUCERS, MILESTONES, ACHIEVEMENTS, producerUnlocked, producerMultiplier, rival, dojoTier, currentGoal, claimAchievements, prestige, prestigeGain, legacyMultiplier, songGrade, recordGrade, dailyChallenge, challengeMet, completeChallenge, dailyStreak, BOONS, boon, boonChoices, applyBoon, PERKS, perk, perkCost, buyPerk, sealsAvailable } from './core.mjs';
import { FlowMeter } from './flow.mjs';
import { MusicLibrary } from './music-library.mjs';
import { freestyleInterval, IMPACT_STYLES } from './audio-sfx.mjs';
import { Soundtrack, TRACKS } from './audio.mjs';
import { DojoScene } from './scene.mjs';
import { RhythmMap, demoMap } from './rhythm.mjs';
import { createSongChart, songSettings, ANALYSIS_VERSION } from './song-chart.mjs';
import { analyzeSong } from './analyze-song.mjs';
import { SongEditor } from './song-editor.mjs';
import { decodeMusicFile, decodeAudioBlob } from './audio-import.mjs';
import { AutoStriker, TECHNIQUES, STYLE_MOVES, FORMS, learnedMove, techniqueFor, beatPosition } from './combat-controls.mjs';
import {SyncCoach} from './sync-coach.mjs';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const coinGain=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
const format=value=>value>=10000?compact.format(value):coinGain.format(Math.floor(value*100+1e-8)/100);
const settingsKey='pulsebound-settings-v1';
let state=freshState(),settings={density:'standard',impactStyle:'leather',volume:65,latency:0,metronome:false,trackId:'neon',rhythmMode:'tempo',sfxVolume:80,sfx:true,intense:!matchMedia('(prefers-reduced-motion: reduce)').matches},storageAvailable=true;
try{
  state=restoreState(JSON.parse(localStorage.getItem(SAVE_KEY)));
  const raw=JSON.parse(localStorage.getItem(settingsKey));
  if(raw){
    if(['relaxed','standard','intense'].includes(raw.density))settings.density=raw.density;
    if(Object.hasOwn(IMPACT_STYLES,raw.impactStyle))settings.impactStyle=raw.impactStyle;
    if(Number.isFinite(raw.volume))settings.volume=Math.max(0,Math.min(100,raw.volume));
    if(Number.isFinite(raw.latency))settings.latency=Math.max(-250,Math.min(450,raw.latency));
    if(typeof raw.metronome==='boolean')settings.metronome=raw.metronome;
    if(typeof raw.sfx==='boolean')settings.sfx=raw.sfx;
    if(typeof raw.intense==='boolean')settings.intense=raw.intense;
    if(Object.hasOwn(TRACKS,raw.trackId))settings.trackId=raw.trackId;
    if(['tempo','freestyle'].includes(raw.rhythmMode))settings.rhythmMode=raw.rhythmMode;
    if(Number.isFinite(raw.sfxVolume))settings.sfxVolume=Math.max(0,Math.min(100,raw.sfxVolume));
  }
}catch{storageAvailable=false;}
let sessionHits=0,song={coins:0,perfects:0,hits:0,best:0,combo:0,missed:0,auto:false};
function resetSong(){sessionHits=0;song={coins:state.totalCoins,perfects:state.perfects,hits:state.hits,best:state.bestCombo,combo:0,missed:0,auto:false};}
const trophyQueue=[];let trophyTimer;
const welcome=offlineReward(state);
try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{storageAvailable=false;}
const library=new MusicLibrary();
let sessionMenuOpen=true,libraryLoaded=false,trackLoading=false,importing=false,loadedId=null,selectionSerial=0,advanceBusy=false,removedTrack=null,pendingWelcome=null,lastFreeHit=NaN;
let combo=0,perfectRun=0,lastBreakAt=0,holding=null,lastInput=-Infinity,toastTimeout,momentTimeout,lastActionSongTime=-1;
const flow=new FlowMeter();
let transportBusy=false,importedTitle='',lastPaint=0,lastFrame=performance.now(),autoFlashAt=0;
let importController=null;
let autoEnabled=false,armedTechnique=null,danceEnabled=true;
const autoStriker=new AutoStriker();
let taps=[],lastExpired=-1;
let beatDisplayBound=false,lastBeatPulse=null;
const resolved=new Set();
const queueNodes=new Map();
const audio=new Soundtrack(handleTransport);
audio.impactStyle=settings.impactStyle;audio.select(settings.trackId);audio.setVolume(settings.volume/100);audio.metronome=settings.metronome;audio.sfx=settings.sfx;audio.setSfxVolume(settings.sfxVolume/100);
const scene=new DojoScene($('#fight-canvas'));scene.intense=settings.intense;
let rhythm=demoMap(audio.trackId,audio.bpm,audio.offset,settings.rhythmMode);
function rebuildRhythm(){
  const track=library.current;
  if(track){const chart=createSongChart(track,{density:settings.density});rhythm=chart.rhythm;audio.setTempo(chart.config.bpm,chart.config.offset);audio.setBeatMode('detected');audio.setBeatMap({beats:chart.beats},chart.config.offset);}
  else{audio.setBeatMode('tempo');rhythm=demoMap('silent',audio.bpm,audio.offset,'tempo');}
  const free=settings.rhythmMode==='freestyle';$('#mobile-strike span').textContent=free?'Tape à ton rythme':'Quand la note rejoint le cercle';$('#rhythm-mode-label').textContent=free?'FREESTYLE':'RYTHME · '+({relaxed:'DÉTENTE',standard:'STANDARD',intense:'INTENSE'}[settings.density]);
  $$('[data-rhythm-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rhythmMode===settings.rhythmMode)));
  $('#tempo-options').hidden=free;$('#strike-button').setAttribute('aria-label',free?'Frapper librement':'Frapper en rythme');document.body.classList.toggle('freestyle',free);
  $('#bag-hitbox').setAttribute('aria-label',free?'Frapper librement le sac':'Frapper le sac');$('#bag-hitbox').title=free?'Frappe libre · D / F / Espace':'Frapper en rythme · D / F / Espace';
  $('.page-footer p').textContent=free?'D / F / Espace ou clique le sac quand tu veux.':'D / F / Espace · Frappe quand une note rejoint le grand repère. Note à traînée : garde la touche enfoncée.';
}
function toast(message){clearTimeout(toastTimeout);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function save(){
  if(document.hidden)return;
  state.savedAt=Date.now();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));localStorage.setItem(settingsKey,JSON.stringify(settings));storageAvailable=true;}catch{storageAvailable=false;}
  $('#save-status span').textContent=storageAvailable?'Sauvegardé':'Sauvegarde indisponible';
}
function clearNotes(){
  const button=$('#strike-button');button.classList.remove('target-active','target-due','holding');$('#mobile-strike').classList.remove('target-due');button.querySelector('.target-ring').style.opacity=0;delete button.dataset.event;delete button.dataset.time;
  const technique=armedTechnique||'punch';if(button.dataset.currentMove!==technique){button.dataset.currentMove=technique;button.querySelector('img').src=TECHNIQUES[technique].icon;}
  for(const node of queueNodes.values())node.remove();queueNodes.clear();
}
function resetCombo(){
  combo=0;perfectRun=0;holding=null;lastBeatPulse=null;lastFreeHit=NaN;clearNotes();rebuildRhythm();
  if(audio.time()<lastActionSongTime-.05){resolved.clear();lastActionSongTime=-1;flow.lastBeat=null;}
  const clock=audio.audibleTime()-settings.latency/1000,nearest=rhythm.nearest(clock);
  autoStriker.reset(rhythm,clock);
  lastExpired=rhythm.lowerBound(clock)-1;
  if(nearest&&clock<=nearest.time+rhythm.windows(nearest,state.upgrades.focus).good)lastExpired=nearest.index-1;
}
function transportLabel(){return autoEnabled?(audio.playing?'AUTO · SYNCHRO':'AUTO EN PAUSE'):settings.rhythmMode==='freestyle'?'FRAPPE LIBRE':audio.playing?'SUIS LA PULSATION':'À TON RYTHME';}
function syncTransport(){
  document.body.classList.toggle('playing',audio.playing);
  const button=$('#play-button');button.classList.toggle('playing',audio.playing);
  button.setAttribute('aria-label',audio.playing?'Mettre la musique en pause':'Lancer la musique');
  button.querySelector('use').setAttribute('href',audio.playing?'#i-pause':'#i-play');
  $('#timing-text').textContent=transportLabel();
  if(!audio.playing)resetCombo();
  updateUI();
}
async function play(){
  if(transportBusy||audio.playing&&!sessionMenuOpen||!libraryLoaded||importing||trackLoading)return;transportBusy=true;
  const fromMenu=sessionMenuOpen;
  if(fromMenu)audio.pause();
  $('#session-error').hidden=true;
  try{
    await audio.init();
    await ensureTrack();
    if(fromMenu){await audio.seek(0,false);resetSong();resolved.clear();lastActionSongTime=-1;flow.reset();}
    if(audio.position===0)resetSong();
    await audio.play({countIn:audio.position===0 && library.current?4:0});
    $('#dojo-reveal').hidden=true;
    sessionMenuOpen=false;
    if(!beatDisplayBound){
      audio.conductor.on('beat',event=>{
        lastBeatPulse=event;
        if(sessionMenuOpen||!$('#dojo-reveal').hidden||$$('dialog[open]').length)return;
        if(flow.beat(event)){state.flows++;showMoment('HUIT MESURES DE PUISSANCE','FLOW', 'REVENU AUTO ×3 · DÉGÂTS ×2,5','flow');scene.celebrate('flow');audio.cue('flow');award();}
      });
      audio.conductor.on('resync',event=>flow.resync(event.skipped));
      beatDisplayBound=true;
    }
    resetCombo();syncTransport();
    if(fromMenu)requestAnimationFrame(()=>$('#battle-card').scrollIntoView({block:'start',behavior:'auto'}));
  }catch(error){const message=error.message||'Lecture audio indisponible. Essaie de relancer le morceau.';$('#session-error').textContent=message;$('#session-error').hidden=false;toast(message);}finally{transportBusy=false;updateUI();}
}
$('#play-button').addEventListener('click',()=>sessionMenuOpen?previewTrack():audio.playing?audio.pause():play());
$('#preview-track').addEventListener('click',previewTrack);
async function previewTrack(){
  if(transportBusy||trackLoading||importing||!libraryLoaded)return;transportBusy=true;updateUI();
  try{if(audio.playing)audio.pause();else{await audio.init();await ensureTrack();await audio.play();}}catch(error){toast(error.message);}finally{transportBusy=false;syncTransport();}
}
$('#restart-session').addEventListener('click',async()=>{audio.pause();resetSong();flow.reset();resolved.clear();lastActionSongTime=-1;await audio.seek(0,false);await play();});
$('#start-button').addEventListener('click',play);
$('#mobile-start-button').addEventListener('click',play);
function setTrackUI(){
  const track=library.current;
  $('#track-title').textContent=track?.title||'Session sans musique';
  $('#preview-title').textContent=track?.title||'Session sans musique';$('#preview-meta').textContent=track?Math.floor(track.duration/60)+':'+String(Math.floor(track.duration%60)).padStart(2,'0')+' · '+(track.builtin?'Original du dojo':'Ton morceau'):'Ajoute ton son ou joue sans musique.';
  $('#track-subtitle').textContent=track?(library.order.indexOf(track.id)+1)+' / '+library.items.length+' · '+(track.builtin?'ORIGINAL DU DOJO':'TA PLAYLIST'):'AJOUTE UN SON OU JOUE LIBREMENT';
  const bpm=loadedId===(track?.id||'silent')?audio.bpm:track?.bpm||120;
  $('#bpm-display').textContent=number.format(bpm);$('#bpm-input').value=bpm;$('#menu-bpm').textContent=number.format(bpm)+' BPM';$('#offset-input').value=Math.round((track?.offset||0)*1000);
}
function handleTransport(event){
  syncTransport();
  if(event?.reason!=='ended'||sessionMenuOpen||$$('dialog[open]').length)return;
  if(!state.dojoLit && library.current){
    state.dojoLit=true;
    scene.litAt=performance.now();
    save();
    $('#dojo-reveal').hidden=false;
    $('#dojo-continue').focus({preventScroll:true});
    return;
  }
  showSongEnd();
}
// End-of-song card: the moment players usually leave, so make "one more" the easiest action.
function showSongEnd(){
  const hits=state.hits-song.hits,perfects=state.perfects-song.perfects,record=song.combo>song.best;
  // Only a fully manual run in rhythm mode is graded; Freestyle and Auto have no misses to count.
  const grade=settings.rhythmMode==='tempo'&&!song.auto?songGrade({perfects,goods:hits-perfects,notes:hits+song.missed}):null;
  const best=recordGrade(state,library.current?.id,grade);if(best){save();renderPlaylist();}
  const day=today(),challenge=dailyChallenge(day,library.items.map(track=>track.id));
  const dailyReward=settings.rhythmMode==='tempo'&&!song.auto&&challenge?.trackId===library.current?.id&&challengeMet(challenge,{combo:song.combo,grade,perfects})?completeChallenge(state,day):0;
  if(dailyReward){save();renderDaily();}
  award();
  $('#end-daily').hidden=!dailyReward;$('#end-daily').textContent='DÉFI DU JOUR RÉUSSI · +'+coinGain.format(dailyReward)+' PIÈCES · SÉRIE '+state.daily.streak+' J';
  $('#end-title').textContent=$('#track-title').textContent;
  $('#end-grade').hidden=!grade;$('#end-grade').dataset.grade=grade||'';$('#end-grade-letter').textContent=grade||'';
  $('#end-grade-note').textContent=best?'NOUVELLE MEILLEURE NOTE':'Meilleure : '+(state.grades[library.current?.id]||grade||'');
  $('#end-coins').textContent='+'+coinGain.format(state.totalCoins-song.coins);
  $('#end-combo').textContent=song.combo+'×';
  $('#end-perfects').textContent=hits?perfects+' / '+hits:'—';
  $('#end-record').hidden=!record;
  $('#song-end').showModal();offerBoons();
  if(record||best||dailyReward){scene.celebrate('flow');audio.cue('milestone');}
}
$('#end-next').addEventListener('click',()=>{$('#song-end').close();void advanceTrack(1,true);});
$('#end-replay').addEventListener('click',()=>{$('#song-end').close();$('#restart-session').click();});
// Each reinforced bag earns a boon pick. During a song the picks wait (saved in state.pendingBoons) and open
// over the end-of-song card, so a song is never interrupted; without music they open right away.
function offerBoons(){
  const dialog=$('#boon-dialog');if(dialog.open||!state.pendingBoons)return;
  drawBoons();dialog.showModal();dialog.querySelector('.boon-choice').focus();
}
function drawBoons(){
  $('#boon-count').textContent=state.pendingBoons>1?' · '+state.pendingBoons+' DONS À CHOISIR':'';$('#boon-reroll').hidden=!perk(state,'reroll');
  $('#boon-choices').replaceChildren(...boonChoices(Math.random,perk(state,'fourth')?4:3).map(id=>{
    const button=document.createElement('button');button.type='button';button.className='boon-choice';button.dataset.boon=id;
    const name=document.createElement('strong');name.textContent=BOONS[id].label;
    const text=document.createElement('span');text.textContent=BOONS[id].text;
    const level=document.createElement('small');level.textContent=BOONS[id].instant?'Immédiat':boon(state,id)?'Déjà ×'+boon(state,id):'Nouveau';
    button.append(name,text,level);return button;
  }));
}
$('#boon-reroll').addEventListener('click',()=>{$('#boon-reroll').hidden=true;drawBoons();$('#boon-choices .boon-choice').focus();});
// Seal shop buttons are built once; updateUI only refreshes their text and state.
$('#perk-list').append(...Object.entries(PERKS).map(([id,p])=>{
  const button=document.createElement('button');button.type='button';button.className='perk';button.dataset.perk=id;
  const name=document.createElement('strong');name.textContent=p.label;const text=document.createElement('span');text.textContent=p.text;
  const price=document.createElement('em');price.dataset.perkPrice='';button.append(name,text,price);return button;
}));
$('#perk-list').addEventListener('click',event=>{
  const id=event.target.closest('[data-perk]')?.dataset.perk;if(!id||!buyPerk(state,id))return;
  save();updateUI();toast('Acquis pour toujours · '+PERKS[id].label);scene.celebrate('purchase');audio.cue('milestone');
});
function renderPerks(){
  $('#perk-seals').textContent=format(sealsAvailable(state));
  $$('#perk-list .perk').forEach(button=>{
    const id=button.dataset.perk,cost=perkCost(state,id),level=perk(state,id),max=PERKS[id].max;
    button.disabled=!Number.isFinite(cost)||sealsAvailable(state)<cost;button.classList.toggle('owned',level>0);
    button.querySelector('[data-perk-price]').textContent=(max>1?'Niv. '+level+'/'+max+' · ':'')+(Number.isFinite(cost)?cost+' sceau'+(cost>1?'x':''):'Acquis');
  });
}
$('#boon-dialog').addEventListener('cancel',event=>event.preventDefault());// a pick is required, Esc does not skip it
$('#boon-choices').addEventListener('click',event=>{
  const id=event.target.closest('[data-boon]')?.dataset.boon;if(!id||!applyBoon(state,id))return;
  state.pendingBoons=Math.max(0,state.pendingBoons-1);award();save();toast('Don accordé · '+BOONS[id].label);scene.celebrate('flow');audio.cue('milestone');
  if(state.pendingBoons){drawBoons();$('#boon-choices .boon-choice').focus();}else $('#boon-dialog').close();
});
function today(){return new Date().toLocaleDateString('en-CA');}// local YYYY-MM-DD
function challengeText(c){return c.kind==='combo'?'Fais un combo de '+c.target:c.kind==='grade'?'Obtiens la note '+c.target+(c.target==='S'?'':' ou mieux'):'Réussis '+c.target+' Parfaits';}
// shortcut: refreshed when the playlist renders, not at midnight; add a timer if players keep the page open overnight.
function renderDaily(){
  const day=today(),challenge=dailyChallenge(day,library.items.map(track=>track.id)),card=$('#daily-card');
  card.hidden=!challenge;if(!challenge)return;
  const track=library.items.find(item=>item.id===challenge.trackId),done=state.daily.lastDone===day,streak=dailyStreak(state,day);
  card.dataset.trackId=challenge.trackId;card.classList.toggle('done',done);
  $('#daily-label').textContent=(done?'Réussi · ':'')+challengeText(challenge);
  $('#daily-detail').textContent=(track?.title||'')+(streak?' · série de '+streak+' jour'+(streak>1?'s':''):'');
  $('#daily-state').textContent=done?'✓':'↗';
}
$('#daily-card').addEventListener('click',()=>{const id=$('#daily-card').dataset.trackId;if(id)void chooseTrack(id);});
$('#dojo-continue').addEventListener('click',()=>{
  $('#dojo-reveal').hidden=true;
  void advanceTrack(1,true);
});
function showSessionMenu(){$('#dojo-reveal').hidden=true;audio.pause();sessionMenuOpen=true;updateUI();$('#session-menu').scrollIntoView({behavior:'auto',block:'start'});}
function showWelcome(result){
  if(result.seconds<30)return;
  if($$('dialog[open]').length){pendingWelcome=result;return;}
  audio.pause();$('#welcome-amount').textContent='+'+format(result.reward);
  const hours=Math.floor(result.seconds/3600),minutes=Math.floor(result.seconds%3600/60);
  $('#welcome-duration').textContent='Pendant '+(hours?hours+' h '+minutes+' min':minutes?minutes+' min':Math.floor(result.seconds)+' s')+' de méditation.';
  $('#welcome-detail').textContent=result.reward?'Ces pièces ont été ajoutés à ta réserve. Production d’absence limitée à 8 heures.':'Recrute des disciples pour que ton école gagne des pièces pendant ton absence.';
  $('#welcome-dialog').showModal();
}
function updateUI(){
  document.body.classList.toggle('in-session',!sessionMenuOpen);$('#session-menu').hidden=!sessionMenuOpen;$('#battle-card').hidden=sessionMenuOpen;
  $('#start-button').disabled=!libraryLoaded||trackLoading||importing||transportBusy;$('#start-button').firstChild.textContent=transportBusy?'ACTIVATION… ':trackLoading?'CHARGEMENT… ':'JOUER ';
  $('#mobile-start-button').disabled=$('#start-button').disabled;$('#mobile-start-button').textContent=transportBusy||trackLoading||importing?'…':'JOUER ↗';
  $('#play-button').disabled=!libraryLoaded||trackLoading||importing||transportBusy;$('#open-song-editor').disabled=!libraryLoaded||trackLoading||importing||!library.current;
  $('#cancel-audio-import').hidden=!importing;
  $('#preview-track').disabled=$('#play-button').disabled;$('#preview-track').textContent=sessionMenuOpen&&audio.playing?'Ⅱ PAUSE':'▶ ÉCOUTER';
  document.body.classList.toggle('auto-striking',autoEnabled);
  $('#auto-strike').setAttribute('aria-pressed',String(autoEnabled));$('#auto-strike span').textContent=autoEnabled?(audio.playing?'AUTO ON':'AUTO PAUSE'):'AUTO OFF';
  $$('[data-impact-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.impactStyle===settings.impactStyle)));
  $('#technique-status').textContent='SON DES COUPS · '+IMPACT_STYLES[settings.impactStyle].label+' · Touche un style pour écouter et le choisir.';
  $('#previous-track').disabled=!libraryLoaded||trackLoading||importing||!library.next(-1);$('#next-track').disabled=!libraryLoaded||trackLoading||importing||!library.next(1);
  const boost=flow.active&&audio.playing,opponent=rival(state.stage),goal=currentGoal(state),income=autoIncome(state)*(boost?3:1);
  $('#coins').textContent=format(state.coins);$('#shop-coins').textContent=format(state.coins);$('#session-coins').textContent=format(state.coins);
  $('#income-rate').textContent='par seconde : '+coinGain.format(income);$('#session-income').textContent=coinGain.format(income);
  for(const unit of $$('.coin-unit'))unit.textContent=state.coins<2?'pièce':'pièces';$('#auto-stat').textContent=number.format(income);$('#school-dps').textContent=number.format(income);
  $('#power-stat').textContent=format(attackPower(state)*(boost?2.5:1));
  $('#combo-count').innerHTML=combo+'<span>×</span>';
  $('#combo-run-label').textContent='ENCHAÎNEMENT · '+combo%8+' / 8';$$('#combo-chain i').forEach((dot,i)=>dot.classList.toggle('lit',i<combo%8));
  $('#stage-count').textContent=String(state.stage).padStart(2,'0');$('#enemy-name').textContent=opponent.name;
  $('#hero-mastery').textContent='POINGS ARDENTS · NIV. '+state.upgrades.power;
  const health=state.hp/enemyHealth(state.stage)*100;
  $('#enemy-health').style.width=health+'%';$('.health-track').setAttribute('aria-valuenow',Math.round(health));
  $('.battle-card').classList.toggle('is-boss',opponent.boss);$('#rival-tag').textContent=opponent.hint;
  const count=Object.keys(PRODUCERS).reduce((n,key)=>n+state.upgrades[key],0);
  $('#school-count').textContent=count;$('#school-count-label').textContent=count>1?'recrues':'recrue';
  $('#school-title').textContent=[state.dojoLit?'DOJO ILLUMINÉ':'SALLE D’ENTRAÎNEMENT','LA COUR OUVERTE','UNE ÉCOLE PREND VIE','LA VOIE DES MAÎTRES'][dojoTier(state)];
  $('#goal-label').textContent=goal.label;$('#goal-detail').textContent=goal.detail+' · '+format(Math.min(goal.current,goal.target))+' / '+format(goal.target);
  $('#goal-progress').style.width=Math.min(100,goal.current/goal.target*100)+'%';
  document.body.classList.toggle('flowing',boost);document.body.classList.toggle('flow-ready',flow.armed);
  const charge=flow.active?flow.remaining/32*100:flow.charge;
  $('#flow-fill').style.width=charge+'%';$('.flow-track').setAttribute('aria-valuenow',Math.round(charge));
  $('#flow-status').textContent=flow.active?(audio.playing?'PIÈCES AUTO ×3 · '+flow.remaining+' TEMPS':'FLOW EN PAUSE · '+flow.remaining+' TEMPS'):flow.armed?'PRÊT · AU PROCHAIN TEMPS':flow.charge>0?Math.floor(flow.charge)+(settings.rhythmMode==='freestyle'?' % · Continue à frapper':' % · Continue en rythme'):settings.rhythmMode==='freestyle'?'Frappe à ta façon':'Enchaîne pour booster tes pièces';
  let affordable=false;
  $$('.upgrade').forEach(button=>{
    const key=button.dataset.upgrade,cost=upgradeCost(state,key),level=state.upgrades[key],producer=PRODUCERS[key],unlocked=!producer||producerUnlocked(state,key);
    button.disabled=!unlocked||state.coins<cost||!Number.isFinite(cost);button.classList.toggle('affordable',!button.disabled);button.classList.toggle('locked',!unlocked);
    if(!button.disabled)affordable=true;
    button.querySelector('small b').textContent=level;button.querySelector('em span').textContent=!unlocked?'SÉRIE '+producer.unlock:Number.isFinite(cost)?format(cost):'MAX';
    if(producer){
      const next=MILESTONES.find(n=>n>level),before=MILESTONES.filter(n=>n<=level).at(-1)||0;
      const gain=(producerIncome({...state,upgrades:{...state.upgrades,[key]:level+1}},key)-producerIncome(state,key))*(boost?3:1);
      button.querySelector('[data-upgrade-description]').textContent=unlocked?(Number.isFinite(cost)?'+'+number.format(gain)+' pièce'+(gain===1?'':'s')+' / s avec cette recrue':'Production : '+number.format(producerIncome(state,key)*(boost?3:1))+' pièces / s · MAX'):'Disponible à la série '+producer.unlock;
      button.querySelector('.milestone-track i').style.width=(next?(level-before)/(next-before)*100:100)+'%';
      button.querySelector('.milestone-copy').textContent=next?'Prochain palier : '+next+' → revenus ×2':'Tous les paliers · revenus ×'+producerMultiplier(level);
    }
    button.setAttribute('aria-label',button.querySelector('strong').firstChild.textContent.trim()+', '+level+', '+(!unlocked?'disponible à la série '+producer.unlock:Number.isFinite(cost)?format(cost)+' pièces':'maximum'));
  });
  $('.dojo-button').dataset.affordable=affordable;
  renderPerks();$('#legacy-seals').textContent=format(state.seals);$('#legacy-bonus').textContent='+'+format(Math.round((legacyMultiplier(state)-1)*100))+' %';
  const gain=prestigeGain(state);$('#legacy-gain').textContent='+'+gain+' sceau'+(gain>1?'x':'');$('#prepare-prestige').disabled=gain<1;
  $('#legacy-requirement').textContent=gain>0?'Ton école est prête. Une nouvelle voie s’ouvre à toi.':'Brise le sac de la série 20 et gagne 12 000 pièces dans cette école. Progression : série '+state.stage+' · '+format(state.runCoins)+' / 12 000 pièces.';
  if($('#stats-dialog').open)updateStats();
}
function updateStats(){
  const stats=[[state.highestStage,'Meilleure série'],[state.kills,'Sacs brisés'],[state.bestCombo,'Meilleur combo'],[state.hits?Math.round(state.perfects/state.hits*100)+' %':'—','Frappes parfaites'],[state.flows,'Flows déclenchés'],[state.totalCoins,'Éclats gagnés']];
  $('#stats-grid').innerHTML=stats.map(([value,label])=>'<div class="stat-cell"><strong>'+(typeof value==='number'?format(value):value)+'</strong><span>'+label+'</span></div>').join('');
  $('#achievement-count').textContent=state.achievements.length+' / '+ACHIEVEMENTS.length;
  $('#achievements').innerHTML=ACHIEVEMENTS.map(a=>{const earned=state.achievements.includes(a.id),secret=a.hidden&&!earned;return '<div class="achievement '+(earned?'earned':'')+'"><i>'+(earned?'✓':'◇')+'</i><span><strong>'+(secret?'???':a.name)+'</strong><small>'+(secret?'Trophée caché':a.text)+'</small></span><em>'+(secret?'?':'+'+coinGain.format(a.reward))+' ◈</em></div>';}).join('');
}
function pulse(element,className){element.classList.remove(className);void element.offsetWidth;element.classList.add(className);}
// Colour + ✓/✗ on the target so hits and misses read without relying on colour alone.
function judgeFlash(grade){for(const element of [$('#strike-button'),$('#mobile-strike')]){element.dataset.judge=grade;pulse(element,'judged');}}
function showMoment(kicker,title,detail,kind=''){
  clearTimeout(momentTimeout);const card=$('#moment-card');card.className='moment-card '+kind;
  $('#moment-kicker').textContent=kicker;$('#moment-title').textContent=title;$('#moment-detail').textContent=detail;void card.offsetWidth;card.classList.add('show');
  momentTimeout=setTimeout(()=>card.classList.remove('show'),2900);
}
function award(){
  const earned=claimAchievements(state);if(!earned.length)return;
  trophyQueue.push(...earned);showTrophy();pulse($('.wallet'),'rewarding');save();
}
function showTrophy(){
  if(!trophyQueue.length||!$('#trophy-popup').hidden||$$('dialog[open]').length)return;
  const trophy=trophyQueue.shift();$('#trophy-name').textContent=trophy.name;$('#trophy-detail').textContent=trophy.text;$('#trophy-reward').textContent='+'+coinGain.format(trophy.reward)+' pièces';$('#trophy-popup').hidden=false;scene.celebrate('trophy');audio.cue('milestone');trophyTimer=setTimeout(closeTrophy,5500);
}
function closeTrophy(){clearTimeout(trophyTimer);$('#trophy-popup').hidden=true;showTrophy();}
$('#close-trophy').addEventListener('click',closeTrophy);
function dealDamage(amount){
  const previousStage=state.highestStage;
  const before=state.bosses,coinsBefore=state.totalCoins,count=damageEnemy(state,amount);if(!count)return 0;
  // The school can break several bags per second late in a run: the loud part (sound, big number, buzz) plays at most 4 times a second.
  const breakTime=performance.now(),loud=breakTime-lastBreakAt>250;if(loud)lastBreakAt=breakTime;
  pulse($('.wallet'),'rewarding');scene.celebrate('victory',breakTime,loud?'+'+format(state.totalCoins-coinsBefore)+' ◈':'');
  if(loud){audio.bagBreak();buzz([20,30,40]);}
  if(state.bosses>before){state.pendingBoons++;showMoment('ÉPREUVE ACCOMPLIE','LE SAC CÈDE.',audio.playing?'Un don t’attend à la fin du morceau.':'Choisis un don pour ton dojo.','boss');audio.cue('boss');if(!audio.playing)offerBoons();}
  else if(state.stage%5===0)showMoment('ÉPREUVE · SÉRIE '+state.stage,'SAC RENFORCÉ','Une résistance supérieure. Une récompense ×4.','boss');
  const unlocked=Object.values(FORMS).filter(form=>form.stage>previousStage && form.stage<=state.highestStage);
  if(unlocked.length){showMoment('NOUVELLE TECHNIQUE',unlocked.map(form=>form.label).join(' + ').toUpperCase(),'Nova l’ajoute à ses enchaînements.','flow');scene.celebrate('flow');audio.cue('milestone');}
  $('#accessible-feedback').textContent='Sac brisé ! Série '+state.stage+'. '+format(state.coins)+' pièces.';
  award();save();return count;
}
// Phone vibration on hits; follows the same switches as the visual effects.
function buzz(pattern){if(settings.intense&&scene.motion)navigator.vibrate?.(pattern);}
// Losing a real combo (8+) is marked, so the streak feels worth protecting.
function breakCombo(){
  if(combo>=8){scene.comboBreak();audio.comboBreak();feedback('COMBO PERDU','×'+combo+' · REPRENDS LE RYTHME','miss');buzz(60);}
  combo=0;perfectRun=0;flow.miss();
}
// Hold notes: while the key stays down Nova keeps striking (a tick every 0.18 s of song time) until the tail runs out.
function tickHold(clock,now){
  while(holding&&holding.nextTick<=Math.min(clock,holding.end)){
    holding.nextTick+=.18;holding.ticks++;
    scene.animate('hero',holding.ticks%2?'cross':'punch',now,170);scene.strikeBag(now,.6);scene.impact({combo,now});audio.holdTick();
    dealDamage(Math.max(1,Math.round(hitDamage(state,'good',combo,1).damage*.4)));// may open a boon pick, which pauses the song and clears the hold
  }
  if(!holding||clock<holding.end)return;
  const auto=holding.auto;holding=null;combo++;if(!auto){state.bestCombo=Math.max(combo,state.bestCombo);song.combo=Math.max(song.combo,combo);buzz([15,20,30]);}
  addCoins(state,.03);flow.hit('perfect',.5);scene.celebrate('purchase',now,'+0,03 ◈');audio.holdTick(true);
  feedback('TENUE PARFAITE','+1 COMBO · +0,03 PIÈCE','perfect');award();
}
// Letting go early only ends the burst: no penalty, the combo is kept. The last 120 ms count as a full hold.
function releaseHold(source){
  if(!holding||holding.auto||holding.source!==source)return;
  const clock=audio.audibleTime()-settings.latency/1000;
  if(clock>=holding.end-.12){holding.end=clock;return;}
  holding=null;feedback('RELÂCHÉ TROP TÔT','MAINTIENS JUSQU’AU BOUT DE LA TRAÎNÉE','miss');
}
document.addEventListener('keyup',event=>releaseHold(event.code));
for(const type of ['pointerup','pointercancel'])addEventListener(type,()=>releaseHold('pointer'));
addEventListener('blur',()=>{if(holding&&!holding.auto)holding=null;});
function feedback(label,subline,grade='perfect'){
  const element=$('#combat-feedback');element.className=`combat-feedback ${grade}`;element.replaceChildren(document.createTextNode(label));
  const small=document.createElement('small');small.textContent=subline;element.append(small);void element.offsetWidth;element.classList.add('show');
}
function setAuto(enabled){autoEnabled=enabled;resetCombo();$('#timing-text').textContent=transportLabel();updateUI();}
$('#auto-strike').addEventListener('click',()=>{setAuto(!autoEnabled);if(autoEnabled&&!audio.playing)void play();});
$$('[data-impact-style]').forEach(button=>button.addEventListener('click',async()=>{
  settings.impactStyle=button.dataset.impactStyle;audio.impactStyle=settings.impactStyle;save();updateUI();
  try{await audio.previewImpact();if(!settings.sfx||settings.sfxVolume===0)toast('Son choisi · les impacts sont coupés dans les réglages.');}catch(error){toast(error.message);}
}));
async function act(inputTimestamp=performance.now(),automaticEvent=null){
  if(sessionMenuOpen||!$('#dojo-reveal').hidden||$$('dialog[open]').length)return;
  const automated=Boolean(automaticEvent);
  if(!automated&&autoEnabled)setAuto(false);
  if(!audio.playing){await play();return;}
  if(audio.audibleTime(inputTimestamp)<0)return;
  const now=performance.now();
  const cooldown=settings.rhythmMode==='freestyle'?85:35;
  if(now-lastInput<cooldown)return;
  lastInput=now;
  const free=settings.rhythmMode==='freestyle'&&!automated;let judgment,interval;
  if(free){interval=freestyleInterval(audio.time(),lastFreeHit);lastFreeHit=audio.time();judgment={grade:'good',error:0};}
  else{
    judgment=automated?{event:automaticEvent,index:automaticEvent.index,error:0,grade:'good'}:judgePlayable(rhythm,audio.audibleTime(inputTimestamp)-settings.latency/1000,state.upgrades.focus,lastExpired,resolved);
    if(!judgment||judgment.index<=lastExpired||resolved.has(judgment.index))return;
    if(judgment.grade==='miss'){
      $('#timing-text').textContent=judgment.error<0?'TROP TÔT · ATTENDS LE CERCLE':'TROP TARD · PROCHAINE NOTE';
      judgeFlash('miss');
      return;
    }
    resolved.add(judgment.index);lastActionSongTime=audio.time();if(!automated)judgeFlash(judgment.grade);
    const previous=rhythm.event(judgment.index-1),next=rhythm.event(judgment.index+1);
    interval=Math.max(.12,Math.min(1.5,previous&&next?(next.time-previous.time)/2:next?next.time-judgment.event.time:previous?judgment.event.time-previous.time:60/audio.bpm));
  }
  if(!automated)state.hits++;else song.auto=true;
  const weight=interval/(60/112),boost=flow.active&&audio.playing;
  if(judgment.grade!=='miss'){
    if(!automated)sessionHits++;
    combo++;if(!automated){state.bestCombo=Math.max(combo,state.bestCombo);song.combo=Math.max(song.combo,combo);}if(judgment.grade==='perfect')state.perfects++;
    perfectRun=judgment.grade==='perfect'&&!automated?perfectRun+1:0;
    const hit=hitDamage(state,judgment.grade,combo),damage=Math.max(1,Math.round(hit.damage*weight*(boost?2.5:1)));
    const coinsEarned=0.01;addCoins(state,coinsEarned);
    const count=dealDamage(damage);flow.hit(judgment.grade,interval);
    const technique=techniqueFor(judgment.event?.index??state.hits-1,armedTechnique);armedTechnique=null;
    const move=learnedMove(technique,combo,state.highestStage,judgment.event?.index??state.hits-1);
    scene.animate('hero',move,now,Math.max(210,Math.min(420,interval*850)));scene.strikeBag(now,hit.critical?1.5:1);
    scene.impact({damage:'+'+coinGain.format(coinsEarned)+' ◈',critical:hit.critical,combo,now:now+45});
    feedback(hit.critical?'CRITIQUE':automated?'AUTO':free?'IMPACT':judgment.grade==='perfect'?'PARFAIT'+(perfectRun>1?' ×'+perfectRun:''):'BIEN',count?'SAC BRISÉ · SÉRIE '+state.stage:(FORMS[move]?.label||STYLE_MOVES[move]||TECHNIQUES[technique].label).toUpperCase()+' · +'+coinGain.format(coinsEarned)+' PIÈCE'+(coinsEarned<2?'':'S'),hit.critical?'critical':judgment.grade);
    audio.hit(judgment.grade,hit.critical,combo);if(!automated)buzz(hit.critical?30:10);
    if(judgment.event?.hold&&!free&&audio.playing){holding={index:judgment.event.index,end:judgment.event.time+judgment.event.hold,nextTick:judgment.event.time+.18,auto:automated,source:null,ticks:0};feedback('MAINTIENS','RAFALE · GARDE LA TOUCHE ENFONCÉE','perfect');}pulse($('.combo-badge'),'bump');pulse($('#strike-button'),'impact');award();
    if(!free&&!automated&&[8,16,32,64,128].includes(combo)){showMoment('ENCHAÎNEMENT SANS RUPTURE','COMBO ×'+combo,combo>=32?'LE DOJO SUIT TON FLOW.':'CHAQUE COUP TROUVE SA PLACE.','flow');audio.cue('milestone');scene.celebrate('flow');}
  }else{
    breakCombo();scene.animate('hero','punch',now);feedback('HORS TEMPO','VISE LE GRAND REPÈRE','miss');
  }
  $('#timing-text').textContent=automated?'AUTO · SYNCHRO':free?'FRAPPE LIBRE':(judgment.grade==='perfect'?'PARFAIT':judgment.error<0?'UN PEU TÔT':'UN PEU TARD')+' · '+Math.round(Math.abs(judgment.error))+' MS';
  updateUI();
}
for(const selector of ['#strike-button','#bag-hitbox','#mobile-strike']){
  $(selector).addEventListener('pointerdown',event=>{if(event.button!==0||event.pointerType==='touch'&&!audio.playing)return;event.preventDefault();act(event.timeStamp);if(holding&&!holding.source)holding.source='pointer';});
  $(selector).addEventListener('contextmenu',event=>event.preventDefault());// a long press must hold the note, not open a menu
  $(selector).addEventListener('click',event=>{if(event.detail===0||!audio.playing)act(event.timeStamp);});
}
document.addEventListener('keydown',event=>{
  if(sessionMenuOpen)return;
  if(!['KeyD','KeyF','Space'].includes(event.code)||event.repeat||event.ctrlKey||event.altKey||event.metaKey||$$('dialog[open]').length||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  if(event.code==='Space'&&event.target.closest('button')&&!['strike-button','bag-hitbox','mobile-strike','play-button','start-button'].includes(event.target.closest('button').id))return;
  event.preventDefault();act(event.timeStamp);if(holding&&!holding.source)holding.source=event.code;
});
function selectShopTab(key,focus=false){
  $$('[data-shop-tab]').forEach(button=>{const selected=button.dataset.shopTab===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('#'+button.dataset.shopTab+'-panel').hidden=!selected;if(selected&&focus)button.focus();});
}
$$('[data-shop-tab]').forEach((button,index)=>{
  button.addEventListener('click',()=>selectShopTab(button.dataset.shopTab));
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[data-shop-tab]'),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectShopTab(tabs[next].dataset.shopTab,true);});
});
function openDojo(tab='school'){selectShopTab(tab);$('#dojo-sidebar').scrollIntoView({behavior:scene.motion?'smooth':'auto',block:'nearest'});}
$$('[data-dojo-scroll]').forEach(button=>button.addEventListener('click',()=>openDojo()));
$('#goal-card').addEventListener('click',()=>{const goal=currentGoal(state);if(goal.action==='combat'){if(!audio.playing)play();else toast('Le sac renforcé arrive à la prochaine épreuve.');}else openDojo(goal.action==='legacy'?'legacy':'school');});
$$('.upgrade').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.upgrade,before=producerMultiplier(state.upgrades[key]),tier=dojoTier(state);
  if(!buyUpgrade(state,key))return;
  if(key==='echo' && state.upgrades.echo===1){
    scene.welcomeDisciple=true;
    toast('Ton premier disciple rejoint l’arène et s’entraîne avec toi.');
  }
  const milestone=PRODUCERS[key]&&producerMultiplier(state.upgrades[key])>before;
  pulse(button,'bought');scene.celebrate('purchase');audio.cue(milestone?'milestone':'purchase');
  if(milestone)showMoment('UN NOUVEAU PALIER',PRODUCERS[key].name.toUpperCase()+' ×2',state.upgrades[key]+' recrues. Les revenus de cette formation doublent.');
  else if(dojoTier(state)>tier)showMoment('TON ÉCOLE ÉVOLUE','LE BRASIER GRANDIT.','De nouvelles bannières illuminent le dojo.');
  award();updateUI();save();
}));
$('#prepare-prestige').addEventListener('click',()=>{audio.pause();const gain=prestigeGain(state);if(gain<1)return;$('#legacy-preview').textContent='Tu recevras '+gain+' sceau'+(gain>1?'x':'')+', pour une puissance permanente totale de +'+format((state.seals+gain)*20)+' %. Poings ardents niveau 1 seront offerts.';$('#legacy-confirm').showModal();});
$('#confirm-prestige').addEventListener('click',()=>{
  const gain=prestige(state);if(!gain)return;flow.reset();resolved.clear();lastActionSongTime=-1;resetCombo();$('#legacy-confirm').close();showMoment('TRANSMISSION','UNE NOUVELLE ÉCOLE.','+'+gain+' sceaux · La légende continue.','flow');scene.celebrate('flow');audio.cue('prestige');award();selectShopTab('school');updateUI();save();
});

$$('[data-dialog]').forEach(button => button.addEventListener('click', () => {
  const dialog = document.getElementById(button.dataset.dialog);
  if (dialog.id === 'stats-dialog') updateStats();
  audio.pause();
  dialog.showModal();
}));
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));
const durationText=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function renderPlaylist(){
  const list=$('#playlist-list');list.replaceChildren();$('#playlist-count').textContent=library.items.length;$('#playlist-empty').hidden=library.items.length>0;
  $('#playlist-repeat').checked=library.repeat;
  $('.library-note').textContent=library.persistent?'Tes sons restent sur cet appareil et sont conservés dans ce navigateur.':'Stockage limité : les nouveaux sons peuvent ne rester que pour cette session.';
  library.items.forEach((track,index)=>{
    const row=document.createElement('li');row.dataset.trackId=track.id;row.draggable=true;row.className='playlist-row'+(track.id===library.selected?' selected':'');
    const drag=document.createElement('span');drag.className='drag-grip';drag.textContent='⠿';drag.setAttribute('aria-hidden','true');row.append(drag);
    const choose=document.createElement('button');choose.className='playlist-choose';choose.dataset.action='select';choose.setAttribute('aria-pressed',String(track.id===library.selected));choose.title=track.title;
    const title=document.createElement('strong');title.textContent=track.title;if(state.grades[track.id]){const badge=document.createElement('span');badge.className='grade-badge';badge.dataset.grade=state.grades[track.id];badge.textContent=state.grades[track.id];badge.title='Meilleure note';title.prepend(badge);}const meta=document.createElement('small');meta.textContent=durationText(track.duration)+' · '+number.format(track.bpm)+' BPM'+(track.builtin?' · DOJO':'');choose.append(title,meta);row.append(choose);
    for(const [action,text,label,disabled]of [['up','↑','Monter',index===0],['down','↓','Descendre',index===library.items.length-1],['remove','×','Retirer',false]]){const button=document.createElement('button');button.className='playlist-action '+action;button.dataset.action=action;button.textContent=text;button.disabled=disabled;button.setAttribute('aria-label',label+' '+track.title);row.append(button);}
    list.append(row);
  });
  $$('[data-original]').forEach(button=>button.disabled=library.order.includes(button.dataset.original));setTrackUI();renderDaily();
}
async function ensureTrack(){
  const track=library.current,id=track?.id||'silent';if(loadedId===id)return;
  const serial=++selectionSerial;trackLoading=true;updateUI();
  try{
    audio.prepare();let buffer=null;if(track&&!track.builtin)buffer=await decodeAudioBlob(audio.ctx,track.blob);
    if(serial!==selectionSerial||id!==(library.current?.id||'silent'))return;
    if(track&&!track.builtin&&track.analysis?.version!==ANALYSIS_VERSION&&!track.analysisAttempted){
      $('#upload-status').textContent='Analyse complète · '+track.title;
      try{track.analysis=await analyzeSong(buffer,p=>$('#upload-status').textContent='Analyse complète · '+track.title+' · '+p+' %');if(!track.chart||track.chart.source==='auto'){track.bpm=track.analysis.tempo?.bpm||track.bpm;track.offset=track.analysis.beatMap?.offset??track.offset;track.chart={...songSettings(track),source:'auto',bpm:track.bpm,offset:track.offset};}await library.persist({record:track});}
      catch(error){track.analysisAttempted=true;toast(error.message);}
    }
    if(serial!==selectionSerial)return;
    resetSong();audio.select(track?.builtin?id:track?'custom':'silent',buffer);audio.setTempo(track?.bpm||120,track?.offset||0);loadedId=id;flow.reset();resolved.clear();lastActionSongTime=-1;resetCombo();setTrackUI();
  }finally{if(serial===selectionSerial){trackLoading=false;updateUI();}}
}
async function chooseTrack(id,resume=false){
  if(trackLoading)return;audio.pause();await library.select(id);loadedId=null;renderPlaylist();
  try{await ensureTrack();if(resume)await play();}catch{toast('Ce morceau ne peut pas être lu. Retire-le ou choisis un autre son.');}
}
async function advanceTrack(direction=1,resume=audio.playing){
  if(advanceBusy||trackLoading)return;const id=library.next(direction);
  if(!id){if(resume){showSessionMenu();toast('Playlist terminée. Choisis un morceau ou active la boucle.');}return;}
  advanceBusy=true;try{await chooseTrack(id,resume);}finally{advanceBusy=false;}
}
$$('[data-session-menu]').forEach(button=>button.addEventListener('click',showSessionMenu));
$('#previous-track').addEventListener('click',()=>advanceTrack(-1));$('#next-track').addEventListener('click',()=>advanceTrack(1));
$('#playlist-list').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]'),row=button?.closest('[data-track-id]');if(!row||importing||trackLoading)return;
  const id=row.dataset.trackId,index=library.order.indexOf(id),action=button.dataset.action;
  if(action==='select'){await chooseTrack(id);return;}
  if(action==='up'||action==='down')await library.move(id,index+(action==='up'?-1:1));
  if(action==='remove'){
    if(library.selected===id){audio.pause();loadedId=null;selectionSerial++;}
    removedTrack=await library.remove(id);$('#undo-remove').hidden=false;
  }
  renderPlaylist();updateUI();
});
$('#undo-remove').addEventListener('click',async()=>{if(!removedTrack)return;await library.restore(removedTrack);removedTrack=null;$('#undo-remove').hidden=true;renderPlaylist();updateUI();});
let draggingTrack=null;
$('#playlist-list').addEventListener('dragstart',event=>{const row=event.target.closest('[data-track-id]');if(!row)return;draggingTrack=row.dataset.trackId;event.dataTransfer.setData('text/plain',draggingTrack);event.dataTransfer.effectAllowed='move';row.classList.add('dragging');});
$('#playlist-list').addEventListener('dragover',event=>{if(!draggingTrack)return;event.preventDefault();event.dataTransfer.dropEffect='move';});
$('#playlist-list').addEventListener('drop',async event=>{if(!draggingTrack)return;event.preventDefault();event.stopPropagation();const target=event.target.closest('[data-track-id]');if(target){await library.move(draggingTrack,library.order.indexOf(target.dataset.trackId));renderPlaylist();}draggingTrack=null;});
$('#playlist-list').addEventListener('dragend',()=>{draggingTrack=null;$$('.playlist-row.dragging').forEach(row=>row.classList.remove('dragging'));});
$('#playlist-repeat').addEventListener('change',async event=>{library.repeat=event.target.checked;await library.persist();updateUI();});
$$('[data-original]').forEach(button=>button.addEventListener('click',async()=>{await library.addOriginal(button.dataset.original);renderPlaylist();updateUI();}));
$$('[data-rhythm-mode]').forEach(button=>button.addEventListener('click',()=>{settings.rhythmMode=button.dataset.rhythmMode;resetSong();flow.reset();resetCombo();save();updateUI();}));
async function changeTempo(bpm,offset=audio.offset){
  if(!Number.isFinite(bpm)||bpm<40||bpm>240||!Number.isFinite(offset)||offset<0||offset>(library.current?.duration||120)){toast('Choisis 40 à 240 BPM et un premier temps dans le morceau.');setTrackUI();return;}
  audio.setTempo(Math.round(bpm*10)/10,offset);if(library.current){const track=library.current;track.bpm=audio.bpm;track.offset=offset;track.chart={...songSettings(track),source:'grid',bpm:track.bpm,offset};await library.persist(track.builtin?{}:{record:track});}resolved.clear();lastActionSongTime=-1;resetCombo();renderPlaylist();
}
$('#bpm-input').addEventListener('change',event=>changeTempo(Number(event.target.value),library.current?.offset||0));
$('#offset-input').addEventListener('change',event=>changeTempo(Number($('#bpm-input').value),Number(event.target.value)/1000));
$('#half-tempo').addEventListener('click',()=>changeTempo(Number($('#bpm-input').value)/2));$('#double-tempo').addEventListener('click',()=>changeTempo(Number($('#bpm-input').value)*2));
$('#tap-tempo').addEventListener('click',()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);taps=taps.slice(-8);$('#tap-tempo').textContent=taps.length<2?'Encore…':taps.length+' taps';if(taps.length>1){const values=taps.slice(1).map((t,i)=>t-taps[i]).sort((a,b)=>a-b);changeTempo(60000/values[Math.floor(values.length/2)]);}});
async function importAudio(files){
  if(importing||!files.length)return;await libraryReady;if(importing)return;importing=true;updateUI();const status=$('#upload-status');status.className='upload-status';const added=[],errors=[];let saved=true;
  importController=new AbortController();const signal=importController.signal;
  try{
    audio.prepare();
    for(const [index,file]of files.entries()){
      status.textContent='Ajout '+(index+1)+' / '+files.length+' · '+file.name;
      try{
        const buffer=await decodeMusicFile(audio.ctx,file,{signal});
        let analysis=null;
        try{analysis=await analyzeSong(buffer,p=>status.textContent='Analyse '+(index+1)+' / '+files.length+' · '+file.name+' · '+p+' %',{signal});}catch(error){if(error.name==='AbortError')throw error;errors.push(file.name+' : '+error.message);}
        if(signal.aborted)throw new DOMException('Import annulé.','AbortError');
        const record={id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,'').slice(0,180),blob:file,bpm:analysis?.tempo?.bpm||120,offset:analysis?.beatMap?.offset??analysis?.tempo?.offset??0,duration:buffer.duration,builtin:false,analysis,analysisAttempted:!analysis};
        saved=(await library.add(record))&&saved;added.push(record.id);renderPlaylist();
      }catch(error){if(error.name==='AbortError')throw error;errors.push(file.name+' : '+(error.message||'Lecture impossible.'));}
    }
    if(added.length&&!audio.playing){await library.select(added[0]);loadedId=null;audio.select('silent');}
    status.textContent=added.length+' son'+(added.length>1?'s':'')+' ajouté'+(added.length>1?'s':'')+'. '+(saved?'Playlist conservée sur cet appareil.':'Stockage indisponible ou plein : les nouveaux sons restent pour cette session.')+(errors.length?' '+errors.join(' '):'');
    if(errors.length||!saved)status.classList.add('error');
  }catch(error){status.textContent=error.name==='AbortError'?'Import annulé. '+added.length+' son(s) déjà ajoutés à la playlist.':error.message||'Import impossible. Essaie un MP3, M4A ou WAV depuis Fichiers.';status.classList.add('error');}
  finally{importing=false;importController=null;$('#audio-upload').value='';renderPlaylist();updateUI();}
}
$('#audio-upload').addEventListener('change',event=>importAudio(Array.from(event.target.files)));
$('#cancel-audio-import').addEventListener('click',()=>importController?.abort());
const dropzone=$('#upload-zone');
for(const type of ['dragenter','dragover'])dropzone.addEventListener(type,event=>{if(draggingTrack)return;event.preventDefault();dropzone.classList.add('dragging');});
for(const type of ['dragleave','drop'])dropzone.addEventListener(type,()=>dropzone.classList.remove('dragging'));
dropzone.addEventListener('drop',event=>{if(draggingTrack)return;event.preventDefault();importAudio(Array.from(event.dataTransfer.files));});
document.addEventListener('dragover',event=>event.preventDefault());document.addEventListener('drop',event=>event.preventDefault());
const libraryReady=library.load().then(()=>{libraryLoaded=true;$('#upload-status').textContent=library.persistent?'Tes sons restent sur cet appareil.':'Stockage musical indisponible : playlist conservée pour cette session uniquement.';renderPlaylist();updateUI();});
async function applySongConfig(config){
  const track=library.current;track.chart=config;track.bpm=config.bpm;track.offset=config.offset;
  const stored=await library.persist(track.builtin?{}:{record:track});resolved.clear();lastActionSongTime=-1;resetCombo();renderPlaylist();toast(stored?'Calage enregistré avec ce morceau.':'Calage appliqué pour cette session. Stockage indisponible.');
}
function closeSync(){audio.metronome=settings.metronome;resetSong();resolved.clear();lastActionSongTime=-1;resetCombo();setTrackUI();}
const editor=new SongEditor({audio,onApply:applySongConfig,onClose:closeSync,onAnalyze:async progress=>{
  const track=library.current;track.analysis=await analyzeSong(audio.buffer,progress);track.analysisAttempted=false;await library.persist({record:track});return track.analysis;
}});
async function openAdvanced(){audio.pause();flow.reset();try{await ensureTrack();$('#editor-click').checked=settings.metronome;editor.show(library.current);}catch(error){toast(error.message);}}
const coach=new SyncCoach({audio,onApply:applySongConfig,onClose:closeSync,onAdvanced:openAdvanced});
$('#open-song-editor').addEventListener('click',async()=>{audio.pause();flow.reset();try{await ensureTrack();coach.show(library.current);}catch(error){toast(error.message);}});
$('#editor-click').addEventListener('change',event=>audio.metronome=event.target.checked);

function syncMixer(){
  for(const input of $$('[data-volume]'))input.value=input.dataset.volume==='music'?settings.volume:settings.sfxVolume;
  $('#volume-value').textContent=settings.volume+' %';$('#menu-volume-value').textContent=settings.volume+' %';$('#sfx-volume-value').textContent=settings.sfxVolume+' %';$('#menu-sfx-value').textContent=settings.sfxVolume+' %';
}
syncMixer();$('#latency').value=settings.latency;$('#latency-value').textContent=settings.latency+' ms';$('#metronome').checked=settings.metronome;$('#menu-metronome').checked=settings.metronome;
$('#note-density').value=settings.density;
$('#note-density').addEventListener('change',event=>{
  settings.density=event.target.value;
  flow.reset();resolved.clear();lastActionSongTime=-1;resetCombo();save();
});
const deviceCalibration=new DeviceCalibration(audio,offset=>{
  settings.latency=offset;
  $('#latency').value=offset;
  $('#latency-value').textContent=offset+' ms';
  resetCombo();save();
});
$('#sfx').checked=settings.sfx;$('#intense-effects').checked=settings.intense;
$('#sfx').addEventListener('change',event=>{settings.sfx=event.target.checked;audio.sfx=settings.sfx;save();});
$('#intense-effects').addEventListener('change',event=>{settings.intense=event.target.checked;scene.intense=settings.intense;save();});
$$('[data-volume]').forEach(input=>input.addEventListener('input',()=>{const value=Number(input.value);if(input.dataset.volume==='music'){settings.volume=value;audio.setVolume(value/100);}else{settings.sfxVolume=value;audio.setSfxVolume(value/100);}syncMixer();save();}));
$('#menu-metronome').addEventListener('change',event=>{settings.metronome=event.target.checked;audio.metronome=settings.metronome;$('#metronome').checked=settings.metronome;save();});
$('#latency').addEventListener('input', event => {
  settings.latency = Number(event.target.value);
  $('#latency-value').textContent = `${settings.latency > 0 ? '+' : ''}${settings.latency} ms`;
  resetCombo();
  save();
});
$('#metronome').addEventListener('change', event => { settings.metronome = event.target.checked; audio.metronome = settings.metronome; $('#menu-metronome').checked=settings.metronome; save(); });
$('#export-save').addEventListener('click', () => {
  state.savedAt = Date.now();
  const blob = new Blob([JSON.stringify({ game: 'pulsebound', version: 1, state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = 'pulsebound-sauvegarde.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#save-message').textContent = 'Sauvegarde exportée. Garde le fichier pour retrouver ton dojo.';
});
$('#import-save').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Fichier trop volumineux.');
    const data = JSON.parse(await file.text());
    if (data.game !== 'pulsebound' || data.state?.version !== 1) throw new Error('Sauvegarde Pulsebound non reconnue.');
    audio.pause();flow.reset();resolved.clear();lastActionSongTime=-1;
    state = restoreState(data.state);resetSong();
    const importedReward=offlineReward(state);showWelcome(importedReward);
    resetCombo();
    updateUI();
    save();
    $('#save-message').textContent = 'Ton dojo a été restauré.';
    toast('Sauvegarde importée. Ton dojo t’attend.');
  } catch (error) { $('#save-message').textContent = `Import impossible : ${error.message}`; }
  event.target.value = '';
});


function drawNotes(time){
  if(!audio.playing||settings.rhythmMode==='freestyle'){clearNotes();return;}
  const runway=$('#note-runway'),height=runway.clientHeight;
  const target=$('#strike-button');
  const anchor=target.parentElement.offsetTop+target.offsetTop+target.offsetHeight/2;
  const ahead=Math.max(1.6,Math.min(2.8,(height-anchor)/170));
  const clock=time-settings.latency/1000,upcoming=rhythm.upcoming(clock,ahead,.2).filter(event=>event.index>lastExpired&&!resolved.has(event.index)),visible=new Set();
  for(const note of upcoming){
    visible.add(note.index);let node=queueNodes.get(note.index);
    if(!node){node=document.createElement('span');node.className='queue-note'+(note.beat?'':' offbeat');const img=document.createElement('img');img.src='./icons/power.svg';img.alt='';const label=document.createElement('small');label.textContent=note.index%8+1;node.append(img,label);if(note.hold){const tail=document.createElement('i');tail.className='hold-tail';node.append(tail);}$('#upcoming-notes').append(node);queueNodes.set(note.index,node);}
    const technique=techniqueFor(note.index,note.index===upcoming[0]?.index?armedTechnique:null);if(node.dataset.currentMove!==technique){node.dataset.currentMove=technique;node.querySelector('img').src=TECHNIQUES[technique].icon;}
    const delay=note.time-clock,y=anchor+delay/ahead*(height-anchor);
    node.style.transform='translate3d(-50%,calc('+y+'px - 50%),0)';node.style.opacity=delay<-.06?Math.max(0,1+(delay+.06)*10):Math.min(1,(ahead-delay)*4);node.classList.toggle('arriving',Math.abs(delay)<.12);if(note.hold)node.lastChild.style.height=note.hold/ahead*(height-anchor)+'px';
  }
  // The held note stays pinned on the target while its tail shrinks.
  if(holding&&queueNodes.has(holding.index)){const node=queueNodes.get(holding.index);visible.add(holding.index);node.style.transform='translate3d(-50%,calc('+anchor+'px - 50%),0)';node.style.opacity=1;node.lastChild.style.height=Math.max(0,holding.end-clock)/ahead*(height-anchor)+'px';}
  for(const [index,node]of queueNodes)if(!visible.has(index)){node.remove();queueNodes.delete(index);}
  const button=$('#strike-button'),ring=button.querySelector('.target-ring'),event=rhythm.playable(clock,lastExpired,resolved);
  const currentTechnique=techniqueFor(event?.index??0,armedTechnique);if(button.dataset.currentMove!==currentTechnique){button.dataset.currentMove=currentTechnique;button.querySelector('img').src=TECHNIQUES[currentTechnique].icon;}
  const delay=event ? event.time-clock : Infinity;
  const perfect=event && Math.abs(delay)<=rhythm.windows(event,state.upgrades.focus).perfect;
  button.classList.toggle('target-active',delay<=.55);button.classList.toggle('holding',Boolean(holding));
  button.classList.toggle('target-due',Boolean(perfect));
  $('#mobile-strike').classList.toggle('target-due',Boolean(perfect));
  ring.style.opacity=delay<=.55 ? .85 : 0;
  if(event){
    ring.style.transform='scale('+(1+Math.max(0,Math.min(.55,delay))*.85)+')';
    button.dataset.event=event.index;
    button.dataset.time=event.time;
  }
  else{delete button.dataset.event;delete button.dataset.time;}
  $$('#beat-meter i').forEach((dot,index)=>dot.classList.toggle('lit',Boolean(lastBeatPulse&&lastBeatPulse.index%8===index&&clock-lastBeatPulse.songTime>=0&&clock-lastBeatPulse.songTime<.14)));
}
function frame(now){
  const elapsed=Math.max(0,(now-lastFrame)/1000),delta=Math.min(.3,elapsed);lastFrame=now;
  if(!document.hidden){
    const boost=flow.active&&audio.playing,passive=autoPower(state)*(boost?3:1);
    earnPassive(state,elapsed,boost);
    if(passive>0){dealDamage(passive*delta);if(!autoEnabled&&now-autoFlashAt>1300){scene.strikeBag(now,.25);scene.animate('hero','auto',now);autoFlashAt=now;}}
    const time=audio.audibleTime(now),clock=time-settings.latency/1000;
    if(autoEnabled&&audio.playing&&!sessionMenuOpen&&!$$('dialog[open]').length){const event=autoStriker.take(rhythm,clock);if(event)void act(now,event);}
    if(audio.playing)tickHold(clock,now);
    if(audio.playing&&!sessionMenuOpen&&!$$('dialog[open]').length&&settings.rhythmMode==='tempo'){
      let expired;
      while((expired=rhythm.event(lastExpired+1))&&clock>expired.time+rhythm.windows(expired,state.upgrades.focus).good){
        if(!resolved.has(expired.index)){song.missed++;judgeFlash('miss');if(combo>0){breakCombo();$('#timing-text').textContent='REPRENDS LE FLOW';}}
        resolved.delete(expired.index-4);lastExpired++;
      }
    }
    drawNotes(time);
    if(audio.playing && time<0)$('#timing-text').textContent='PRÊT · '+Math.max(1,Math.ceil(-time/(60/audio.bpm)));
    editor.tick(now);coach.tick();
    const nearest=rhythm.nearest(clock),distance=settings.rhythmMode==='tempo'&&nearest?Math.abs(nearest.time-clock):1;
    const disciples=state.upgrades.echo+state.upgrades.adept+state.upgrades.master;
    const next=rhythm.next('punch',clock),preparation=!sessionMenuOpen&&audio.playing&&settings.rhythmMode==='tempo'&&next?Math.max(0,1-(next.time-clock)/.16):0;
    scene.render(now,{combo,upcomingMove:next?learnedMove(techniqueFor(next.index),combo+1,state.highestStage,next.index):'punch',arenaVisible:!sessionMenuOpen,lit:state.dojoLit,playing:audio.playing,beatPhase:distance,preparation,dance:danceEnabled&&audio.playing&&!sessionMenuOpen,musicalBeat:beatPosition(audio.conductor?.beats,time,audio.bpm,audio.offset),flow:boost,tier:dojoTier(state),disciples,boss:rival(state.stage).boss});
    if(now-lastPaint>=100){updateUI();lastPaint=now;}
  }
  requestAnimationFrame(frame);
}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){state.savedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}hiddenAt=Date.now();audio.pause();}
  else{lastFrame=performance.now();if(hiddenAt){const result=offlineReward(state);showWelcome(result);hiddenAt=0;save();}updateUI();}
});
window.addEventListener('pagehide',()=>{if(!document.hidden){state.savedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}});
setInterval(save,5000);award();setTrackUI();updateUI();syncTransport();requestAnimationFrame(frame);
$$('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{showTrophy();if(pendingWelcome&&!$$('dialog[open]').length){const result=pendingWelcome;pendingWelcome=null;showWelcome(result);}}));
showWelcome(welcome);
if(!storageAvailable)setTimeout(()=>toast('Sauvegarde locale indisponible. Exporte ta progression dans les réglages.'),500);
