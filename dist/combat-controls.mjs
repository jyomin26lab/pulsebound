export const TECHNIQUES={
  punch:{label:'Jab',icon:'./icons/power.svg'},
  cross:{label:'Direct',icon:'./icons/power.svg'},
  kick:{label:'Coup de pied',icon:'./icons/kick.svg'},
  uppercut:{label:'Uppercut',icon:'./icons/uppercut.svg'}
};
export const STYLE_MOVES = {
  hook: 'Crochet en pivot',
  roundhouse: 'Coup de pied circulaire',
  backfist: 'Revers tournant',
  meiaLua: 'Meia-lua de compasso'
};

export const FORMS = {
  leapPunch: {label:'Direct sauté', stage:12},
  axeKick: {label:'Coup de pied marteau', stage:22},
  cartwheel: {label:'Roue de capoeira', stage:28}
};

export function learnedMove(technique,combo,stage,index){
  const cycle=Math.floor(index/8);
  if(technique==='cross' && stage>=FORMS.leapPunch.stage && index%8===1) return 'leapPunch';
  if(technique==='kick' && index%8===2){
    if(stage>=FORMS.cartwheel.stage && cycle%2===0) return 'cartwheel';
    if(stage>=FORMS.axeKick.stage) return 'axeKick';
  }
  return comboMove(technique,combo);
}
export function comboMove(technique, combo) {
  if (combo < 8) return technique;
  if (technique === 'kick') return combo >= 16 ? 'meiaLua' : 'roundhouse';
  return combo >= 16 ? 'backfist' : 'hook';
}
const sequence=['punch','cross','kick','punch','uppercut','cross','kick','uppercut'];
export function techniqueFor(index,requested=null){return Object.hasOwn(TECHNIQUES,requested)?requested:sequence[((index%sequence.length)+sequence.length)%sequence.length];}

/** The render loop only wakes this cursor; musical timestamps decide every strike. */
export class AutoStriker{
  constructor({maxLate=.09}={}){this.maxLate=maxLate;this.map=null;this.cursor=0;this.lastTime=0;}
  reset(map,time){this.map=map;this.cursor=map.lowerBound(Math.max(0,time));this.lastTime=time;}
  take(map,time){
    if(this.map!==map||time<this.lastTime-.05)this.reset(map,time);
    this.lastTime=time;
    let event=map.event(this.cursor);
    if(event&&time-event.time>this.maxLate){this.cursor=map.lowerBound(time-this.maxLate);event=map.event(this.cursor);}
    if(!event||event.time>time+1e-7)return null;
    this.cursor++;return event;
  }
}

export function beatPosition(beats,time,bpm=120,offset=0){
  if(!beats?.length)return Math.max(0,(time-offset)*bpm/60);
  let lo=0,hi=beats.length;while(lo<hi){const mid=(lo+hi)>>1;if(beats[mid]<=time)lo=mid+1;else hi=mid;}
  if(lo===0)return 0;
  const index=lo-1,interval=beats[index+1]!==undefined?beats[index+1]-beats[index]:index>0?beats[index]-beats[index-1]:60/bpm;
  return index+Math.max(0,(time-beats[index])/Math.max(.05,interval));
}

export function techniquePose(kind,progress){
  if(kind==='kick')return {frame:progress<.13||progress>.73?0:1,x:-.025,y:0,tilt:-.025};
  if(kind==='uppercut')return {frame:progress<.17||progress>.75?2:3,x:0,y:-.018,tilt:.02};
  return null;
}
