import { RhythmMap } from './rhythm.mjs';
import { createSongChart } from './song-chart.mjs';
import { judgePlayable } from './input-timing.mjs';
import { beatPosition, techniqueFor, comboMove } from './combat-controls.mjs';
import { songGrade } from './core.mjs';
import { MOVES } from './scene.mjs';
import { DuelScene } from './duel-scene.mjs';
import { duelEvents, phaseAt, pulse, songFilter, freshDuel, settle, onPoints, won, NOVA_HP, RIVAL_HP, FLOW_MAX, SURPRISE_WARN } from './duel-core.mjs';

const RIVAL_MOVES=['punch','cross','kick','hook','uppercut','roundhouse'];
/** The duel in a full-screen dialog over the menu. The game lends its sound, its settings and the current venue; reward() pays the fight and returns the coins. */
export function createDuel({root,audio,settings,venueArt,reward}){
const $=s=>root.querySelector(s);
let scene=null,duel=freshDuel(),started=false,resolved=new Set(),shown=new Set(),expired=-1,lastPress=-Infinity,strikes=0,alerted=-1;
let track=null,beats=[],rhythm=new RhythmMap();
const clockAt=stamp=>audio.audibleTime(stamp)-settings.latency/1000;
const revealed=(event,clock)=>!event.surprise||event.time-clock<=SURPRISE_WARN;
/** The sudden blow on its way: announced, not decided yet. */
const suddenAt=clock=>rhythm.upcoming(clock,SURPRISE_WARN,.15).find(event=>event.surprise&&!resolved.has(event.index)&&clock<=event.time+rhythm.windows(event).good);
const rivalMove=event=>event.heavy?'axeKick':scene.within(RIVAL_MOVES[event.index%RIVAL_MOVES.length]);
const novaMove=()=>scene.within(comboMove(techniqueFor(strikes),duel.combo));

function bar(id,value){const el=$(id);el.firstElementChild.style.transform='scaleX('+value+')';el.setAttribute('aria-valuenow',Math.round(value*100));el.classList.toggle('low',value<=.3);}
function refresh(){
  bar('#nova-bar',duel.nova/NOVA_HP);bar('#rival-bar',duel.rival/RIVAL_HP);bar('#flow-bar',duel.flow/FLOW_MAX);
  $('#nova-hp').textContent=Math.ceil(duel.nova);$('#rival-hp').textContent=Math.ceil(duel.rival/RIVAL_HP*100);$('#combo').textContent=duel.combo;
  const full=duel.flow>=FLOW_MAX;$('.flow').classList.toggle('full',full);$('#flow-label').textContent=full?'Flow plein':'Flow';
}
function interval(event){const next=rhythm.event(event.index+1);return next?Math.min(.6,next.time-event.time):.5;}
function showBlow(event,now){if(shown.has(event.index))return;shown.add(event.index);scene.rivalBlow(rivalMove(event),now,interval(event),event.heavy);}
/** One note is decided: rules first, then the same instant on screen and in the ears. */
function decide(event,grade,now,why=''){
  resolved.add(event.index);const out=settle(duel,event,grade);if(!out)return;
  const perfect=grade==='perfect',hit=grade!=='miss',full=duel.flow>=FLOW_MAX,novaSide={x:scene.layout.heroX,y:Math.max(108,scene.layout.bottom-scene.layout.unit*5.5),large:false};
  if(event.type==='parry'){
    showBlow(event,now);
    if(hit){
      scene.guard(now,perfect,out.broke?2.4:event.surprise?1.5:perfect?.8:0);const t=audio.ctx.currentTime;
      if(settings.sfx){audio.tone(t,perfect?1760:1180,.14,'triangle',.12,audio.effectsGain);audio.crack(t,perfect?.4:.25,'bandpass',5200,.04);}
      if(out.broke){scene.say('COUP BRISÉ',"#8ff0ea",now);audio.cue('flow');}
      else if(event.surprise)scene.say(perfect?'RIPOSTE':'RÉFLEXE','#8ff0ea',now);
      else scene.say(perfect?'CONTRE':'PARÉ',perfect?'#8ff0ea':'#fff2de',now,novaSide);
    }else{scene.wound(now,event.heavy);audio.hit('good',event.heavy,0,{weight:1.3});scene.say(why||'TOUCHÉ',"#ff9a82",now,novaSide);}
  }else if(hit){
    const move=novaMove();strikes++;
    scene.strikeRival({move,now,grade,critical:perfect&&full,combo:duel.combo,interval:interval(event),damage:perfect?'PARFAIT':''});
    audio.hit(grade,perfect&&full,duel.combo,{weight:MOVES[move].weight});
  }else{scene.comboBreak(now);scene.say(why||'RATÉ',"#ff9a82",now,novaSide);}
  refresh();
  if(duel.over){scene.knockOut(duel.over==='ko-nova'?scene:scene.rival,now);audio.cue(duel.over==='ko-nova'?'boss':'milestone');const ended=duel;setTimeout(()=>{if(duel===ended)finish();},1500);}
}
function press(type,stamp){
  if(!audio.playing||duel.over)return;
  const now=performance.now(),time=clockAt(stamp);
  if(time<0||now-lastPress<60)return;lastPress=now;
  // A sudden blow tests reflexes: from its alert, the first parry stops it, early or on the beat. An announced parry still waiting goes first.
  const sudden=type==='parry'&&suddenAt(time),first=sudden&&rhythm.upcoming(time,SURPRISE_WARN,.15).find(event=>event.type==='parry'&&event.index>expired&&!resolved.has(event.index));
  if(sudden&&first?.index===sudden.index){decide(sudden,Math.abs(time-sudden.time)<=rhythm.windows(sudden).perfect?'perfect':'good',now);return;}
  const j=judgePlayable(rhythm,time,0,expired,resolved);if(!j)return;
  // A press just before the window spoils the note, so hammering the pads never replaces listening.
  if(j.grade==='miss'){if(j.error<0&&j.error>-rhythm.windows(j.event).good*1600)decide(j.event,'miss',now,'TROP TÔT');return;}
  if(j.event.type!==type){decide(j.event,'miss',now,'MAUVAISE MAIN');return;}
  decide(j.event,j.grade,now);
}
for(const [id,type]of [['#pad-parry','parry'],['#pad-strike','strike']]){
  const pad=$(id),release=()=>pad.classList.remove('down');
  pad.addEventListener('pointerdown',event=>{if(event.button)return;event.preventDefault();pad.classList.add('down');press(type,event.timeStamp);});
  for(const name of ['pointerup','pointercancel','pointerleave'])pad.addEventListener(name,release);
  pad.addEventListener('click',event=>{if(!event.detail)press(type,event.timeStamp);});// screen readers and switch access
}
const KEYS={KeyF:'parry',ArrowLeft:'parry',KeyJ:'strike',ArrowRight:'strike',Space:'strike'};
document.addEventListener('keydown',event=>{
  if(!root.open||!$('#panel').hidden||event.ctrlKey||event.metaKey||event.altKey)return;
  if(!KEYS[event.code])return;
  event.preventDefault();if(!event.repeat)press(KEYS[event.code],event.timeStamp);
});

function setPanel(open){$('#panel').hidden=!open;for(const element of root.children)if(element.id!=='panel')element.inert=open;if(open)$('#start').focus();}
function showPanel(kicker,title,button,body){
  $('#panel-kicker').textContent=kicker+' · '+track.title;$('#panel-title').textContent=title;$('#start').textContent=button;$('#panel-body').replaceChildren(...[body].flat());setPanel(true);
}
const rules=[...$('#panel-body').children],make=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
function showPause(){showPanel('Duel en pause','Souffle.','REPRENDRE',make('p','La musique repart deux secondes plus tôt, le temps de te remettre en garde.'));}
function finish(){
  if(!started)return;started=false;onPoints(duel);audio.pause();
  const victory=won(duel),grade=songGrade(duel),coins=reward({victory,grade,hits:duel.perfects+duel.goods});
  const list=document.createElement('dl'),rate=duel.notes?Math.round((duel.perfects+duel.goods)/duel.notes*100):0;
  for(const [name,value]of [['Gagné',coins],['Note',grade||'—'],['Parfaits',duel.perfects+' / '+duel.notes],['Réussite',rate+' %'],['Meilleur combo',duel.best],['Vie de Nova',Math.ceil(duel.nova)],['Vie de l’Ombre',Math.ceil(duel.rival/RIVAL_HP*100)]])list.append(make('dt',name),make('dd',value));
  showPanel(duel.over.startsWith('ko')?'K.-O.':'Décision aux points',victory?'Victoire':'L’Ombre gagne','REJOUER',list);
}
async function start(){
  const button=$('#start');button.disabled=true;
  try{
    if(!started){prepareFight();scene.reset();refresh();await audio.seek(0,false);}
    else{audio.position=Math.max(0,audio.position-2);alerted=-1;}// a run-up after a pause: decided notes stay decided, pending alerts ring again
    await audio.play({countIn:4});started=true;setPanel(false);
  }catch(error){if($('#panel').hidden)showPanel('Duel','L’Ombre de Nova','COMMENCER',rules);$('#panel-kicker').textContent=error.message;}
  finally{button.disabled=false;}
}
/** A new list of notes for every fight, on the beats the dojo already knows for this song (its analysis, or the player's own calibration). */
function prepareFight(){
  const chart=createSongChart(track),shift=chart.automatic?chart.config.offset-(track.analysis.beatMap?.offset||0):0;
  beats=pulse(chart.beats);rhythm=new RhythmMap(duelEvents(beats,track.builtin||!track.analysis?{}:{accept:songFilter(track.analysis,chart.duration,shift)}));
  if(rhythm.events.length<16)throw Error('Pas assez de rythme dans ce morceau pour un duel. Choisis-en un autre.');
  duel=freshDuel(rhythm.events.length);resolved=new Set();shown=new Set();expired=-1;strikes=0;alerted=-1;
}
$('#start').addEventListener('click',start);
$('#duel-pause').addEventListener('click',()=>audio.pause());
$('#leave').addEventListener('click',()=>root.close());
root.addEventListener('cancel',event=>{if($('#panel').hidden){event.preventDefault();audio.pause();}});// Escape pauses first, then leaves
root.addEventListener('close',()=>{started=false;void audio.seek(0,false);});

const lane=$('#lane'),ink=lane.getContext('2d');
function drawLane(clock){
  const w=lane.clientWidth,h=lane.clientHeight,ratio=Math.min(devicePixelRatio||1,2);
  if(lane.width!==Math.round(w*ratio)||lane.height!==Math.round(h*ratio)){lane.width=Math.round(w*ratio);lane.height=Math.round(h*ratio);}
  ink.setTransform(ratio,0,0,ratio,0,0);ink.clearRect(0,0,w,h);
  const x0=Math.max(52,w*.12),y=h/2,ahead=1.6,speed=(w-x0)/ahead,size=h*.28;
  ink.lineWidth=2;ink.strokeStyle='#2fb7b255';ink.beginPath();ink.moveTo(x0,y);ink.lineTo(w,y);ink.stroke();
  const beat=beatPosition(beats,Math.max(0,clock))%1,throb=audio.playing&&scene.motion?Math.max(0,1-beat*4):0;
  ink.lineWidth=4;ink.strokeStyle='#2fb7b2';ink.beginPath();ink.arc(x0,y,size+6+throb*4,0,Math.PI*2);ink.stroke();
  if(started&&!duel.over)for(const event of rhythm.upcoming(clock,ahead,.2).reverse()){
    const known=revealed(event,clock),sudden=event.surprise&&known;
    if(resolved.has(event.index)||event.surprise==='dart'&&!known)continue;
    // A dart crosses the whole lane during its alert; a flip is a strike that turns red with a short pop.
    const left=event.time-clock,x=x0+left*(event.surprise==='dart'&&left>0?(w-x0)/SURPRISE_WARN:speed),pop=sudden&&scene.motion?Math.max(0,1-(SURPRISE_WARN-left)/.16):0,s=size*(event.heavy?1.4:sudden?1.15+pop*.6:1);ink.lineWidth=sudden?4:3;ink.beginPath();
    // Shape and symbol as well as colour: a shield to parry, a disc to strike.
    if(event.type==='parry'&&known){ink.moveTo(x-s*.85,y-s*.8);ink.lineTo(x,y-s);ink.lineTo(x+s*.85,y-s*.8);ink.lineTo(x+s*.8,y+s*.1);ink.quadraticCurveTo(x+s*.6,y+s*.8,x,y+s*1.05);ink.quadraticCurveTo(x-s*.6,y+s*.8,x-s*.8,y+s*.1);ink.closePath();ink.fillStyle=event.heavy?'#8f1526':sudden?'#ff2f1f':'#e0503a';ink.strokeStyle=event.heavy?'#ffb199':'#fff';}
    else{ink.arc(x,y,s,0,Math.PI*2);ink.fillStyle='#fff8e0';ink.strokeStyle='#2fb7b2';}
    ink.fill();ink.stroke();
    if(sudden){ink.fillStyle='#fff';ink.beginPath();ink.moveTo(x+s*.2,y-s*.7);ink.lineTo(x-s*.4,y+s*.15);ink.lineTo(x-s*.02,y+s*.15);ink.lineTo(x-s*.2,y+s*.75);ink.lineTo(x+s*.42,y-s*.15);ink.lineTo(x+s*.04,y-s*.15);ink.closePath();ink.fill();}
    if(event.heavy){ink.fillStyle='#fff';ink.font='900 '+Math.round(s)+'px sans-serif';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('!',x,y);}
  }
}
function frame(now){
  if(!root.open)return;requestAnimationFrame(frame);
  const clock=clockAt(now),beat=beatPosition(beats,Math.max(0,clock)),playing=audio.playing&&clock>=0;
  if(playing&&!duel.over){
    let event;while((event=rhythm.event(expired+1))&&event.time<=clock&&!duel.over){
      if(!resolved.has(event.index)){
        if(event.type==='parry')showBlow(event,now);
        if(clock<=event.time+rhythm.windows(event).good)break;
        decide(event,'miss',now);
      }
      expired++;
    }
  }
  const sudden=playing&&!duel.over?suddenAt(clock):null;
  if(sudden&&sudden.index>alerted){
    alerted=sudden.index;scene.alert(now);
    if(settings.sfx){const t=audio.ctx.currentTime;audio.tone(t,1320,.09,'square',.13,audio.effectsGain);audio.tone(t+.075,1980,.12,'square',.13,audio.effectsGain);}
    if(settings.intense&&scene.motion)navigator.vibrate?.(35);
  }
  // The next role is announced on the silent beat that ends each phase; a sudden blow takes over at once.
  const phase=phaseAt(beat+1),role=sudden?'parry':phase.type,soon=playing&&!duel.over?rhythm.upcoming(clock,.6,0).filter(event=>!resolved.has(event.index)&&revealed(event,clock)):[];
  const blow=soon.find(event=>event.type==='parry'),strike=soon.find(event=>event.type==='strike'),nearing=event=>event?1-(event.time-clock)/.6:0;
  const data=root.dataset;if(data.phase!==role)data.phase=role;if(data.alert!==String(Boolean(sudden)))data.alert=Boolean(sudden);
  const label=!started||duel.over?'':clock<0?'Prépare-toi':sudden?'Vite, pare !':phase.type==='strike'?'Frappe !':phase.assault?'Assaut : pare !':'Pare !';
  if($('#phase').textContent!==label)$('#phase').textContent=label;
  scene.rivalMove=blow?{preparation:nearing(blow),upcomingMove:rivalMove(blow),musicalBeat:beat}:{musicalBeat:beat};
  scene.render(now,{playing,lit:true,beatPhase:beat%1,musicalBeat:beat,preparation:strike===soon[0]?nearing(strike):0,upcomingMove:novaMove(),
    flow:duel.flow>=FLOW_MAX,combo:duel.combo,boss:phase.assault&&phase.type==='parry',venueArt:venueArt(),energy:phase.assault?1:.45+.1*phase.level});
  drawLane(clock);
}

return {
  /** Opens on the given song, already loaded in the game's audio: the rules the first time, the fight at once after that. */
  open(song,showRules){
    track=song;started=false;prepareFight();// a song without enough rhythm is refused before the dialog opens
    root.showModal();scene??=new DuelScene($('#duel-stage'));scene.intense=settings.intense;scene.reset();refresh();
    requestAnimationFrame(frame);
    if(showRules)showPanel('Duel','L’Ombre de Nova','COMMENCER',rules);else{setPanel(false);return start();}
  },
  transport({reason}){if(reason==='ended')finish();else if(started&&!duel.over)showPause();},
};
}
