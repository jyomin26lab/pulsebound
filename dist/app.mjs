import { judgePlayable } from './input-timing.mjs';
import { DeviceCalibration } from './device-calibration.mjs';
import { SAVE_KEY, freshState, restoreState, enemyHealth, enemyReward, attackPower, upgradeCost, buyUpgrade, damageEnemy, hitDamage, addCoins, ACHIEVEMENTS, VENUES, MAX_VENUE, venueOf, students, comfort, fullyEquipped, buyItem, expandCost, canExpand, expand, sessionPayout, canJump, dimensionJump, canTransmit, rival, dojoTier, currentGoal, claimAchievements, prestige, prestigeGain, legacyMultiplier, songGrade, recordGrade, dailyChallenge, challengeMet, completeChallenge, dailyStreak, BOONS, boon, boonChoices, applyBoon, finisherReady, PERKS, perk, perkCost, buyPerk, sealsAvailable, recruitPlan, recruit, autoUnlocked, GRADE_TAKINGS } from './core.mjs';
import { FlowMeter } from './flow.mjs';
import { MusicLibrary } from './music-library.mjs';
import { freestyleInterval, IMPACT_STYLES } from './audio-sfx.mjs';
import { Soundtrack, TRACKS } from './audio.mjs';
import { DojoScene, MOVES } from './scene.mjs';
import { RhythmMap, demoMap } from './rhythm.mjs';
import { createSongChart, songSettings, ANALYSIS_VERSION } from './song-chart.mjs';
import { analyzeSong } from './analyze-song.mjs';
import { SongEditor } from './song-editor.mjs';
import { decodeMusicFile, decodeAudioBlob } from './audio-import.mjs';
import { AutoStriker, TECHNIQUES, STYLE_MOVES, FORMS, learnedMove, techniqueFor, beatPosition } from './combat-controls.mjs';
import {SyncCoach} from './sync-coach.mjs';
import { createDuel } from './duel.mjs';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const coinGain=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
const format=value=>value>=10000?compact.format(value):coinGain.format(Math.floor(value*100+1e-8)/100);
const settingsKey='pulsebound-settings-v1';
let state=freshState(),settings={density:'standard',impactStyle:'leather',volume:65,latency:0,metronome:false,trackId:'neon',rhythmMode:'tempo',duelSeen:false,sfxVolume:80,sfx:true,intense:!matchMedia('(prefers-reduced-motion: reduce)').matches},storageAvailable=true;
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
    if(['tempo','freestyle','duel'].includes(raw.rhythmMode))settings.rhythmMode=raw.rhythmMode;
    if(typeof raw.duelSeen==='boolean')settings.duelSeen=raw.duelSeen;
    if(Number.isFinite(raw.sfxVolume))settings.sfxVolume=Math.max(0,Math.min(100,raw.sfxVolume));
  }
}catch{storageAvailable=false;}
let sessionHits=0,song={coins:0,perfects:0,hits:0,best:0,combo:0,missed:0,auto:false};
function resetSong(){sessionHits=0;song={coins:state.totalCoins,perfects:state.perfects,hits:state.hits,best:state.bestCombo,combo:0,missed:0,auto:false};}
const trophyQueue=[];let trophyTimer;
try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{storageAvailable=false;}
const library=new MusicLibrary();
let sessionMenuOpen=true,libraryLoaded=false,trackLoading=false,importing=false,loadedId=null,selectionSerial=0,advanceBusy=false,removedTrack=null,lastFreeHit=NaN;
let combo=0,perfectRun=0,lastBreakAt=0,holding=null,lastInput=-Infinity,toastTimeout,momentTimeout,lastActionSongTime=-1;
const flow=new FlowMeter();
let transportBusy=false,importedTitle='',lastPaint=0,lastFrame=performance.now();
let importController=null;
let autoEnabled=false,armedTechnique=null,danceEnabled=true,energy=.35,lastEnergyAt=performance.now();
const autoStriker=new AutoStriker();
let taps=[],lastExpired=-1;
let beatDisplayBound=false,lastBeatPulse=null;
const resolved=new Set();
const queueNodes=new Map();
const audio=new Soundtrack(handleTransport);
audio.impactStyle=settings.impactStyle;audio.select(settings.trackId);audio.setVolume(settings.volume/100);audio.metronome=settings.metronome;audio.sfx=settings.sfx;audio.setSfxVolume(settings.sfxVolume/100);
const scene=new DojoScene($('#fight-canvas'));scene.intense=settings.intense;document.body.classList.toggle('calm-fx',!settings.intense);
const fxLayer=document.body.appendChild(Object.assign(document.createElement('div'),{className:'fx-layer'}));fxLayer.setAttribute('aria-hidden','true');
let duel=null;// built on the first fight
let rhythm=demoMap(audio.trackId,audio.bpm,audio.offset,settings.rhythmMode);
function rebuildRhythm(){
  const track=library.current;
  if(track){const chart=createSongChart(track,{density:settings.density});rhythm=chart.rhythm;audio.setTempo(chart.config.bpm,chart.config.offset);audio.setBeatMode('detected');audio.setBeatMap({beats:chart.beats},chart.config.offset);}
  else{audio.setBeatMode('tempo');rhythm=demoMap('silent',audio.bpm,audio.offset,'tempo');}
  const free=settings.rhythmMode==='freestyle';$('#mobile-strike span').textContent=free?'Tape à ton rythme':'Quand la note rejoint le cercle';$('#rhythm-mode-label').textContent=free?'FREESTYLE':'RYTHME · '+({relaxed:'DÉTENTE',standard:'STANDARD',intense:'INTENSE'}[settings.density]);
  $$('[data-rhythm-mode]').forEach(button=>{const on=button.dataset.rhythmMode===settings.rhythmMode;button.setAttribute('aria-pressed',String(on));if(on)$('#mode-line').textContent=button.querySelector('small').textContent;});
  document.body.dataset.mode=settings.rhythmMode;const pose='./sprites/menu-'+(free?'dance':'nova')+'.webp';if($('#hero-nova').getAttribute('src')!==pose)$('#hero-nova').src=pose;
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
function transportLabel(){return autoEnabled?(audio.playing?'FRAPPE AUTO · SYNCHRO':'FRAPPE AUTO EN PAUSE'):settings.rhythmMode==='freestyle'?'FRAPPE LIBRE':audio.playing?'SUIS LA PULSATION':'À TON RYTHME';}
function syncTransport(){
  document.body.classList.toggle('playing',audio.playing);
  const button=$('#play-button');button.classList.toggle('playing',audio.playing);
  button.setAttribute('aria-label',audio.playing?'Mettre la musique en pause':'Lancer la musique');
  button.querySelector('use').setAttribute('href',audio.playing?'#i-pause':'#i-play');
  const pause=$('#pause-button');pause.setAttribute('aria-label',audio.playing?'Mettre en pause':'Reprendre la musique');pause.querySelector('use').setAttribute('href',audio.playing?'#i-pause':'#i-play');
  $('#timing-text').textContent=transportLabel();
  if(!audio.playing)resetCombo();
  updateUI();
}
async function play(){
  if(transportBusy||audio.playing&&!sessionMenuOpen||!libraryLoaded||importing||trackLoading)return;
  if(sessionMenuOpen&&settings.rhythmMode==='duel')return openDuel();
  transportBusy=true;
  const fromMenu=sessionMenuOpen;
  if(fromMenu)audio.pause();
  $('#session-error').hidden=true;
  try{
    await audio.init();
    await ensureTrack();
    if(fromMenu){await audio.seek(0,false);resetSong();resolved.clear();lastActionSongTime=-1;flow.reset();}
    if(audio.position===0)resetSong();
    await audio.play({countIn:audio.position===0 && library.current?4:0});
    sessionMenuOpen=false;
    if(!beatDisplayBound){
      audio.conductor.on('beat',event=>{
        lastBeatPulse=event;
        if(sessionMenuOpen||$$('dialog[open]').length)return;
        if(flow.beat(event)){state.flows++;showMoment('HUIT MESURES DE PUISSANCE','FLOW', 'FANS ×2 · DÉGÂTS ×2,5','flow');scene.celebrate('flow');audio.cue('flow');award();}
      });
      audio.conductor.on('resync',event=>flow.resync(event.skipped));
      beatDisplayBound=true;
    }
    resetCombo();syncTransport();
    if(fromMenu){showTab('play');requestAnimationFrame(()=>$('#battle-card').scrollIntoView({block:'start',behavior:'auto'}));}
  }catch(error){const message=error.message||'Lecture audio indisponible. Essaie de relancer le morceau.';$('#session-error').textContent=message;$('#session-error').hidden=false;toast(message);}finally{transportBusy=false;updateUI();}
}
// The duel covers the menu with a dialog, so the session under it stays still.
async function openDuel(){
  transportBusy=true;audio.pause();$('#session-error').hidden=true;updateUI();
  try{
    if(!library.current)throw Error('Choisis un morceau pour le duel.');
    await audio.init();await ensureTrack();
    duel??=createDuel({root:$('#duel'),audio,settings,venueArt:()=>venueOf(state).art,reward:payDuel});
    await duel.open(library.current,!settings.duelSeen);settings.duelSeen=true;save();
  }catch(error){$('#session-error').textContent=error.message;$('#session-error').hidden=false;}
  finally{transportBusy=false;updateUI();}
}
$('#duel').addEventListener('close',()=>$('#start-button').focus({preventScroll:true}));
// Every note hit pays like a strike; a victory is worth one session, multiplied by its grade.
function payDuel({victory,grade,hits}){
  const coins=hits*.01+(victory?sessionPayout(state,grade):0);addCoins(state,coins);award();save();updateUI();
  return '+'+coinGain.format(coins)+(coins<2?' pièce':' pièces');
}
$('#play-button').addEventListener('click',()=>sessionMenuOpen?previewTrack():audio.playing?audio.pause():play());
$('#preview-track').addEventListener('click',previewTrack);
$('#pause-button').addEventListener('click',()=>audio.playing?audio.pause():play());
// Entry menu: My music opens the playlist; a custom song can always hand back to the dojo's own track.
$('#open-music').addEventListener('click',()=>{$('.session-more').open=true;$('#audio-upload').focus({preventScroll:true});$('.playlist-toolbar').scrollIntoView({block:'start'});});
$('#dojo-track').addEventListener('click',async()=>{const id=library.order.find(id=>library.all.get(id)?.builtin)||'neon';if(!library.order.includes(id))await library.addOriginal(id);await chooseTrack(id);});
async function previewTrack(){
  if(transportBusy||trackLoading||importing||!libraryLoaded)return;transportBusy=true;updateUI();
  try{if(audio.playing)audio.pause();else{await audio.init();await ensureTrack();await audio.play();}}catch(error){toast(error.message);}finally{transportBusy=false;syncTransport();}
}
$('#restart-session').addEventListener('click',async()=>{audio.pause();resetSong();flow.reset();resolved.clear();lastActionSongTime=-1;await audio.seek(0,false);await play();});
$('#start-button').addEventListener('click',play);
async function browse(direction){const listening=audio.playing;await advanceTrack(direction,false);if(listening)await previewTrack();}
$('#menu-prev').addEventListener('click',()=>browse(-1));$('#menu-next').addEventListener('click',()=>browse(1));
function setTrackUI(){
  const track=library.current;
  document.body.style.setProperty('--bpm',track?.bpm||112);
  $('#track-title').textContent=track?.title||'Session sans musique';$('#dojo-track').hidden=!track||track.builtin;
  $('#preview-title').textContent=track?.title||'Session sans musique';$('#preview-meta').textContent=track?Math.floor(track.duration/60)+':'+String(Math.floor(track.duration%60)).padStart(2,'0')+' · '+Math.round(track.bpm)+' BPM · '+(track.builtin?'Original':'Ton morceau'):'Ajoute ton son ou joue sans musique.';
  $('#track-subtitle').textContent=track?(library.order.indexOf(track.id)+1)+' / '+library.items.length+' · '+(track.builtin?'ORIGINAL DU DOJO':'TA PLAYLIST'):'AJOUTE UN SON OU JOUE LIBREMENT';
  const bpm=loadedId===(track?.id||'silent')?audio.bpm:track?.bpm||120;
  $('#bpm-display').textContent=number.format(bpm);$('#bpm-input').value=bpm;$('#menu-bpm').textContent=number.format(bpm)+' BPM';$('#offset-input').value=Math.round((track?.offset||0)*1000);
}
function handleTransport(event){
  syncTransport();
  if($('#duel').open){duel.transport(event);return;}
  if(event?.reason!=='ended'||sessionMenuOpen||$$('dialog[open]').length)return;
  showSongEnd();
}
// End-of-song card: the moment players usually leave, so make "one more" the easiest action.
function showSongEnd(){
  const hits=state.hits-song.hits,perfects=state.perfects-song.perfects,record=song.best>0&&song.combo>song.best;// the first combo ever is not a record
  // Only a fully manual run in rhythm mode is graded; Freestyle and Auto have no misses to count.
  const grade=settings.rhythmMode==='tempo'&&!song.auto?songGrade({perfects,goods:hits-perfects,notes:hits+song.missed}):null;
  $('#song-end .eyebrow').textContent=state.dojoLit?'MORCEAU TERMINÉ':'PREMIER MORCEAU TERMINÉ';state.dojoLit=true;
  const best=recordGrade(state,library.current?.id,grade);if(best){save();renderPlaylist();}
  // The dojo pays at the end of each session: students' fees and fans' tips, multiplied by the grade.
  const takings=sessionPayout(state,grade);addCoins(state,takings);save();
  $('#end-takings').textContent='RECETTE DE LA SÉANCE · +'+format(takings)+' PIÈCES'+(grade&&grade!=='C'?' · NOTE '+grade+' ×'+format(GRADE_TAKINGS[grade]):'');
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
  $('#song-end').showModal();
  if(record||best||dailyReward){scene.celebrate('flow');audio.cue('milestone');}
}
// The result comes first: the boons open once the card closes, and the next song waits for the picks.
function leaveSongEnd(next){$('#song-end').close();offerBoons();const boons=$('#boon-dialog');if(boons.open)boons.addEventListener('close',next,{once:true});else next();}
$('#song-end').addEventListener('close',()=>offerBoons());
$('#end-next').addEventListener('click',()=>leaveSongEnd(()=>void advanceTrack(1,true)));
$('#end-replay').addEventListener('click',()=>leaveSongEnd(()=>$('#restart-session').click()));
// Each reinforced bag earns a boon pick. During a song the picks wait (saved in state.pendingBoons) until
// the end-of-song card has been read, so a song is never interrupted; without music they open right away.
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
// "Mon dojo": equipment of the current venue (rebuilt when the venue changes), then expand or jump dimension.
let renderedVenue=0;
// What a purchase is worth, in the words of the dojo: students and takings per session (they grow with the fans).
function itemGain(item){state.items.push(item.id);const after=sessionPayout(state);state.items.pop();return after-sessionPayout(state);}
function itemBenefit(item){
  const gain=itemGain(item),who=item.students?'+'+item.students+' élève'+(item.students>1?'s':''):'';
  return [who,gain>=.01?'+'+format(gain)+' pièce'+(gain>=2?'s':'')+' / séance':item.comfort?'+'+Math.round(item.comfort*100)+' % de recette':''].filter(Boolean).join(' · ');
}
// One touch, one action: a purchase needs a calm finger (no strike in the last 450 ms), a button ready for 400 ms
// when it has just appeared, and 500 ms since the previous purchase, so a fast double tap never buys twice.
let buyLockUntil=0,lastHumanStrike=-Infinity,readySince=0,goalReady=false;
function purchaseAllowed(fresh=false){const now=performance.now();if(now<buyLockUntil||now-lastHumanStrike<450||fresh&&now-readySince<400)return false;buyLockUntil=now+500;return true;}
// First students: the panel closes, the wallet drops, the takings jump and the newcomers walk in on the same frame.
function welcomeStudents(count,before,from){
  const after=sessionPayout(state);if(after>before)flashIncome(before,after);
  spend(from);setShop(false);showMoment(count>1?'LES ÉLÈVES ARRIVENT':'TON PREMIER ÉLÈVE','+'+count+' ÉLÈVE'+(count>1?'S':''),count>1?'Ils paient leur cours à chaque fin de morceau.':'Il paie son cours à chaque fin de morceau.','flow');audio.cue('milestone');
  pulse($('.wallet'),'spent');scene.celebrate('purchase');award();updateUI();save();
}
function recruitGain(){const copy=structuredClone(state);copy.coins=Infinity;recruit(copy);return sessionPayout(copy)-sessionPayout(state);}
// The goal card (menu, desktop) and the arena slot (phone) show the same thing: coins missing for the first students,
// then a recruit button with its real price and gain; after that, the next piece of equipment.
function renderGoal(){
  const plan=recruitPlan(state);let label,detail,progress,ready=false;
  if(plan){
    const missing=Math.max(.1,Math.ceil((plan.cost-state.coins)*10-1e-6)/10),gain='+'+format(recruitGain())+' / séance';ready=state.coins>=plan.cost;
    label=ready?'Recruter · +'+plan.students+' élève'+(plan.students>1?'s':''):plan.students>1?'Premiers élèves':'Premier élève';
    detail=ready?format(plan.cost)+' pièces · '+gain:'Encore '+format(missing)+' pièce'+(missing>=2?'s':'')+' · '+gain;progress=state.coins/plan.cost;
  }else{
    const goal=currentGoal(state),goalItem=venueOf(state).items.find(item=>item.name===goal.label),why=goalItem?itemBenefit(goalItem).replace(/ pièces? \//,' /'):autoUnlocked(state)?'':'+ Frappe auto';
    label=goal.label;detail=format(Math.min(goal.current,goal.target))+' / '+format(goal.target)+' pièces'+(why?' · '+why:'');progress=goal.current/goal.target;
  }
  if(ready&&!goalReady)readySince=performance.now();goalReady=ready;
  $('#goal-label').textContent=label;$('#goal-detail').textContent=detail;$('#slot-label').textContent=label;$('#slot-detail').textContent=detail;
  for(const bar of [$('#goal-progress'),$('#slot-progress')])bar.style.width=Math.min(100,progress*100)+'%';
  for(const card of [$('#goal-card'),$('#recruit-slot')])card.classList.toggle('ready',ready);
  // The shop offers the same recruit at the top of the dojo tab while the school has no students yet.
  $('#shop-recruit').hidden=!plan;$('#shop-recruit').disabled=!ready;$('#shop-recruit-label').textContent=label;$('#shop-recruit-detail').textContent=detail;
}
// The takings line shows the jump (0 → 1,2) for a moment after a purchase raises it.
let incomeFlash=null;
function flashIncome(from,to){incomeFlash={from,to,until:performance.now()+2600};for(const element of [$('#income-rate'),$('#battle-card .coin-counter small')])pulse(element,'income-up');}
function renderVenue(){
  const v=venueOf(state);
  if(renderedVenue!==state.venue){
    renderedVenue=state.venue;$('#hero-art').style.backgroundImage='url("./'+v.art+'")';
    $('#venue-items').replaceChildren(...v.items.map(item=>{
      const button=document.createElement('button');button.type='button';button.className='perk';button.dataset.item=item.id;
      const name=document.createElement('strong');name.textContent=item.name;
      const text=document.createElement('span');text.className='perk-gain';
      const price=document.createElement('em'),icon=new Image(40,40);icon.src='./items/'+item.id+'.webp';icon.alt='';icon.onerror=()=>icon.remove();button.classList.add('has-icon');button.append(icon,name,text,price);return button;
    }));
  }
  $('#venue-level').textContent=state.venue;$('#venue-name').textContent=v.name;
  $('#venue-stats').textContent=students(state)+' élève'+(students(state)>1?'s':'')+' · '+format(Math.floor(state.fans))+' fans'+(state.dimension?' · dimension '+(state.dimension+1):'');
  $$('#venue-items .perk').forEach(button=>{
    const item=v.items.find(entry=>entry.id===button.dataset.item),owned=state.items.includes(item.id);
    button.disabled=owned||state.coins<item.cost;button.classList.toggle('owned',owned);
    button.querySelector('em').textContent=owned?'✓':format(item.cost)+' pièce'+(item.cost>=2?'s':'');
    button.querySelector('span').textContent=owned?'Installé':itemBenefit(item);
  });
  const next=VENUES[state.venue],expandButton=$('#venue-expand');
  expandButton.disabled=!(canExpand(state)||canJump(state));
  expandButton.textContent=canJump(state)?'Saut de dimension ↗':!next?'Dernier dojo':'Agrandir → '+next.name+' · '+format(expandCost(state));
}
$('#venue-items').addEventListener('click',event=>{
  const id=event.target.closest('[data-item]')?.dataset.item,item=venueOf(state).items.find(entry=>entry.id===id),before=sessionPayout(state),hadStudents=students(state)>0;
  if(!item||state.items.includes(id)||state.coins<item.cost||!purchaseAllowed()||!buyItem(state,id))return;
  // The very first students get their moment: the panel closes so they can be seen walking in.
  const button=event.target.closest('[data-item]');
  if(item.students&&!hadStudents&&state.venue<=2){welcomeStudents(item.students,before,button);return;}
  const after=sessionPayout(state);if(after>before)flashIncome(before,after);spend(button);
  toast('Installé · '+item.name+(item.students?' · +'+item.students+' élève'+(item.students>1?'s':''):''));audio.cue('purchase');
  scene.celebrate('purchase');award();updateUI();save();
});
$('#venue-expand').addEventListener('click',()=>{
  if(!(canExpand(state)||canJump(state))||!purchaseAllowed())return;
  if(canJump(state)){
    if(!confirm('Saut de dimension : tu repars de la Rue avec des recettes ×2 pour toujours. Pièces, dojo, fans, techniques et dons repartent à zéro ; sceaux, boutique de sceaux, trophées et notes sont gardés. Sauter ?'))return;
    dimensionJump(state);flow.reset();resolved.clear();lastActionSongTime=-1;resetCombo();
    showMoment('SAUT DE DIMENSION','UNE NOUVELLE RUE.','La technologie alien t’ouvre un autre monde. Recettes ×'+2**state.dimension+'.','flow');
  }else{
    const unlocking=!autoUnlocked(state);if(!expand(state))return;
    setShop(false);// on phones the panel would hide the new room and its message
    showMoment('NOUVEAU DOJO',venueOf(state).name.toUpperCase(),unlocking?'Frappe auto débloquée. Équipe la salle pour attirer des élèves.':'Il est vide : équipe-le pour attirer des élèves.','flow');
  }
  spend($('#venue-expand'));scene.celebrate('flow');audio.cue('milestone');award();updateUI();save();
});
// Seal shop buttons are built once; updateUI only refreshes their text and state.
$('#perk-list').append(...Object.entries(PERKS).map(([id,p])=>{
  const button=document.createElement('button');button.type='button';button.className='perk';button.dataset.perk=id;
  const name=document.createElement('strong');name.textContent=p.label;const text=document.createElement('span');text.textContent=p.text;
  const price=document.createElement('em');price.dataset.perkPrice='';button.append(name,text,price);return button;
}));
$('#perk-list').addEventListener('click',event=>{
  const id=event.target.closest('[data-perk]')?.dataset.perk;if(!id||!buyPerk(state,id))return;
  spend(event.target.closest('[data-perk]'));save();updateUI();toast('Acquis pour toujours · '+PERKS[id].label);scene.celebrate('purchase');audio.cue('milestone');
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
function showSessionMenu(){showTab('play');audio.pause();sessionMenuOpen=true;updateUI();scrollTo(0,0);}
function updateUI(){
  document.body.classList.toggle('in-session',!sessionMenuOpen);$('#session-menu').hidden=!sessionMenuOpen;$('#battle-card').hidden=sessionMenuOpen;
  $('#start-button').disabled=!libraryLoaded||trackLoading||importing||transportBusy;$('#start-button').firstChild.textContent=transportBusy?'ACTIVATION… ':trackLoading?'CHARGEMENT… ':settings.rhythmMode==='duel'?'COMBATTRE ':'JOUER ';
  $('#play-button').disabled=!libraryLoaded||trackLoading||importing||transportBusy;$('#open-song-editor').disabled=!libraryLoaded||trackLoading||importing||!library.current;
  $('#cancel-audio-import').hidden=!importing;
  $('#preview-track').disabled=$('#play-button').disabled;const heard=sessionMenuOpen&&audio.playing,preview=$('#preview-track');if(preview.getAttribute('aria-pressed')!==String(heard)){preview.setAttribute('aria-pressed',String(heard));preview.setAttribute('aria-label',heard?'Mettre en pause':'Écouter le morceau');preview.querySelector('use').setAttribute('href',heard?'#i-pause':'#i-play');}
  document.body.classList.toggle('auto-striking',autoEnabled);
  for(const button of $$('#playlist-list .playlist-action.listen'))button.textContent=sessionMenuOpen&&audio.playing&&button.closest('[data-track-id]').dataset.trackId===library.selected?'Ⅱ':'▶';
  $('#auto-strike').hidden=!autoUnlocked(state);$('#auto-strike').setAttribute('aria-pressed',String(autoEnabled));$('#auto-strike b').textContent=autoEnabled?(audio.playing?'ON':'PAUSE'):'OFF';
  $$('[data-impact-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.impactStyle===settings.impactStyle)));
  $('#technique-status').textContent='SON · '+IMPACT_STYLES[settings.impactStyle].label;
  $('#previous-track').disabled=!libraryLoaded||trackLoading||importing||!library.next(-1);$('#next-track').disabled=!libraryLoaded||trackLoading||importing||!library.next(1);
  $('#menu-prev').disabled=$('#previous-track').disabled;$('#menu-next').disabled=$('#next-track').disabled;
  const boost=flow.active&&audio.playing,opponent=rival(state.stage),income=sessionPayout(state);
  $('#coins').textContent=format(state.coins);$('#shop-coins').textContent=format(state.coins);$('#session-coins').textContent=format(state.coins);
  const jump=incomeFlash&&performance.now()<incomeFlash.until?format(incomeFlash.from)+' → '+format(incomeFlash.to):null;
  $('#income-rate').textContent='par séance : '+(jump||format(income));$('#session-income').textContent=jump||format(income);
  for(const unit of $$('.coin-unit'))unit.textContent=state.coins<2?'pièce':'pièces';$('#auto-stat').textContent=format(income);$('#school-dps').textContent=format(income);
  $('#power-stat').textContent=format(attackPower(state)*(boost?2.5:1));
  $('#combo-count').innerHTML=combo+'<span>×</span>';
  $('#combo-run-label').textContent='ENCHAÎNEMENT · '+combo%8+' / 8';$$('#combo-chain i').forEach((dot,i)=>dot.classList.toggle('lit',i<combo%8));
  $('#stage-count').textContent=String(state.stage).padStart(2,'0');$('#enemy-name').textContent=opponent.name;
  $('#hero-mastery').textContent='FORCE · NIV. '+state.upgrades.power;
  const health=state.hp/enemyHealth(state.stage)*100;
  $('#enemy-health').style.width=health+'%';$('.health-track').setAttribute('aria-valuenow',Math.round(health));
  $('.battle-card').classList.toggle('is-boss',opponent.boss);$('#rival-tag').textContent=opponent.hint;
  const count=students(state);
  $('#school-count').textContent=count;$('#school-count-label').textContent=count>1?'élèves':'élève';
  $('#school-title').textContent=venueOf(state).name.toUpperCase();$('#hero-venue').textContent='Niveau '+state.venue+' · '+venueOf(state).name+(count?' · '+count+' élève'+(count>1?'s':''):'');renderVenue();
  renderGoal();
  document.body.classList.toggle('flowing',boost);document.body.classList.toggle('flow-ready',flow.armed);
  const charge=flow.active?flow.remaining/32*100:flow.charge;
  $('#flow-fill').style.width=charge+'%';$('.flow-track').setAttribute('aria-valuenow',Math.round(charge));
  $('#flow-status').textContent=flow.active?(audio.playing?'FANS ×2 · DÉGÂTS ×2,5 · '+flow.remaining+' TEMPS':'FLOW EN PAUSE · '+flow.remaining+' TEMPS'):flow.armed?'PRÊT · AU PROCHAIN TEMPS':flow.charge>0?Math.floor(flow.charge)+(settings.rhythmMode==='freestyle'?' % · Continue à frapper':' % · Continue en rythme'):settings.rhythmMode==='freestyle'?'Frappe à ta façon':'Enchaîne pour booster tes pièces';
  let affordable=false;
  $$('.upgrade').forEach(button=>{
    const key=button.dataset.upgrade,cost=upgradeCost(state,key),level=state.upgrades[key];
    button.disabled=state.coins<cost||!Number.isFinite(cost);button.classList.toggle('affordable',!button.disabled);
    if(!button.disabled)affordable=true;
    button.querySelector('small b').textContent=level;button.querySelector('.upgrade-effect').textContent=Number.isFinite(cost)?upgradeEffect(key):'Maximum';button.querySelector('em span').textContent=Number.isFinite(cost)?format(cost):'MAX';
    button.setAttribute('aria-label',button.querySelector('strong').firstChild.textContent.trim()+', '+level+', '+(Number.isFinite(cost)?format(cost)+' pièces':'maximum'));
  });
  $('.dojo-button').dataset.affordable=affordable||venueOf(state).items.some(item=>!state.items.includes(item.id)&&state.coins>=item.cost)||canExpand(state)||canJump(state);$('#battle-card .shop-toggle').classList.toggle('affordable',$('.dojo-button').dataset.affordable==='true');
  renderPerks();$('#legacy-seals').textContent=format(state.seals);$('#legacy-bonus').textContent='+'+format(Math.round((legacyMultiplier(state)-1)*100))+' %';
  const gain=prestigeGain(state);$('#legacy-gain').textContent='+'+gain+' sceau'+(gain>1?'x':'');$('#prepare-prestige').disabled=gain<1;
  $('#legacy-requirement').textContent=state.venue<2?'Achète d’abord une salle.':!canTransmit(state)?'Trop célèbre pour transmettre : vise le saut de dimension.':gain>0?'Prêt à transmettre.':format(state.runCoins)+' / 12 000';
  if($('#stats-dialog').open)updateStats();
}
const upgradeEffect=key=>key==='power'?'+'+format(4*legacyMultiplier(state)*(1+.15*boon(state,'power')))+' dégâts':key==='focus'?'Parfait +6 ms':'+2,5 % critique';
function updateStats(){
  const stats=[[state.highestStage,'Meilleure série'],[state.kills,'Sacs brisés'],[state.bestCombo,'Meilleur combo'],[state.hits?Math.round(state.perfects/state.hits*100)+' %':'—','Frappes parfaites'],[state.flows,'Flows déclenchés'],[state.totalCoins,'Éclats gagnés']];
  $('#stats-grid').innerHTML=stats.map(([value,label])=>'<div class="stat-cell"><strong>'+(typeof value==='number'?format(value):value)+'</strong><span>'+label+'</span></div>').join('');
  $('#achievement-count').textContent=state.achievements.length+' / '+ACHIEVEMENTS.length;
  $('#achievements').innerHTML=ACHIEVEMENTS.map(a=>{const earned=state.achievements.includes(a.id),secret=a.hidden&&!earned;return '<div class="achievement '+(earned?'earned':'')+'"><i>'+(earned?'✓':'◇')+'</i><span><strong>'+(secret?'???':a.name)+'</strong><small>'+(secret?'Trophée caché':a.text)+'</small></span><em>'+(secret?'?':'+'+coinGain.format(a.reward))+' ◈</em></div>';}).join('');
}
function pulse(element,className){element.classList.remove(className);void element.offsetWidth;element.classList.add(className);}
// Page particles (buttons, purchases, timing marks), off with reduced motion or calm effects; capped so fast taps stay light.
function sparkle(x,y,{color='#fff1c1',count=10,dist=58,coin=false,up=false}={}){
  if(!settings.intense||!scene.motion)return;
  for(let i=0;i<count&&fxLayer.childElementCount<90;i++){
    const p=fxLayer.appendChild(document.createElement('i')),a=up?-Math.PI/2+(Math.random()-.5)*1.8:Math.random()*Math.PI*2,d=dist*(.45+Math.random()*.75),s=coin?7+Math.random()*4:4+Math.random()*5,dx=Math.cos(a)*d,dy=Math.sin(a)*d;
    p.style.cssText=`left:${x}px;top:${y}px;width:${s}px;height:${s}px`+(coin?'':`;background:${color};color:${color}`);if(coin)p.className='coin';
    const move=(mx,my,extra='')=>`translate(calc(-50% + ${mx}px),calc(-50% + ${my}px))${extra}`;
    p.animate(coin?[{transform:move(0,0),easing:'cubic-bezier(.2,.8,.4,1)'},{transform:move(dx*.6,dy,' rotateY(360deg)'),offset:.45,easing:'cubic-bezier(.6,0,.8,.4)'},{transform:move(dx,dy+d*1.4,' rotateY(720deg)'),opacity:0}]
      :[{transform:move(0,0,' scale(1)'),opacity:1},{transform:move(dx*.8,dy*.8,' scale(.85)'),opacity:1,offset:.4},{transform:move(dx,dy+14,' scale(.3)'),opacity:0}],
      {duration:coin?700+Math.random()*300:480+Math.random()*260,easing:coin?'linear':'cubic-bezier(.2,.6,.35,1)'}).onfinish=()=>p.remove();
  }
}
function burstFrom(element,options){const r=element?.getBoundingClientRect();if(r?.width)sparkle(r.left+r.width/2,r.top+r.height/2,options);}
// A purchase: coins jump out of the button and the wallet glints as it pays.
function spend(button){burstFrom(button,{coin:true,count:10,dist:70,up:true});burstFrom($('.wallet'),{color:'#ffcc3c',count:8,dist:40});}
document.addEventListener('pointerdown',event=>{const b=event.target.closest?.('button,label.add-music,label.retry-import');if(b&&!b.disabled)sparkle(event.clientX,event.clientY,{color:getComputedStyle(b).getPropertyValue('--spark').trim()||undefined});},{capture:true,passive:true});
// Colour + ✓/✗ on the target so hits and misses read without relying on colour alone.
function judgeFlash(grade){
  for(const element of [$('#strike-button'),$('#mobile-strike')]){element.dataset.judge=grade;pulse(element,'judged');}
  if(grade!=='miss')burstFrom($$('.target-ring').find(ring=>ring.offsetParent),grade==='perfect'?{color:'#2fb7b2',count:12,dist:56}:{color:'#fff1c1',count:5,dist:36});
}
function showMoment(kicker,title,detail,kind=''){
  clearTimeout(momentTimeout);const card=$('#moment-card');card.className='moment-card '+kind;
  $('#moment-kicker').textContent=kicker;$('#moment-title').textContent=title;$('#moment-detail').textContent=detail;void card.offsetWidth;card.classList.add('show');burstFrom(card,{color:kind==='boss'?'#ff7a3c':'#ffe2a0',count:14,dist:110});
  momentTimeout=setTimeout(()=>card.classList.remove('show'),2900);
}
function award(){
  const earned=claimAchievements(state);if(!earned.length)return;
  trophyQueue.push(...earned);showTrophy();pulse($('.wallet'),'rewarding');burstFrom($('.wallet'),{coin:true,count:12,dist:60,up:true});save();
}
function showTrophy(){
  if(!trophyQueue.length||!$('#trophy-popup').hidden||$$('dialog[open]').length)return;
  const trophy=trophyQueue.shift();$('#trophy-name').textContent=trophy.name;$('#trophy-detail').textContent=trophy.text;$('#trophy-reward').textContent='+'+coinGain.format(trophy.reward)+' pièces';$('#trophy-popup').hidden=false;burstFrom($('#trophy-popup'),{color:'#ffcc3c',count:16,dist:90});scene.celebrate('trophy');audio.cue('milestone');trophyTimer=setTimeout(closeTrophy,5500);
}
function closeTrophy(){clearTimeout(trophyTimer);$('#trophy-popup').hidden=true;showTrophy();}
$('#close-trophy').addEventListener('click',closeTrophy);
function dealDamage(amount,finisher=false){
  const previousStage=state.highestStage;
  const before=state.bosses,wasBoss=state.stage%5===0,bagReward=enemyReward(state.stage)*(1+.25*boon(state,'bag')),coinsBefore=state.totalCoins,count=damageEnemy(state,amount,flow.active&&audio.playing?2:1);if(!count)return 0;
  if(finisher){addCoins(state,bagReward);audio.cue('flow');buzz([30,40,60,40]);}
  // The school can break several bags per second late in a run: the loud part (sound, big number, buzz) plays at most 4 times a second.
  const breakTime=performance.now(),loud=breakTime-lastBreakAt>250;if(loud)lastBreakAt=breakTime;
  pulse($('.wallet'),'rewarding');scene.celebrate('victory',breakTime,loud?'+'+format(state.totalCoins-coinsBefore)+' ◈':'');
  if(loud){audio.bagBreak();buzz([20,30,40]);burstFrom($('.wallet'),{coin:true,count:6,dist:50,up:true});scene.ejectBag(breakTime,{reinforced:wasBoss,finisher});}
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
    scene.hit({move:holding.ticks%2?'cross':'punch',now,combo,interval:.2,light:true});audio.holdTick();
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
$('#auto-strike').addEventListener('click',()=>{if(performance.now()-lastHumanStrike<300)return;setAuto(!autoEnabled);if(autoEnabled&&!audio.playing)void play();});
$$('[data-impact-style]').forEach(button=>button.addEventListener('click',async()=>{
  settings.impactStyle=button.dataset.impactStyle;audio.impactStyle=settings.impactStyle;save();updateUI();
  try{await audio.previewImpact();if(!settings.sfx||settings.sfxVolume===0)toast('Son choisi · les impacts sont coupés dans les réglages.');}catch(error){toast(error.message);}
}));
async function act(inputTimestamp=performance.now(),automaticEvent=null){
  if(sessionMenuOpen||shopOpen||$$('dialog[open]').length)return;
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
      if(judgment.early){resolved.add(judgment.index);song.missed++;feedback('TROP TÔT','NOTE PERDUE · ATTENDS LE CERCLE','miss');breakCombo();}
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
    const grace=!free&&!automated&&judgment.grade==='perfect'&&finisherReady(state),count=dealDamage(damage,grace),graceKill=grace&&count>0;flow.hit(judgment.grade,interval);
    const technique=techniqueFor(judgment.event?.index??state.hits-1,armedTechnique);armedTechnique=null;
    const move=learnedMove(technique,combo,state.highestStage,judgment.event?.index??state.hits-1);
    // Contact is drawn on this very frame; the note's anticipation already played before it.
    scene.hit({move,now,grade:judgment.grade,critical:hit.critical,combo,interval,damage:'+'+coinGain.format(coinsEarned)+' ◈'});
    feedback(graceKill?'COUP DE GRÂCE !':hit.critical?'CRITIQUE':automated?'AUTO':free?'IMPACT':judgment.grade==='perfect'?'PARFAIT'+(perfectRun>1?' ×'+perfectRun:''):'BIEN',graceKill?'PRIME DU SAC ×2 · SÉRIE '+state.stage:count?'SAC BRISÉ · SÉRIE '+state.stage:(FORMS[move]?.label||STYLE_MOVES[move]||TECHNIQUES[technique].label).toUpperCase()+' · +'+coinGain.format(coinsEarned)+' PIÈCE'+(coinsEarned<2?'':'S'),hit.critical?'critical':judgment.grade);
    audio.hit(judgment.grade,hit.critical,combo,{weight:MOVES[move]?.weight,energy});if(!automated)buzz(hit.critical?30:10);
    if(judgment.event?.hold&&!free&&audio.playing){holding={index:judgment.event.index,end:judgment.event.time+judgment.event.hold,nextTick:judgment.event.time+.18,auto:automated,source:null,ticks:0};feedback('MAINTIENS','RAFALE · GARDE LA TOUCHE ENFONCÉE','perfect');}pulse($('.combo-badge'),'bump');pulse($('#strike-button'),'impact');award();
    if(!free&&!automated&&[8,16,32,64,128].includes(combo)){showMoment('ENCHAÎNEMENT SANS RUPTURE','COMBO ×'+combo,combo>=32?'LE DOJO SUIT TON FLOW.':'CHAQUE COUP TROUVE SA PLACE.','flow');audio.cue('milestone');scene.celebrate('flow');}
  }
  $('#timing-text').textContent=automated?'FRAPPE AUTO · SYNCHRO':free?'FRAPPE LIBRE':(judgment.grade==='perfect'?'PARFAIT':judgment.error<0?'UN PEU TÔT':'UN PEU TARD')+' · '+Math.round(Math.abs(judgment.error))+' MS';
  updateUI();
}
for(const selector of ['#strike-button','#bag-hitbox','#mobile-strike']){
  $(selector).addEventListener('pointerdown',event=>{if(event.button!==0||event.pointerType==='touch'&&!audio.playing)return;event.preventDefault();lastHumanStrike=performance.now();act(event.timeStamp);if(holding&&!holding.source)holding.source='pointer';});
  $(selector).addEventListener('contextmenu',event=>event.preventDefault());// a long press must hold the note, not open a menu
  $(selector).addEventListener('click',event=>{if(event.detail===0||!audio.playing)act(event.timeStamp);});
}
document.addEventListener('keydown',event=>{
  if(sessionMenuOpen)return;
  if(!['KeyD','KeyF','Space'].includes(event.code)||event.repeat||event.ctrlKey||event.altKey||event.metaKey||$$('dialog[open]').length||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  if(event.code==='Space'&&event.target.closest('button')&&!['strike-button','bag-hitbox','mobile-strike','play-button','start-button'].includes(event.target.closest('button').id))return;
  event.preventDefault();lastHumanStrike=performance.now();act(event.timeStamp);if(holding&&!holding.source)holding.source=event.code;
});
function selectShopTab(key,focus=false){
  $$('[data-shop-tab]').forEach(button=>{const selected=button.dataset.shopTab===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('#'+button.dataset.shopTab+'-panel').hidden=!selected;if(selected&&focus)button.focus();});
}
$$('[data-shop-tab]').forEach((button,index)=>{
  button.addEventListener('click',()=>selectShopTab(button.dataset.shopTab));
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[data-shop-tab]'),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectShopTab(tabs[next].dataset.shopTab,true);});
});
// On phones the page has two tabs (play / dojo) driven by the bottom bar; wide screens ignore data-tab.
function showTab(tab){document.body.dataset.tab=tab;$$('.mobile-nav [data-tab]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.tab===tab)));}
$$('.mobile-nav [data-tab]').forEach(button=>button.addEventListener('click',()=>{showTab(button.dataset.tab);scrollTo(0,0);}));
// The playlist and song settings start folded on phones so the play tab fits on one screen.
if(matchMedia('(max-width:700px)').matches)$('.session-more').open=false;
const phone=matchMedia('(max-width:700px)');
function openDojo(tab='school'){selectShopTab(tab);if(phone.matches){setShop(true);return;}$('#dojo-sidebar').scrollIntoView({behavior:scene.motion?'smooth':'auto',block:'nearest'});}
// Phones: the shop is a panel over the dojo. The music keeps playing; notes that pass while it is open are neither judged
// nor missed, so closing it hands the next note straight back to the player.
let shopOpen=false;
function setShop(open){
  if(shopOpen===open)return;shopOpen=open;document.body.classList.toggle('shop-open',open);$('#shop-backdrop').hidden=!open;
  $$('[data-shop-open]').forEach(button=>button.setAttribute('aria-expanded',String(open)));
  if(open){$('#dojo-sidebar').scrollTop=0;$('.sheet-close').focus({preventScroll:true});return;}
  const clock=audio.audibleTime()-settings.latency/1000;lastExpired=Math.max(lastExpired,rhythm.lowerBound(clock-.05)-1);autoStriker.reset(rhythm,clock);
  if(!sessionMenuOpen)$(phone.matches?'#mobile-strike':'#strike-button').focus({preventScroll:true});
}
$$('[data-shop-open]').forEach(button=>button.addEventListener('click',()=>openDojo()));
$$('[data-shop-close]').forEach(element=>element.addEventListener('click',()=>setShop(false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&shopOpen){event.preventDefault();setShop(false);}});
phone.addEventListener('change',()=>{if(!phone.matches)setShop(false);});
$$('[data-dojo-scroll]').forEach(button=>button.addEventListener('click',()=>openDojo()));
function goalAction(event){
  const plan=recruitPlan(state);
  if(plan&&state.coins>=plan.cost){if(!purchaseAllowed(true))return;const before=sessionPayout(state);if(recruit(state))welcomeStudents(plan.students,before,event?.currentTarget);return;}
  const goal=currentGoal(state);if(goal.action==='combat'){if(!audio.playing)play();else toast('Le sac renforcé arrive à la prochaine épreuve.');}else openDojo(goal.action==='legacy'?'legacy':'school');
}
$('#goal-card').addEventListener('click',goalAction);$('#recruit-slot').addEventListener('click',goalAction);$('#shop-recruit').addEventListener('click',goalAction);
$$('.upgrade').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.upgrade;
  if(state.coins<upgradeCost(state,key)||!purchaseAllowed()||!buyUpgrade(state,key))return;
  pulse(button,'bought');spend(button);scene.celebrate('purchase');audio.cue('purchase');
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
$$('dialog.modal').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));
const durationText=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function renderPlaylist(){
  const list=$('#playlist-list');list.replaceChildren();$('#playlist-count').textContent=library.items.length;$('#playlist-empty').hidden=library.items.length>0;
  $('#playlist-repeat').checked=library.repeat;
  $('.library-note').textContent=library.persistent?'':'Stockage limité : les nouveaux sons peuvent ne rester que pour cette session.';
  library.items.forEach((track,index)=>{
    const row=document.createElement('li');row.dataset.trackId=track.id;row.draggable=true;row.className='playlist-row'+(track.id===library.selected?' selected':'');
    const drag=document.createElement('span');drag.className='drag-grip';drag.textContent='⠿';drag.setAttribute('aria-hidden','true');row.append(drag);
    const choose=document.createElement('button');choose.className='playlist-choose';choose.dataset.action='select';choose.setAttribute('aria-pressed',String(track.id===library.selected));choose.title=track.title;
    const title=document.createElement('strong');title.textContent=track.title;if(state.grades[track.id]){const badge=document.createElement('span');badge.className='grade-badge';badge.dataset.grade=state.grades[track.id];badge.textContent=state.grades[track.id];badge.title='Meilleure note';title.prepend(badge);}const meta=document.createElement('small');meta.textContent=durationText(track.duration)+' · '+number.format(track.bpm)+' BPM'+(track.builtin?' · DOJO':track.chart?.source==='grid'?' · calé à la main':' · rythme auto');choose.append(title,meta);row.append(choose);
    for(const [action,text,label,disabled]of [['listen','▶','Écouter',false],['play','Jouer','Jouer',false],['up','↑','Monter',index===0],['down','↓','Descendre',index===library.items.length-1],['remove','×','Retirer',false]]){const button=document.createElement('button');button.className='playlist-action '+action;button.dataset.action=action;button.textContent=text;button.disabled=disabled;button.setAttribute('aria-label',label+' '+track.title);row.append(button);}
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
  if(action==='listen'||action==='play'){if(library.selected!==id)await chooseTrack(id);await (action==='play'?play():previewTrack());return;}
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
  importController=new AbortController();const signal=importController.signal;$('#retry-import').hidden=true;
  try{
    audio.prepare();
    for(const [index,file]of files.entries()){
      status.textContent='Lecture de « '+file.name+' » · '+(index+1)+' / '+files.length;
      try{
        const buffer=await decodeMusicFile(audio.ctx,file,{signal});
        let analysis=null;
        try{analysis=await analyzeSong(buffer,p=>status.textContent='Préparation de « '+file.name+' » · analyse du rythme '+p+' %',{signal});}catch(error){if(error.name==='AbortError')throw error;errors.push(file.name+' : '+error.message);}
        if(signal.aborted)throw new DOMException('Import annulé.','AbortError');
        const record={id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,'').slice(0,180),blob:file,bpm:analysis?.tempo?.bpm||120,offset:analysis?.beatMap?.offset??analysis?.tempo?.offset??0,duration:buffer.duration,builtin:false,analysis,analysisAttempted:!analysis};
        saved=(await library.add(record))&&saved;added.push(record.id);renderPlaylist();
      }catch(error){if(error.name==='AbortError')throw error;errors.push(file.name+' : '+(error.message||'Lecture impossible.'));}
    }
    if(added.length&&!audio.playing){await library.select(added[0]);loadedId=null;audio.select('silent');}
    status.textContent=added.length+' son'+(added.length>1?'s':'')+' ajouté'+(added.length>1?'s':'')+'. '+(saved?'Playlist conservée sur cet appareil.':'Stockage indisponible ou plein : les nouveaux sons restent pour cette session.')+(errors.length?' '+errors.join(' '):'');
    if(errors.length||!saved)status.classList.add('error');$('#retry-import').hidden=!errors.length;
  }catch(error){status.textContent=error.name==='AbortError'?'Import annulé. '+added.length+' son(s) déjà ajoutés à la playlist.':error.message||'Import impossible. Essaie un MP3, M4A ou WAV depuis Fichiers.';status.classList.add('error');$('#retry-import').hidden=error.name==='AbortError';}
  finally{importing=false;importController=null;$('#audio-upload').value='';renderPlaylist();updateUI();}
}
$('#audio-upload').addEventListener('change',event=>importAudio(Array.from(event.target.files)));
$('#audio-upload').addEventListener('cancel',()=>{if(!importing)$('#upload-status').textContent='Aucun fichier choisi : ta playlist n’a pas changé.';});
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
$('#intense-effects').addEventListener('change',event=>{settings.intense=event.target.checked;scene.intense=settings.intense;document.body.classList.toggle('calm-fx',!settings.intense);save();});
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
    state = restoreState(data.state);if(!autoUnlocked(state))autoEnabled=false;resetSong();
    resetCombo();
    updateUI();
    save();
    $('#save-message').textContent = 'Ton dojo a été restauré.';
    toast('Sauvegarde importée. Ton dojo t’attend.');
  } catch (error) { $('#save-message').textContent = `Import impossible : ${error.message}`; }
  event.target.value = '';
});


function drawNotes(time){
  const runway=$('#note-runway'),beat=lastBeatPulse&&time-settings.latency/1000-lastBeatPulse.songTime;
  if(!audio.playing||settings.rhythmMode==='freestyle'){clearNotes();runway.classList.toggle('beat',audio.playing&&beat>=0&&beat<.14);return;}
  // Phones lay the lane across the screen under the stage: notes travel right to left towards the fixed mark.
  const horizontal=runway.clientWidth>runway.clientHeight*1.6,height=horizontal?runway.clientWidth:runway.clientHeight;runway.classList.toggle('horizontal',horizontal);
  const target=$('#strike-button');
  const anchor=horizontal?target.parentElement.offsetLeft+target.offsetLeft+target.offsetWidth/2:target.parentElement.offsetTop+target.offsetTop+target.offsetHeight/2;
  const ahead=Math.max(1.6,Math.min(2.8,(height-anchor)/170));
  const clock=time-settings.latency/1000,upcoming=rhythm.upcoming(clock,ahead,.2).filter(event=>event.index>lastExpired&&!resolved.has(event.index)),visible=new Set();
  const finisherIndex=settings.rhythmMode==='tempo'&&finisherReady(state)?upcoming[0]?.index:-1;
  for(const note of upcoming){
    visible.add(note.index);let node=queueNodes.get(note.index);
    if(!node){node=document.createElement('span');node.className='queue-note'+(note.beat?'':' offbeat');const img=document.createElement('img');img.src='./icons/power.svg';img.alt='';const label=document.createElement('small');label.textContent=note.index%8+1;node.append(img,label);if(note.hold){const tail=document.createElement('i');tail.className='hold-tail';node.append(tail);}$('#upcoming-notes').append(node);queueNodes.set(note.index,node);}
    const technique=techniqueFor(note.index,note.index===upcoming[0]?.index?armedTechnique:null);if(node.dataset.currentMove!==technique){node.dataset.currentMove=technique;node.querySelector('img').src=TECHNIQUES[technique].icon;}
    const delay=note.time-clock,y=anchor+delay/ahead*(height-anchor);
    node.style.transform=horizontal?'translate3d(calc('+y+'px - 50%),-50%,0)':'translate3d(-50%,calc('+y+'px - 50%),0)';node.style.opacity=delay<-.06?Math.max(0,1+(delay+.06)*10):Math.min(1,(ahead-delay)*4);node.classList.toggle('arriving',Math.abs(delay)<.12);node.classList.toggle('finisher',note.index===finisherIndex);if(note.hold)node.lastChild.style[horizontal?'width':'height']=note.hold/ahead*(height-anchor)+'px';
  }
  // The held note stays pinned on the target while its tail shrinks.
  if(holding&&queueNodes.has(holding.index)){const node=queueNodes.get(holding.index);visible.add(holding.index);node.style.transform=horizontal?'translate3d(calc('+anchor+'px - 50%),-50%,0)':'translate3d(-50%,calc('+anchor+'px - 50%),0)';node.style.opacity=1;node.lastChild.style[horizontal?'width':'height']=Math.max(0,holding.end-clock)/ahead*(height-anchor)+'px';}
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
// The next note still to be played (resolved and expired ones skipped): Nova prepares for it so contact lands on it.
function comingNote(clock){
  for(let index=Math.max(lastExpired+1,rhythm.lowerBound(clock-.15)),tries=0;tries<6;index++,tries++){
    const event=rhythm.event(index);if(!event)return null;
    if(!resolved.has(index)&&event.time>clock-.12)return event;
  }
  return null;
}
// Local energy of the song, 0 to 1: loudness from the stored waveform when the track has one, plus the density and strength of nearby notes.
function songEnergy(clock){
  let sum=0;for(const note of rhythm.upcoming(clock,1.5,1.5))sum+=note.strength??.6;
  const notes=Math.min(1,sum/5.4),track=library.current,wave=track?.analysis?.waveform;
  if(!wave?.length||!(track.duration>0))return notes;
  const centre=Math.floor(clock/track.duration*wave.length),radius=Math.max(1,Math.round(wave.length/track.duration*.75));let loud=0,count=0;
  for(let i=Math.max(0,centre-radius);i<Math.min(wave.length,centre+radius);i++){loud+=wave[i];count++;}
  return .4*notes+.6*Math.min(1,count?loud/count/.7:0);
}
function frame(now){
  lastFrame=now;
  if(!document.hidden&&!$('#duel').open){
    const boost=flow.active&&audio.playing,time=audio.audibleTime(now),clock=time-settings.latency/1000;
    if(autoEnabled&&audio.playing&&!sessionMenuOpen&&!shopOpen&&!$$('dialog[open]').length){const event=autoStriker.take(rhythm,clock);if(event)void act(now,event);}
    if(audio.playing)tickHold(clock,now);
    if(audio.playing&&!sessionMenuOpen&&!shopOpen&&!$$('dialog[open]').length&&settings.rhythmMode==='tempo'){
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
    const disciples=students(state);
    const next=!sessionMenuOpen&&audio.playing&&(settings.rhythmMode==='tempo'||autoEnabled)?comingNote(clock):null;
    const preparation=next?(next.time>=clock?Math.max(0,1-(next.time-clock)/.19):Math.max(0,1+(next.time-clock)/.12)):0;
    energy+=((audio.playing?songEnergy(clock):.35)-energy)*(1-Math.exp(-(now-lastEnergyAt)/500));lastEnergyAt=now;
    scene.render(now,{energy,venueArt:venueOf(state).art,venue:state.venue,combo,upcomingMove:next?learnedMove(techniqueFor(next.index,armedTechnique),combo+1,state.highestStage,next.index):'punch',arenaVisible:!sessionMenuOpen,lit:state.dojoLit,playing:audio.playing,beatPhase:distance,preparation,dance:danceEnabled&&audio.playing&&!sessionMenuOpen,musicalBeat:beatPosition(audio.conductor?.beats,time,audio.bpm,audio.offset),flow:boost,tier:dojoTier(state),disciples,boss:rival(state.stage).boss});
    if(now-lastPaint>=100){updateUI();lastPaint=now;}
  }
  requestAnimationFrame(frame);
}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){state.savedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}hiddenAt=Date.now();audio.pause();}
  else{lastFrame=performance.now();hiddenAt=0;updateUI();}
});
window.addEventListener('pagehide',()=>{if(!document.hidden){state.savedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}});
const fitHeight=()=>document.documentElement.style.setProperty('--app-h',innerHeight+'px');addEventListener('resize',fitHeight);fitHeight();
setInterval(save,5000);award();setTrackUI();updateUI();syncTransport();requestAnimationFrame(frame);
$$('dialog').forEach(dialog=>dialog.addEventListener('close',()=>showTrophy()));
if(!storageAvailable)setTimeout(()=>toast('Sauvegarde locale indisponible. Exporte ta progression dans les réglages.'),500);
