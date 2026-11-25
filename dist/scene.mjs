import { HERO_SPRITES } from './sprites/hero-manifest.mjs';
import { combatLayout, spritePlacement, HERO_REACH, GUARD_BACK, GUARD_FRONT } from './scene-layout.mjs';
// Combo levels at 8/16/32/64: each one hits harder and shifts colour (orange, gold, cyan, pink, white).
export const COMBO_COLORS=['#ffc58b','#ffd36b','#7ff0ff','#ff6bd6','#ffffff'];
export function comboTier(combo){return combo>=64?4:combo>=32?3:combo>=16?2:combo>=8?1:0;}
// Visual only, never touches coins or damage: flames rise with the combo, a crowd gathers at 50/100/150/200, a miss sends both away.
export const heatOf=combo=>combo<10?0:Math.min(1,.15+combo/240);
export const fanCount=combo=>combo>=200?40:combo>=150?20:combo>=100?10:combo>=50?5:0;
/**
 * Choreography of each technique, in ms. Contact is drawn on the input frame: `hold` is the hit-stop on contact,
 * `extend` the follow-through, `recover` the way back to guard. `push` kicks the bag (rad/s), `lift` bumps it upward,
 * `weight` colours the impact sound. `prep` is the anticipation pose shown before an announced note, `back` the
 * pose on the way back.
 */
export const MOVES={
  punch:{pose:'jab',hold:[34,50],extend:55,recover:115,push:.85,weight:.75},
  cross:{pose:'cross',hold:[44,64],extend:95,recover:165,push:1.4,weight:1.05},
  uppercut:{pose:'uppercut',prep:'uppercut-ready',hold:[48,70],extend:100,recover:175,push:.55,lift:1,weight:.95},
  kick:{pose:'kick',prep:'kick-ready',back:'kick-ready',hold:[54,78],extend:120,recover:215,push:2.05,weight:1.3},
  hook:{pose:'hook',prep:'uppercut-ready',back:'uppercut-ready',hold:[48,68],extend:100,recover:170,push:1.5,weight:1.1},
  backfist:{pose:'backfist',prep:'uppercut-ready',back:'uppercut-ready',hold:[44,64],extend:95,recover:165,push:1.3,weight:1},
  roundhouse:{pose:'roundhouse',prep:'kick-ready',back:'kick-ready',hold:[56,80],extend:120,recover:220,push:2.2,weight:1.35},
  meiaLua:{pose:'meiaLua',prep:'kick-ready',back:'kick-ready',hold:[58,84],extend:130,recover:230,push:2.35,weight:1.4},
  leapPunch:{pose:'leapPunch-1',prep:'leapPunch-0',back:'leapPunch-2',hold:[54,76],extend:110,recover:210,push:1.6,lift:.4,weight:1.15},
  axeKick:{pose:'axeKick-1',prep:'axeKick-0',back:'axeKick-2',hold:[56,80],extend:120,recover:220,push:1.5,weight:1.3},
  cartwheel:{pose:'cartwheel-1',prep:'cartwheel-0',back:'cartwheel-2',hold:[56,80],extend:120,recover:230,push:2.1,weight:1.3}
};
MOVES.auto=MOVES.punch;
const ease=k=>k*k*(3-2*k);
/**
 * Heavy-bag pendulum (radians, rad/s). A hit is an instant push away from the hero; gravity pulls it back,
 * friction slows it, and it bounces softly off the safe limit so it never leaves the frame or hits Nova.
 */
export function swingStep(bag,dt,limit,back=limit){
  bag.velocity+=(-55*bag.angle-2.4*bag.velocity)*dt;bag.angle+=bag.velocity*dt;
  if(bag.angle>limit||bag.angle<-back){bag.angle=bag.angle>0?limit:-back;bag.velocity*=-.35;}
  return bag;
}
export class DojoScene {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    const artwork = file => {
      const image = new Image();
      image.src = new URL(file, import.meta.url).href;
      return image;
    };
    this.rooms = [artwork('./dojo-quiet.webp'), artwork('./dojo-brasier.webp')];
    this.apprentice = [artwork('./sprites/disciple-ready.webp'), artwork('./sprites/disciple-jab.webp')];
    this.poses=Object.fromEntries(Object.entries(HERO_SPRITES).map(([id, sprite])=>[id, artwork('./sprites/'+sprite.file)]));
    this.motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.intense=true;
    this.initState();this.images={};
    this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);
  }
  initState(){
    this.particles=[];this.floats=[];this.rings=[];this.sparks=[];this.embers=[];this.debt={};this.shakeAt=-1000;this.shakePower=0;this.holdUntil=0;this.zoomAt=-1000;this.zoomPower=0;this.flashAt=-1000;this.breakAt=-1000;
    this.bagStrikes=[];this.swing={angle:0,velocity:0};this.lift={y:0,v:0};this.dent=null;this.swingAt=0;this.heat=0;this.crowd=new Array(40).fill(0);
    this.strike=null;this.ghost=null;this.drawn={id:'idle',dx:0,dy:0};this.energy=.5;this.arrivals=[];this.focus=null;
  }
  // Lazy, cached pictures (disciples/, crowd/); a missing file simply never loads and the old drawing is used.
  art(file){return this.images[file]??=Object.assign(new Image(),{src:new URL('./'+file,import.meta.url).href});}
  resize(){
    const rect=this.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
    this.mobile=matchMedia('(max-width:700px)').matches;
    this.width=rect.width;this.height=rect.height;
    this.layout=combatLayout(this.width,this.height,this.mobile);
    this.canvas.width=Math.max(1,Math.round(rect.width*ratio));this.canvas.height=Math.max(1,Math.round(rect.height*ratio));
    this.ctx.setTransform(ratio,0,0,ratio,0,0);this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';
  }
  drawRoom(image){
    if(!image.naturalWidth || !this.width || !this.height)return;
    const scale=Math.max(this.width/image.naturalWidth,this.height/image.naturalHeight);
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    this.ctx.drawImage(image,(this.width-width)/2,(this.height-height)/2,width,height);
  }
  bagGeometry(){const h=this.height;return {x:this.layout.bagX,anchor:h*.055,top:h*.21,height:h*(this.mobile?.48:.58),width:this.layout.bagWidth};}
  // World x of the bag's Nova-side edge at height y, following its current swing.
  bagEdge(y){
    const g=this.bagGeometry(),a=this.swing?.angle||0,s=Math.sin(a),c=Math.cos(a);
    const ly=Math.max(g.top-g.anchor,Math.min(g.top-g.anchor+g.height,(y-g.anchor-g.width/2*s)/c));
    return g.x-g.width/2*c+ly*s;
  }
  /** Where Nova must stand so the tip of `pose` sinks just inside the leather at its own height. */
  contact(pose){
    const L=this.layout,reach=HERO_REACH[pose],sprite=HERO_SPRITES[pose];
    if(!reach||!sprite||!(L?.unit>0))return {dx:0,dy:0,x:L?.bagX-L?.bagWidth/2||0,y:this.height*.45,fit:true};
    const scale=L.unit/sprite.unit,[bx,,bw]=sprite.bounds,rx=(reach[0]-sprite.anchor[0])*scale,y=L.bottom+(reach[1]-sprite.anchor[1])*scale;
    const target=this.bagEdge(y)+L.bagWidth*.1-rx-L.heroX;
    const min=L.left-L.heroX-(bx-sprite.anchor[0])*scale,max=L.right-L.heroX-(bx+bw-sprite.anchor[0])*scale;
    const dx=Math.max(min,Math.min(max,target));
    return {dx,dy:0,x:L.heroX+dx+rx,y,fit:Math.abs(dx-target)<1};
  }
  // Swing the bag so its edge sits at x (a strike that could not step back far enough shoves it instead of passing through).
  shove(x,y){
    const g=this.bagGeometry(),arm=Math.max(1,y-g.anchor),s=(x-g.x+g.width/2)/arm;
    if(this.motion)this.swing.angle=Math.max(this.swing.angle,Math.asin(Math.max(-.3,Math.min(.4,s))));
  }
  /**
   * One strike: pose, step to contact, hit-stop, bag reaction and localized effects, all from the input frame.
   * The rhythm judgement happened before this call; nothing here delays it.
   */
  hit({move='punch',now=performance.now(),grade='good',critical=false,combo=0,interval=.5,light=false,damage=''}={}){
    const spec=MOVES[move]||MOVES.punch,perfect=grade==='perfect';
    const c=this.contact(spec.pose);
    if(!c.fit)this.shove(c.x-this.layout.bagWidth*.1,c.y);
    // Fast songs shorten follow-through and recovery, never the contact.
    const k=Math.max(.55,Math.min(1.25,interval*850/(spec.extend+spec.recover+spec.hold[1])));
    const hold=light?18:spec.hold[perfect?1:0]+(critical?30:0);
    if(Math.abs(c.dx-this.drawn.dx)>this.layout.unit*.12||this.drawn.id!==spec.pose)this.ghost={...this.drawn,at:now};
    this.strike={move,pose:spec.pose,back:spec.back,at:now,dx:c.dx,dy:spec.lift?-this.layout.unit*.08*spec.lift:0,hold,extend:spec.extend*k,recover:spec.recover*k,tip:{x:c.x,y:c.y},vertical:move==='uppercut'};
    const energy=.8+.4*this.energy,power=(perfect?1.15:1)*(critical?1.35:1)*(light?.45:1)*energy;
    this.holdUntil=now+hold;this.focus={x:c.x,y:c.y};
    this.dent={at:now,y:c.y,power};
    this.bagStrikes.push({time:now+hold,power:spec.push*power,lift:(spec.lift||0)*power,applied:false});this.bagStrikes=this.bagStrikes.slice(-5);
    this.impact({x:c.x,y:c.y,grade,critical,combo,now,light,damage});
    return c;
  }
  // Kept for the old callers: an attack kind goes through the same contact choreography.
  animate(side,kind,now=performance.now(),duration=300){if(side==='hero'&&MOVES[kind])this.hit({move:kind,now,interval:duration/850,light:true});}
  strikeBag(){}
  impact({x=this.focus?.x??this.layout.bagX,y=this.focus?.y??this.height*.45,grade='good',damage='',critical=false,dodge=false,combo=0,now=performance.now(),light=false}={}){
    const tier=comboTier(combo),color=COMBO_COLORS[tier],perfect=grade==='perfect',energy=.75+.5*this.energy;
    // Dosed so five minutes of hits stay pleasant: a Bien is a puff, a Parfait sparks, a critique flares.
    const count=Math.round((critical?28:perfect?15:light?4:8)*energy+tier*(perfect?3:1.5));
    this.burst(x,y,dodge?'#a6efff':critical?'#ffe2a0':perfect?'#fff0c8':'#ffc58b',count,now,{dir:Math.PI,spread:2.6});
    if(tier&&!light)this.burst(x,y,color,4+tier*2,now,{dir:Math.PI,spread:2.2});
    if(damage)this.floats.push({text:String(damage),x:x-6,y:y-22,time:now,color:critical?'#ffe4a4':'#fff2de',large:critical});
    this.floats=this.floats.slice(-12);
    if(!this.motion||!this.intense||dodge)return;
    // Leather dust shaken off the bag drifts down in the lantern light.
    if(!light)for(let i=0;i<4;i++)this.embers.push({at:now,sway:Math.random()*6.3,x:x+(Math.random()-.2)*this.layout.bagWidth*.5,y:y+(Math.random()-.5)*20,vy:18+Math.random()*30,wobble:4+Math.random()*6,size:.8+Math.random()*1.4,life:.9+Math.random()*.8,color:'#e8d2b0'});
    if(perfect||critical){this.sparks.push({x,y,at:now,size:(critical?1.5:1)*Math.max(18,this.layout.unit*.55),color:critical?'#fff1c4':'#ffe9b8'});this.sparks=this.sparks.slice(-4);}
    if(!light)this.ring(x,y,critical?'#fff1c4':color,(critical?1.4:perfect?.9:.6)*(1+tier*.15),now);
    this.shakeAt=now;this.shakePower=(critical?9:perfect?3.2:light?.6:1.4)*(1+tier*.2)*energy;
    this.zoomAt=now;this.zoomPower=(critical?.075:perfect?.028:.012)+tier*.008;
    if(critical)this.flashAt=now;
  }
  comboBreak(now=performance.now()){this.breakAt=now;}
  celebrate(kind='victory',now=performance.now(),text=''){
    const L=this.layout,bx=L.bagX,by=this.height*.45;
    // A broken bag shows its reward in big gold digits and freezes the pose a beat longer (hit-stop on the kill).
    if(text){this.floats.push({text,x:bx,y:this.height*.3,time:now,color:'#ffd36b',large:true});this.floats=this.floats.slice(-12);}
    if(kind!=='flow')this.coinBurst(kind==='victory'?bx:this.width*.5,kind==='victory'?by:this.height*.4,kind==='victory'?(text?10:0):14,now);
    if(kind==='victory'){this.burst(bx,by,'#f9bb7c',30,now);return;}
    this.burst(this.width*.5,this.height*.4,kind==='flow'?'#ffe2a0':'#f9bb7c',kind==='flow'?120:50,now);
    if(this.motion&&this.intense){this.shakeAt=now;this.shakePower=kind==='flow'?14:5;this.zoomAt=now;this.zoomPower=kind==='flow'?.12:.04;this.ring(this.width*.5,this.height*.4,'#ffe2a0',2.2,now);}
  }
  ring(x,y,color,size,now){this.rings.push({x,y,color,size,time:now});this.rings=this.rings.slice(-8);}
  bag(now,reinforced){
    const c=this.ctx,w=this.width,L=this.layout,g=this.bagGeometry(),x=g.x,anchor=g.anchor,width=g.width,top=g.top,height=g.height;
    this.bagStrikes=this.bagStrikes.filter(s=>now-s.time<600);
    // Away from Nova the bag may poke past the edge by half its width at the peak; towards him it stops before his chest.
    const reach=top-anchor+height,away=Math.min(.4,Math.max(0,(w-x-width*.1-8)/reach)),toward=Math.min(.3,Math.max(0,(x-width/2-L.heroX-L.unit*1.1)/reach));
    // Pendulum stepped in small slices (a late frame never makes it jump). It freezes during the hit-stop, then takes the blow.
    const dt=Math.min(.05,Math.max(0,(now-this.swingAt)/1000));this.swingAt=now;
    for(const s of this.bagStrikes)if(!s.applied&&s.time<=now){
      s.applied=true;if(!this.motion)continue;
      // Momentum carries between quick hits; a blow on a bag swinging back absorbs most of it first.
      this.swing.velocity=(this.swing.velocity>0?this.swing.velocity:this.swing.velocity*-.25)+s.power*1.25;
      if(s.lift)this.lift.v-=s.lift*height*1.6;
    }
    if(this.motion&&now>=this.holdUntil){
      for(let left=dt;left>0;left-=.008)swingStep(this.swing,Math.min(.008,left),away,toward);
      this.lift.v+=(-180*this.lift.y-14*this.lift.v)*dt;this.lift.y=Math.max(-height*.08,Math.min(0,this.lift.y+this.lift.v*dt));
    }else if(!this.motion){this.swing={angle:0,velocity:0};this.lift={y:0,v:0};}
    // Knock-out: the old bag hangs during the hit-stop, flies off spinning, then the next one drops from the ceiling.
    const ej=this.ejection,et=ej?(now-ej.at)/1000:9;let drop=0;
    // Done once the new bag is down and the exit glow has faded (wide screens take longer to leave).
    if(ej&&et>=1.15&&(ej.koAt?now-ej.koAt>=450:et>=1.4)){this.ejection=null;this.swing.velocity+=.9;}// the new bag settles with a gentle sway
    else if(ej&&et>=0){
      if(et<1.4&&!(ej.koAt&&now-ej.koAt>150))this.flyingBag(now,ej,et,x,anchor,top,width,height);
      const p=Math.min(1,Math.max(0,(et-.55)/.6));if(p<=0)return;
      drop=1-(1+2.2*(p-1)**3+1.2*(p-1)**2);this.swing={angle:0,velocity:0};// ease-out-back: slight overshoot, then rest
    }
    if(ej&&et<0)reinforced=ej.reinforced;
    c.save();c.translate(x,anchor-drop*(top+height+60));
    c.rotate(-this.swing.angle);
    const lift=this.lift.y;
    c.strokeStyle='#ada59b';c.lineWidth=2;
    for(const dx of [-width*.25,width*.25]){c.beginPath();c.moveTo(0,0);c.lineTo(dx,top-anchor+5+lift);c.stroke();}
    for(let i=0;i<4;i++){const y=i*(top-anchor+lift)/4;c.strokeStyle=i%2?'#d5b99d':'#716b6d';c.beginPath();c.moveTo(-3,y);c.lineTo(3,y+8);c.lineTo(-3,y+16);c.stroke();}
    c.translate(0,top-anchor+lift);
    // Leather dent where the blow lands, then a wobble back to shape.
    const since=this.dent?(now-this.dent.at)/1000:9;
    if(this.motion&&since<.45){
      const p=this.dent.power,ly=Math.max(0,Math.min(height,this.dent.y-top)),squash=Math.min(1.6,p)*(Math.exp(-since*15)*.13+Math.sin(since*36)*Math.exp(-since*8)*.045);
      c.translate(0,ly);c.scale(1-squash,1+squash*.35);c.translate(0,-ly);
    }
    this.bagBody(width,height,reinforced);
    c.restore();
  }
  // Smash-style launch, only one at a time and only with motion effects on.
  ejectBag(now=performance.now(),{reinforced=false,finisher=false}={}){
    if(this.ejection||!this.motion||!this.intense)return;
    // A readable arc (about half a second on screen) rather than a teleport; the camera stays calm.
    const hold=finisher?120:70,power=finisher?1.4:1;
    this.ejection={at:now+hold,reinforced,finisher,vx:(260+120*power)*(this.mobile?.8:1),vy:-(480+120*power),spin:4+2.5*power};
    this.holdUntil=Math.max(this.holdUntil,now+hold);this.zoomAt=now;this.zoomPower=finisher?.1:.05;
    this.shakeAt=now+hold;this.shakePower=finisher?12:6;if(finisher)this.flashAt=now+hold;
  }
  flyingBag(now,ej,et,x,anchor,top,width,height){
    const c=this.ctx,w=this.width,at=t=>({x:x+ej.vx*t,y:top+height/2+ej.vy*t+700*t*t,r:ej.spin*(t-t*t*.35)});// spin eases off a little
    // The broken chain whips back up to the ceiling.
    if(et<.25){const k=1-et/.25;c.save();c.strokeStyle='#ada59b';c.lineWidth=2;c.globalAlpha=k;for(const dx of [-width*.2,width*.2]){c.beginPath();c.moveTo(x,anchor);c.lineTo(x+dx*k+ej.vx*et*.3,anchor+(top-anchor)*k);c.stroke();}c.restore();}
    // Soft motion blur: fading copies along the path just behind the bag.
    for(let k=4;k>=0;k--){const t=et-k*.025;if(t<0)continue;const p=at(t);c.save();c.globalAlpha=k?.16*(1-k/5):1;c.translate(p.x,p.y);c.rotate(p.r);c.translate(0,-height/2);this.bagBody(width,height,ej.reinforced);c.restore();}
    const p=at(et);
    if(!ej.koAt&&(p.x>w+width*.4||p.y<-width*.4)){ej.koAt=now;ej.koX=Math.min(w-6,p.x);ej.koY=Math.max(6,p.y);this.burst(ej.koX,ej.koY,ej.finisher?'#ffd36b':'#fff3d6',ej.finisher?36:18,now);}
  }
  // Soft light bloom where the bag leaves the screen (additive, so it glows instead of covering).
  koStar(now,ej){
    const p=(now-ej.koAt)/450;if(p<0||p>=1)return;
    const c=this.ctx,r=(ej.finisher?150:100)*(.5+p*.7),glow=c.createRadialGradient(ej.koX,ej.koY,0,ej.koX,ej.koY,r),color=ej.finisher?'255,205,110':'255,240,215';
    glow.addColorStop(0,`rgba(${color},${.75*(1-p)**2})`);glow.addColorStop(.35,`rgba(${color},${.3*(1-p)**2})`);glow.addColorStop(1,`rgba(${color},0)`);
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=glow;c.fillRect(ej.koX-r,ej.koY-r,r*2,r*2);c.restore();
  }
  bagBody(width,height,reinforced){
    const c=this.ctx;
    c.fillStyle=reinforced?'#694139':'#35404a';c.beginPath();c.moveTo(-width*.39,0);c.lineTo(width*.35,-2);c.lineTo(width*.5,12);c.lineTo(width*.49,height-13);c.lineTo(width*.3,height);c.lineTo(-width*.32,height);c.lineTo(-width*.5,height-13);c.lineTo(-width*.5,12);c.closePath();c.fill();
    c.fillStyle=reinforced?'#9b6150':'#52616a';c.beginPath();c.moveTo(-width*.39,0);c.lineTo(-width*.06,3);c.lineTo(-width*.13,height-4);c.lineTo(-width*.32,height);c.lineTo(-width*.5,height-13);c.lineTo(-width*.5,12);c.closePath();c.fill();
    c.fillStyle=reinforced?'#432a30':'#242b38';c.beginPath();c.moveTo(width*.35,-2);c.lineTo(width*.5,12);c.lineTo(width*.49,height-13);c.lineTo(width*.3,height);c.lineTo(width*.16,height-7);c.lineTo(width*.23,12);c.closePath();c.fill();
    for(const sy of [height*.15,height*.73]){c.fillStyle=reinforced?'#d7ad73':'#b45f46';c.fillRect(-width*.49,sy,width*.98,reinforced?11:8);c.fillStyle=reinforced?'#f2ce91':'#d48a62';c.fillRect(-width*.49,sy,width*.35,reinforced?11:8);}
    c.strokeStyle=reinforced?'#dfb47966':'#bf9a7c55';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(width*.14,18);c.lineTo(width*.12,height-12);c.stroke();c.setLineDash([]);
    c.fillStyle='#c5a487';c.font=Math.max(18,width*.34)+'px serif';c.textAlign='center';c.fillText(reinforced?'力':'心',-2,height*.52);
    if(reinforced){c.strokeStyle='#d1ae82';c.lineWidth=2;c.strokeRect(-width*.5-2,height*.15-2,width+4,15);c.strokeRect(-width*.5-2,height*.73-2,width+4,15);}
  }
  burst(x,y,color,count,now,{dir=0,spread=Math.PI*2}={}){
    count=this.motion?(this.intense?count:Math.min(6,count)):0;
    for(let i=0;i<count;i++){const angle=dir+(Math.random()-.5)*spread,speed=70+Math.random()*360;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-40,size:2+Math.random()*5,life:.25+Math.random()*.45,time:now,color,angle});}
    this.particles=this.particles.slice(-500);
  }
  // Coins that jump out and fall back spinning (purchases, trophies, broken bags).
  coinBurst(x,y,count,now){
    count=this.motion?(this.intense?count:Math.min(3,count)):0;
    for(let i=0;i<count;i++){const a=-Math.PI/2+(Math.random()-.5)*1.7,s=200+Math.random()*260;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:3.5+Math.random()*3,life:.8+Math.random()*.5,time:now,color:'#ffcc3c',angle:0,coin:true,spin:7+Math.random()*9});}
    this.particles=this.particles.slice(-500);
  }
  // Rising embers from the flames while the combo burns, a golden swirl around Nova during Flow, and the bag's dust.
  motes(now,flow){
    const dt=Math.min(.1,Math.max(0,(now-(this.moteAt??now))/1000)),L=this.layout,w=this.width,h=this.height;this.moteAt=now;
    if(!this.motion||!this.intense){this.embers.length=0;return;}
    const emit=(key,rate,make)=>{this.debt[key]=(this.debt[key]||0)+rate*dt;for(;this.debt[key]>=1;this.debt[key]--)this.embers.push({at:now,sway:Math.random()*6.3,...make()});};
    if(this.heat>.05)emit('fire',this.heat*30,()=>({x:Math.random()*w,y:h,vy:-(50+Math.random()*90)*(.7+this.heat),wobble:6+Math.random()*10,size:.8+Math.random()*2,life:1+Math.random()*1.4,color:this.heat>.85?'#bff6ff':Math.random()<.5?'#ffd36b':'#ff7a3c'}));
    if(flow&&L?.unit>0)emit('flow',34,()=>({x:L.heroX+(Math.random()-.5)*L.unit*1.8,y:L.bottom-Math.random()*L.unit*.3,vy:-(40+Math.random()*70),wobble:L.unit*(.15+Math.random()*.3),size:1+Math.random()*2.2,life:1.2+Math.random()*.9,color:Math.random()<.7?'#ffe2a0':'#fff6d8'}));
    this.embers=this.embers.filter(e=>(now-e.at)/1000<e.life).slice(-180);
    const c=this.ctx;c.save();c.globalCompositeOperation='lighter';
    for(const e of this.embers){const t=(now-e.at)/1000,k=t/e.life,x=e.x+Math.sin(t*2.6+e.sway)*e.wobble,y=e.y+e.vy*t;
      c.globalAlpha=Math.sin(Math.PI*k)*.85;c.fillStyle=e.color;c.beginPath();c.arc(x,y,e.size*(1-k*.4),0,Math.PI*2);c.fill();
      if(e.size>1.8){c.globalAlpha*=.25;c.beginPath();c.arc(x,y,e.size*3,0,Math.PI*2);c.fill();}}
    c.restore();
  }
  /** Pose and step for the coming note: Nova coils and starts to close the distance so contact lands on it. */
  anticipation(move,preparation){
    const spec=MOVES[move];if(!spec||!(preparation>0))return null;
    const p=ease(Math.min(1,preparation));
    return {id:spec.prep&&p>.35?spec.prep:null,dx:this.contact(spec.pose).dx*.55*p};
  }
  fighter(now,{preparation=0,upcomingMove='punch',dance=false,musicalBeat=0}={}){
    const c=this.ctx,L=this.layout;if(!(L?.unit>0))return;
    const phase=((musicalBeat%1)+1)%1,step=((Math.floor(musicalBeat)%2)+2)%2,energy=this.energy??.5;
    // Calm passages breathe in guard; livelier ones dance on the beat with a hop that grows with the song.
    const grooving=this.motion&&dance&&energy>.28,guard=grooving?step?'dance-right':'dance-left':'idle';
    const bounce=!this.motion?0:grooving?-L.unit*(.025+.07*energy)*Math.sin(phase*Math.PI):-L.unit*.012*(1+Math.sin(now/900));
    const prep=this.anticipation(upcomingMove,preparation);
    const st=this.strike,t=st?now-st.at:Infinity;let id=guard,dx=prep?.dx||0,dy=bounce;
    if(st&&t>=0&&t<st.hold+st.extend){id=st.pose;dx=st.dx;dy=st.dy;}
    else if(st&&t<st.hold+st.extend+st.recover){
      const k=(t-st.hold-st.extend)/st.recover,e=this.motion?ease(k):1;
      id=st.back&&k<.5?st.back:prep?.id||guard;dx=st.dx+(dx-st.dx)*e;dy=st.dy+(dy-st.dy)*e;
    }else{if(st)this.strike=null;if(prep?.id)id=prep.id;}
    const image=this.poses[id]?.naturalWidth?this.poses[id]:this.poses.idle;
    if(!image?.naturalWidth)return;
    if(image===this.poses.idle)id='idle';
    // Afterimage of the previous pose for a few frames when a strike snaps Nova forward.
    const gh=this.ghost,ga=gh?(now-gh.at)/70:1;
    if(gh&&ga>=0&&ga<1&&this.motion&&this.intense&&this.poses[gh.id]?.naturalWidth){const b=spritePlacement(gh.id,L,gh.dx,gh.dy);c.save();c.globalAlpha=.28*(1-ga);c.drawImage(this.poses[gh.id],b.sx,b.sy,b.sw,b.sh,b.x,b.y,b.width,b.height);c.restore();}
    const box=spritePlacement(id,L,dx,dy);
    // This same placement handles base, combo and unlocked poses on every screen.
    c.drawImage(image,box.sx,box.sy,box.sw,box.sh,box.x,box.y,box.width,box.height);
    this.drawn={id,dx,dy};
    // Speed streak into the contact point for the first frames of a strike.
    if(st&&t>=0&&t<90&&this.motion&&this.intense){
      const a=1-t/90,len=L.unit*1.1,{x,y}=st.tip,w=Math.max(2,L.unit*.09);
      c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.55*a;c.fillStyle='#fff1c4';c.beginPath();
      if(st.vertical){c.moveTo(x-w,y+len);c.lineTo(x,y);c.lineTo(x+w,y+len);}else{c.moveTo(x-len,y-w);c.lineTo(x,y);c.lineTo(x-len,y+w);}
      c.closePath();c.fill();c.restore();
    }
  }
  // Flames along the bottom edge with a backlit crowd cheering in front of them. Both ease toward the combo's target: slowly up, fast down.
  fervor(now,combo,beat,venue=1){
    const c=this.ctx,w=this.width,h=this.height,dt=Math.min(.1,Math.max(0,(now-(this.fxAt??now))/1000)),live=this.motion?now:0,count=fanCount(combo);this.fxAt=now;
    const ease=(v,to,up,down)=>!this.motion?to:to>v?Math.min(to,v+up*dt):Math.max(to,v-down*dt);
    this.heat=ease(this.heat,heatOf(combo),1.2,3);
    for(let i=0;i<40;i++)this.crowd[i]=ease(this.crowd[i],i<count?1:0,1.5+(i*7%5)*.5,4);
    if(this.heat>.003){
      const n=Math.ceil(w/44),top=h*(.06+.3*this.heat),glow=c.createLinearGradient(0,h,0,h-top*1.5),hot=this.heat>.85;
      c.save();c.globalCompositeOperation='lighter';
      glow.addColorStop(0,'rgba(255,90,40,'+.45*Math.min(1,this.heat*3)+')');glow.addColorStop(1,'rgba(255,90,40,0)');c.fillStyle=glow;c.fillRect(0,h-top*1.5,w,top*1.5);
      for(let layer=0;layer<2;layer++){
        c.fillStyle=layer?(hot?'#bff6ff':'#ffd36b'):'#ff4a1c';c.globalAlpha=(layer?.5:.38)*Math.min(1,this.heat*4);
        for(let i=0;i<n;i++){
          const x=(i+.5)*w/n,ww=w/n*(layer?1.5:2.3),hh=top*(layer?.55:1)*(.6+.4*Math.abs(Math.sin(i*1.7+1)))*(.6+.4*Math.sin(live/(170+i%5*30)+i*2.1)),tip=x+Math.sin(live/260+i)*ww*.25;
          c.beginPath();c.moveTo(x-ww/2,h+4);c.bezierCurveTo(x-ww*.45,h-hh*.4,x-ww*.1+(tip-x)*.5,h-hh*.7,tip,h-hh);c.bezierCurveTo(x+ww*.1+(tip-x)*.5,h-hh*.6,x+ww*.45,h-hh*.35,x+ww/2,h+4);c.fill();
        }
      }
      c.restore();
    }
    for(let row=0;row<3;row++)for(let i=row;i<40;i+=3){
      const a=this.crowd[i];if(a<.01)continue;
      const s=h*(.15+.02*row)*a,x=w*((i*.618034+.1)%1),feet=h*(.87+.055*row),hop=this.motion?Math.max(0,Math.sin(beat*Math.PI*2+i))*s*.1:0,wave=this.motion?Math.sin(beat*Math.PI*2+i*1.3):0;
      const fan=this.art('crowd/'+(venue>=10?'alien':'human')+'-'+(i%3+1)+'-'+(wave>0?'b':'a')+'.webp');
      if(fan.naturalWidth){c.drawImage(fan,x-s*.5,feet-hop-s*1.25,s*.833,s*1.25);continue;}
      c.save();c.translate(x,feet-hop);c.fillStyle=c.strokeStyle='#150d19';c.lineCap='round';c.lineWidth=s*.055;
      for(const side of [-1,1]){
        c.beginPath();c.moveTo(side*s*.07,-s*.3);c.lineTo(side*s*.1,0);c.moveTo(side*s*.13,-s*.58);c.lineTo(side*s*.3,-s*(.78+.2*(side>0?wave:-wave)));c.stroke();
      }
      c.beginPath();c.ellipse(0,-s*.45,s*.13,s*.24,0,0,Math.PI*2);c.moveTo(s*.09,-s*.8);c.arc(0,-s*.8,s*.09,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,150,70,.6)';c.lineWidth=1.5;c.beginPath();c.arc(0,-s*.8,s*.09,Math.PI*1.1,Math.PI*1.9);c.stroke();
      c.fillStyle=COMBO_COLORS[1+i%4];c.beginPath();for(const side of [-1,1]){const gy=-s*(.78+.2*(side>0?wave:-wave));c.moveTo(side*s*.3+s*.045,gy);c.arc(side*s*.3,gy,s*.045,0,Math.PI*2);}c.fill();
      c.restore();
    }
  }
  /**
   * Training spots: the free floor behind Nova first (the nearest is the first student's place), then a back row.
   * Phones have no free floor beside Nova, so everyone trains in the back row there.
   */
  traineeSpots(n){
    const L=this.layout,size=L.unit*5.4,far=size*.56,front=[],spots=[],novaBack=L.heroX-GUARD_BACK*L.unit,bagRight=L.bagX+L.bagWidth/2;
    for(let x=novaBack-size*.3;x-size*.25>=L.left;x-=size*.52)front.push({x,feet:L.bottom+2,size});
    // Back of the room: the corners beside Nova and beyond the bag come first, so the first students are never hidden behind him.
    const corners=[{x:Math.max(L.left+far*.2,(L.left+novaBack)/2)},{x:Math.min(L.right-far*.2,(bagRight+L.right)/2),mirror:true}];
    const back=Math.max(2,4-front.length),lo=L.left+size*.2,hi=L.bagX-L.bagWidth*.8;
    for(let i=0;i<n;i++){
      const k=i-front.length,spot=front[i]||corners[k]||{x:lo+(hi-lo)*((k-2+.5)/back)};
      spots.push(front[i]||{...spot,feet:L.bottom-L.unit*.6,size:far,back:true});
    }
    return spots;
  }
  trainees(now,count,beat,venue=0){
    // A reload shows the school already in place; only a purchase walks newcomers in, once the stage is on screen.
    if(!(this.layout?.unit>0))return;
    if(this.shownTrainees===undefined)this.shownTrainees=count;
    if(count>this.shownTrainees){for(let i=Math.min(6,this.shownTrainees);i<Math.min(6,count);i++)this.arrivals[i]={at:now+(i-Math.min(6,this.shownTrainees))*320};}
    this.shownTrainees=count;
    if(!count)return;
    const c=this.ctx,n=Math.min(6,count),spots=this.traineeSpots(n);
    for(let i=n-1;i>=0;i--){
      const spot=spots[i],arrival=this.arrivals[i],p=!arrival?1:this.motion?Math.min(1,Math.max(0,(now-arrival.at)/1100)):1;
      if(p<=0)continue;
      // Walk in from the doorway with a little bob, then settle into the training loop on the beat.
      const walking=p<1,x=walking?-spot.size*.4+(spot.x+spot.size*.4)*(1-(1-p)**2):spot.x,bob=walking?Math.abs(Math.sin(p*Math.PI*6))*spot.size*.025:0;
      const punch=!walking&&this.motion?Math.max(0,1-((beat+i*.37)%1+1)%1*3):0,pose=punch>.32?1:0;
      const own=venue?this.art('disciples/'+String(venue).padStart(2,'0')+(pose?'-jab':'-ready')+'.webp'):null,image=own?.naturalWidth?own:this.apprentice[pose];
      if(!image.naturalWidth)continue;
      const height=spot.size,width=height*image.naturalWidth/image.naturalHeight;
      // Students beyond the bag turn round to face Nova, like a class facing its teacher.
      c.save();if(spot.back)c.globalAlpha=.9;c.translate(x,0);if(spot.mirror&&!walking)c.scale(-1,1);
      c.drawImage(image,-width*.5,spot.feet-height-bob+punch*1.5,width,height);c.restore();
      if(walking&&p>.85&&!arrival.dust){arrival.dust=true;this.burst(spot.x,spot.feet-4,'#d9b48a',8,now,{dir:-Math.PI/2,spread:2.4});}
    }
  }
  details(tier,now,beatPhase=1){
    const c=this.ctx,w=this.width,h=this.height,energy=this.energy??.5;
    for(let i=0;i<tier;i++){
      const x=w*(.17+i*.33),y=h*.18;
      c.save();c.fillStyle='#481f22';c.strokeStyle='#dba46c';c.lineWidth=1;
      c.beginPath();c.moveTo(x-13,y);c.lineTo(x+13,y);c.lineTo(x+13,y+46);c.lineTo(x,y+39);c.lineTo(x-13,y+46);c.closePath();c.fill();c.stroke();
      c.fillStyle='#e4b57b';c.font='17px serif';c.textAlign='center';c.fillText(['心','技','体'][i],x,y+25);c.restore();
    }
    if(this.motion&&this.intense){
      c.save();
      const pulse=Math.max(0,1-beatPhase*4)*energy;
      // Dust in the light: more motes as the song lifts (they fade in, never pop), all a little brighter on the beat.
      for(let i=0;i<36;i++){const show=i<14?1:Math.min(1,Math.max(0,energy*40-i));if(!show)continue;const p=(now/(17000+i*400)+i/36)%1,x=w*((i*.173)%1)+Math.sin(now/3200+i)*15,y=h*(1-p);c.globalAlpha=show*Math.sin(p*Math.PI)*(.18+(i%3)*.07)*(1+pulse*1.5);c.fillStyle=i%4?'#ffca82':'#f29859';c.beginPath();c.arc(x,y,i%4?1.1:2.1,0,Math.PI*2);c.fill();}
      // Lantern light follows the song: dim and slow in calm passages, brighter with a soft pulse on the beat when it lifts.
      c.globalAlpha=.018+energy*.04+pulse*.03+Math.sin(now/1800)*.006;c.fillStyle='#ffbb65';
      for(const lx of [.08,.89]){c.beginPath();c.moveTo(w*lx,h*.08);c.lineTo(w*(lx+.11),h*.9);c.lineTo(w*(lx-.1),h*.9);c.closePath();c.fill();}
      for(let i=0;i<4;i++){const p=(now/29000+i*.27)%1;c.save();c.translate(w*(1-p),h*(.2+i*.17)+Math.sin(now/2900+i)*12);c.rotate(now/9000+i);c.globalAlpha=.17;c.fillStyle='#df8c50';c.beginPath();c.moveTo(-4,0);c.lineTo(0,-2);c.lineTo(6,0);c.lineTo(0,3);c.closePath();c.fill();c.restore();}c.restore();
    }
  }
  effects(now){
    const c=this.ctx;this.particles=this.particles.filter(p=>(now-p.time)/1000<p.life);
    this.rings=this.rings.filter(r=>now-r.time<340);this.sparks=this.sparks.filter(s=>now-s.at<130);
    for(const r of this.rings){const p=(now-r.time)/340;if(p<0)continue;c.save();c.globalAlpha=(1-p)*.8;c.strokeStyle=r.color;c.lineWidth=9*(1-p)*r.size;c.beginPath();c.arc(r.x,r.y,(10+p*70)*r.size,0,Math.PI*2);c.stroke();c.restore();}
    c.save();c.globalCompositeOperation='lighter';
    // Contact star on Parfait and critique: a four-point glint that opens and fades in two or three frames.
    for(const s of this.sparks){const p=(now-s.at)/130,r=s.size*(.6+p*.8),k=r*.16;c.save();c.globalAlpha=1-p;c.fillStyle=s.color;c.translate(s.x,s.y);c.rotate(.2);c.beginPath();c.moveTo(-r,0);c.lineTo(-k,-k);c.lineTo(0,-r*.75);c.lineTo(k,-k);c.lineTo(r,0);c.lineTo(k,k);c.lineTo(0,r*.75);c.lineTo(-k,k);c.closePath();c.fill();c.restore();}
    for(const p of this.particles){const t=(now-p.time)/1000;if(t<0)continue;const fade=1-t/p.life;
      if(p.coin){const r=p.size;c.save();c.globalCompositeOperation='source-over';c.globalAlpha=Math.min(1,fade*3);c.translate(p.x+p.vx*t,p.y+p.vy*t+620*t*t);c.scale(Math.max(.18,Math.abs(Math.cos(t*p.spin))),1);
        c.fillStyle='#b97a10';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.fillStyle='#ffcc3c';c.beginPath();c.arc(0,0,r*.76,0,Math.PI*2);c.fill();c.fillStyle='#fff3b0';c.beginPath();c.arc(-r*.25,-r*.28,r*.22,0,Math.PI*2);c.fill();c.restore();continue;}
      c.save();c.translate(p.x+p.vx*t,p.y+p.vy*t+90*t*t);c.rotate(p.angle+t*3);c.globalAlpha=fade;c.fillStyle=p.color;
      c.beginPath();c.moveTo(-p.size,0);c.lineTo(p.size*2*fade,0);c.lineTo(0,p.size*.7);c.closePath();c.fill();c.restore();}
    c.restore();
    if(this.ejection?.koAt)this.koStar(now,this.ejection);
    this.floats=this.floats.filter(f=>now-f.time<800);
    for(const f of this.floats){const p=(now-f.time)/800;if(p<0)continue;c.save();c.globalAlpha=Math.min(1,(1-p)*3);c.fillStyle=f.color;c.shadowColor='#1a0f1c';c.shadowBlur=7;c.textAlign='center';c.font=`700 ${f.large?30:20}px "Space Grotesk",sans-serif`;c.fillText(f.text,f.x,f.y-(this.motion?p*40:0));c.restore();}
  }
  render(now,{upcomingMove='punch',arenaVisible=true,lit=false,playing=false,beatPhase=1,preparation=0,dance=false,musicalBeat=0,flow=false,tier=0,disciples=0,boss=false,combo=0,venueArt='',venue=1,energy=.5}={}){
    this.energy=energy;
    const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);c.save();
    if(this.motion&&this.intense){
      const t=(now-this.shakeAt)/240,shake=t>=0&&t<1?this.shakePower*(1-t)**2:0,z=(now-this.zoomAt)/220;
      // Punch-in on the contact point; the extra scale hides the empty edges the shake would reveal.
      const scale=1+(z>=0&&z<1?this.zoomPower*(1-z)**2:0)+shake*2.2/Math.min(w,h),fx=this.focus?.x??this.layout.bagX,fy=this.focus?.y??h*.45;
      c.translate(fx+Math.sin(t*43)*shake,fy+Math.cos(t*37)*shake*.6);c.scale(scale,scale);c.translate(-fx,-fy);
    }
    c.fillStyle='#29232b';c.fillRect(0,0,w,h);
    // The current venue's picture replaces the default dojo as soon as the file exists (see VENUES-ART.md).
    if(this.venueArtPath!==venueArt){this.venueArtPath=venueArt;this.venueImage=venueArt?Object.assign(new Image(),{src:new URL('./'+venueArt,import.meta.url).href}):null;}
    if(this.venueImage?.naturalWidth)this.drawRoom(this.venueImage);
    else this.drawRoom(this.rooms[lit&&this.rooms[1].naturalWidth?1:0]);
    c.fillStyle=boss?'#41172a25':'#130d170e';c.fillRect(0,0,w,h);
    this.details(tier,now,playing?beatPhase:1);this.trainees(now,disciples,playing?musicalBeat:now/650,venue);
    const comboLevel=comboTier(combo);
    // The edge glow stays while the combo holds, pulsing on the beat, so the run is felt between hits too.
    if(comboLevel&&this.motion&&this.intense){const edge=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.75),alpha=Math.round(255*Math.min(.5,.1*comboLevel*(1.25-beatPhase*.5))).toString(16).padStart(2,'0');edge.addColorStop(0,COMBO_COLORS[comboLevel]+'00');edge.addColorStop(1,COMBO_COLORS[comboLevel]+alpha);c.fillStyle=edge;c.fillRect(0,0,w,h);}
    if(flow){const glow=c.createRadialGradient(w*.5,h*.7,0,w*.5,h*.7,w*.7);glow.addColorStop(0,'#ffc16c30');glow.addColorStop(1,'#ffc16c00');c.fillStyle=glow;c.fillRect(0,0,w,h);}
    if(playing&&beatPhase<.1&&this.motion){c.fillStyle=`rgba(246,153,75,${(.1-beatPhase)*.25*(.3+this.energy)})`;c.fillRect(0,0,w,h);}
    if(this.intense)this.fervor(now,combo,playing?musicalBeat:now/500,venue);
    this.bag(now,boss);this.fighter(now,{preparation,upcomingMove,dance,musicalBeat});
    this.motes(now,flow);this.effects(now);c.restore();
    const b=(now-this.breakAt)/350;if(this.motion&&this.intense&&b>=0&&b<1){const edge=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.3,w*.5,h*.5,Math.max(w,h)*.75);edge.addColorStop(0,'rgba(216,67,59,0)');edge.addColorStop(1,`rgba(216,67,59,${.55*(1-b)})`);c.fillStyle=edge;c.fillRect(0,0,w,h);}
    // Single short, soft white flash on critical hits only (kept well under photosensitivity thresholds).
    const f=(now-this.flashAt)/110;if(this.motion&&this.intense&&f>=0&&f<1){c.fillStyle=`rgba(255,250,235,${.3*(1-f)})`;c.fillRect(0,0,w,h);}
  }
}
