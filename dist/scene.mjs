import { techniquePose, STYLE_MOVES, FORMS } from './combat-controls.mjs';
import { HERO_SPRITES } from './sprites/hero-manifest.mjs';
import { combatLayout, spritePlacement } from './scene-layout.mjs';
// Combo levels at 8/16/32/64: each one hits harder and shifts colour (orange, gold, cyan, pink, white).
export const COMBO_COLORS=['#ffc58b','#ffd36b','#7ff0ff','#ff6bd6','#ffffff'];
export function comboTier(combo){return combo>=64?4:combo>=32?3:combo>=16?2:combo>=8?1:0;}
// Visual only, never touches coins or damage: flames rise with the combo, a crowd gathers at 50/100/150/200, a miss sends both away.
export const heatOf=combo=>combo<10?0:Math.min(1,.15+combo/240);
export const fanCount=combo=>combo>=200?40:combo>=150?20:combo>=100?10:combo>=50?5:0;
/**
 * Heavy-bag pendulum (radians, rad/s). A hit is an instant push away from the hero; gravity pulls it back,
 * friction slows it, and it bounces softly off the safe limit so it never leaves the frame or hits Nova.
 */
export function swingStep(bag,dt,limit,back=limit){
  bag.velocity+=(-100*bag.angle-2*bag.velocity)*dt;bag.angle+=bag.velocity*dt;
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
    this.actions={hero:{kind:'idle',time:0},enemy:{kind:'idle',time:0}};
    this.particles=[];this.floats=[];this.shakeAt=-1000;this.shakePower=0;this.holdUntil=0;this.holdTime=0;this.zoomAt=-1000;this.zoomPower=0;this.flashAt=-1000;this.breakAt=-1000;this.rings=[];
    this.bagStrikes=[];this.swing={angle:0,velocity:0};this.swingAt=0;this.heat=0;this.crowd=new Array(40).fill(0);
    this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);
  }
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
  animate(side,kind,now=performance.now(),duration=300){
    if(kind==='auto'&&now-this.actions[side].time<400)return;
    const attack=['punch','cross','kick','uppercut','auto'].includes(kind)||STYLE_MOVES[kind]||FORMS[kind];
    // Contact is drawn on input. The preceding note provides the anticipation.
    this.actions[side]={kind,time:now-(attack?duration*.28:0),duration};
  }
  impact({side='enemy',damage='',critical=false,dodge=false,combo=0,now=performance.now()}={}){
    const x=this.layout.bagX,y=this.height*.45,tier=comboTier(combo),boost=1+tier*.5,color=COMBO_COLORS[tier];
    this.burst(x,y,dodge?'#a6efff':critical?'#ffe2a0':'#ffc58b',Math.round((critical?90:dodge?20:40)*boost),now);
    if(tier)this.burst(x,y,color,12*tier,now);
    if(damage)this.floats.push({text:String(damage),x,y:y-15,time:now,color:critical?'#ffe4a4':dodge?'#b9f3ff':'#fff2de',large:critical});
    this.floats=this.floats.slice(-12);
    if(this.motion&&this.intense&&!dodge){
      this.shakeAt=now;this.shakePower=(critical?16:7)*(1+tier*.35);this.holdTime=now;this.holdUntil=now+(critical?90:45);
      this.zoomAt=now;this.zoomPower=(critical?.12:.05)+tier*.015;this.ring(x,y,critical?'#fff1c4':color,(critical?1.6:1)*(1+tier*.25),now);
      if(critical)this.flashAt=now;
    }
  }
  comboBreak(now=performance.now()){this.breakAt=now;}
  celebrate(kind='victory',now=performance.now(),text=''){
    // A broken bag shows its reward in big gold digits and freezes the pose a beat longer (hit-stop on the kill).
    if(text){this.floats.push({text,x:this.layout.bagX,y:this.height*.3,time:now,color:'#ffd36b',large:true});this.floats=this.floats.slice(-12);}
    if(kind==='victory'){this.burst(this.layout.bagX,this.height*.45,'#f9bb7c',45,now);return;}
    this.burst(this.width*.5,this.height*.4,kind==='flow'?'#ffe2a0':'#f9bb7c',kind==='flow'?160:90,now);
    if(this.motion&&this.intense){this.shakeAt=now;this.shakePower=kind==='flow'?18:8;this.zoomAt=now;this.zoomPower=kind==='flow'?.14:.06;this.ring(this.width*.5,this.height*.4,'#ffe2a0',2.2,now);}
  }
  ring(x,y,color,size,now){this.rings.push({x,y,color,size,time:now});this.rings=this.rings.slice(-8);}
  // Contact lands 45 ms after the input, like the impact particles.
  strikeBag(now=performance.now(),power=1){this.bagStrikes.push({time:now+45,power,applied:false});this.bagStrikes=this.bagStrikes.slice(-5);}
  bag(now,reinforced){
    const c=this.ctx,w=this.width,h=this.height,x=this.layout.bagX,anchor=h*.055,width=Math.max(36,Math.min(100,w*(this.mobile?.15:.145))),top=h*.21,height=h*(this.mobile?.48:.58);
    this.bagStrikes=this.bagStrikes.filter(s=>now-s.time<600);
    const leftLimit=this.mobile?w/2+34+8:w*.6;
    // Away from Nova the bag may poke past the edge by half its width at the peak; towards her it must stay clear.
    const reach=top-anchor+height,away=Math.min(.4,Math.max(0,(w-x-width*.1-8)/reach)),toward=Math.min(.3,Math.max(0,(x-leftLimit-width*.6)/reach));
    // Pendulum stepped in small slices (a late frame never makes it jump); hits push it away from the hero.
    const dt=Math.min(.05,Math.max(0,(now-this.swingAt)/1000));this.swingAt=now;
    for(const s of this.bagStrikes)if(!s.applied&&s.time<=now){s.applied=true;if(this.motion)this.swing.velocity=Math.max(this.swing.velocity,0)+2.6*s.power;}
    if(this.motion)for(let left=dt;left>0;left-=.008)swingStep(this.swing,Math.min(.008,left),away,toward);else this.swing={angle:0,velocity:0};
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
    c.strokeStyle='#ada59b';c.lineWidth=2;
    for(const dx of [-width*.25,width*.25]){c.beginPath();c.moveTo(0,0);c.lineTo(dx,top-anchor+5);c.stroke();}
    for(let i=0;i<4;i++){const y=i*(top-anchor)/4;c.strokeStyle=i%2?'#d5b99d':'#716b6d';c.beginPath();c.moveTo(-3,y);c.lineTo(3,y+8);c.lineTo(-3,y+16);c.stroke();}
    c.translate(0,top-anchor);
    // Leather squash on contact: the bag flattens where it is hit, then wobbles back to shape.
    const last=this.bagStrikes.filter(s=>s.applied).at(-1),since=last?(now-last.time)/1000:9;
    if(this.motion&&since<.4){const squash=Math.min(1.5,last.power)*(Math.exp(-since*16)*.16+Math.sin(since*38)*Math.exp(-since*9)*.05);c.translate(0,height/2);c.scale(1-squash,1+squash*.45);c.translate(0,-height/2);}
    this.bagBody(width,height,reinforced);
    c.restore();
  }
  // Smash-style launch, only one at a time and only with motion effects on.
  ejectBag(now=performance.now(),{reinforced=false,finisher=false}={}){
    if(this.ejection||!this.motion||!this.intense)return;
    // A readable arc (about half a second on screen) rather than a teleport; the camera stays calm.
    const hold=finisher?120:70,power=finisher?1.4:1;
    this.ejection={at:now+hold,reinforced,finisher,vx:(260+120*power)*(this.mobile?.8:1),vy:-(480+120*power),spin:4+2.5*power};
    this.holdTime=now;this.holdUntil=now+hold;this.zoomAt=now;this.zoomPower=finisher?.1:.05;
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
  burst(x,y,color,count,now){
    count=this.motion?(this.intense?count:Math.min(6,count)):0;
    for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=80+Math.random()*420;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-40,size:3+Math.random()*6,life:.35+Math.random()*.6,time:now,color,angle});}
    this.particles=this.particles.slice(-600);
  }
  fighter(x,y,height,side,now,preparation=0,dance=false,musicalBeat=0){
    const c=this.ctx,action=this.actions[side],elapsed=(now-action.time)/1000,duration=(action.duration||300)/1000;
    const active=elapsed>=0&&elapsed<duration,kind=active?action.kind:'idle',p=active?elapsed/duration:0;
    const technique=techniquePose(kind,p),grooving=this.motion&&((dance&&kind==='idle')||kind==='dance');
    const phase=((musicalBeat%1)+1)%1,step=((Math.floor(musicalBeat)%2)+2)%2;
    const poses=['kick-ready','kick','uppercut-ready','uppercut'];
    let id=technique?poses[technique.frame]:grooving?step?'dance-right':'dance-left':['punch','cross','auto'].includes(kind)&&p>.08&&p<.76?kind==='cross'?'cross':'jab':'idle';
    if(!active && preparation>.45){
      const foot=['kick','roundhouse','meiaLua','axeKick','cartwheel'].includes(this.preparedMove);
      id=foot?'kick-ready':'uppercut-ready';
    }
    const form=FORMS[kind];
    if(form)id=kind+'-'+(p<.23?0:p<.71?1:2);
    else if(STYLE_MOVES[kind]){
      const kicking=kind==='roundhouse'||kind==='meiaLua';
      id=p<.14||p>.78?(kicking?'kick-ready':'uppercut-ready'):kind;
    }
    const image=this.poses[id]?.naturalWidth?this.poses[id]:this.poses.idle;
    if(!image?.naturalWidth || this.layout.unit<=0)return;
    if(image===this.poses.idle)id='idle';
    const box=spritePlacement(id,this.layout);
    // This same placement handles base, combo and unlocked poses on every screen.
    c.drawImage(image,box.sx,box.sy,box.sw,box.sh,box.x,box.y,box.width,box.height);
    if(active && p>.23 && p<.7 && this.motion && this.intense){
      const alpha=Math.sin((p-.23)/.47*Math.PI)*.55;
      c.save();c.globalAlpha=alpha;c.strokeStyle=kind.includes('kick')||kind==='meiaLua'?'#ffd071':'#fff1c4';
      c.lineWidth=2;c.lineCap='round';
      c.beginPath();c.moveTo(box.x+box.width*.4,box.y+box.height*.5);
      c.quadraticCurveTo(box.x+box.width*.8,box.y+box.height*.28,box.x+box.width*.98,box.y+box.height*.42);
      c.stroke();c.restore();
    }
  }
  // Flames along the bottom edge with a backlit crowd cheering in front of them. Both ease toward the combo's target: slowly up, fast down.
  fervor(now,combo,beat){
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
  trainees(now,count,beat){
    if(!count)return;const c=this.ctx,w=this.width,h=this.height,n=Math.min(6,count);
    for(let i=0;i<n;i++){
      const stride=this.motion?Math.max(0,1-(now-(this.arrivalAt??-2000))/1100):0;
      const punch=this.motion?Math.max(0,1-((beat+i*.2)%1+1)%1*3):0;
      const x=w*(i===0?.84+stride*.23:i<4?.07+(i-1)*.08:.75+(i-4)*.16);
      const image=this.apprentice[punch>.32?1:0];
      if(!image.naturalWidth)continue;
      const height=Math.min(h*.29,w*.18),width=height*image.naturalWidth/image.naturalHeight;
      // The two frames share their rear-foot anchor.
      c.drawImage(image,x-width*.5,h*.79-height+punch*1.5,width,height);
    }
  }
  details(tier,now){
    const c=this.ctx,w=this.width,h=this.height;
    for(let i=0;i<tier;i++){
      const x=w*(.17+i*.33),y=h*.18;
      c.save();c.fillStyle='#481f22';c.strokeStyle='#dba46c';c.lineWidth=1;
      c.beginPath();c.moveTo(x-13,y);c.lineTo(x+13,y);c.lineTo(x+13,y+46);c.lineTo(x,y+39);c.lineTo(x-13,y+46);c.closePath();c.fill();c.stroke();
      c.fillStyle='#e4b57b';c.font='17px serif';c.textAlign='center';c.fillText(['心','技','体'][i],x,y+25);c.restore();
    }
    if(this.motion&&this.intense){
      c.save();
      for(let i=0;i<18;i++){const p=(now/(17000+i*400)+i/18)%1,x=w*((i*.173)%1)+Math.sin(now/3200+i)*15,y=h*(1-p);c.globalAlpha=Math.sin(p*Math.PI)*(.18+(i%3)*.07);c.fillStyle=i%4?'#ffca82':'#f29859';c.beginPath();c.arc(x,y,i%4?1.1:2.1,0,Math.PI*2);c.fill();}
      // Lantern light breathes slowly behind the action.
      c.globalAlpha=.025+Math.sin(now/1800)*.007;c.fillStyle='#ffbb65';
      for(const lx of [.08,.89]){c.beginPath();c.moveTo(w*lx,h*.08);c.lineTo(w*(lx+.11),h*.9);c.lineTo(w*(lx-.1),h*.9);c.closePath();c.fill();}
      for(let i=0;i<4;i++){const p=(now/29000+i*.27)%1;c.save();c.translate(w*(1-p),h*(.2+i*.17)+Math.sin(now/2900+i)*12);c.rotate(now/9000+i);c.globalAlpha=.17;c.fillStyle='#df8c50';c.beginPath();c.moveTo(-4,0);c.lineTo(0,-2);c.lineTo(6,0);c.lineTo(0,3);c.closePath();c.fill();c.restore();}c.restore();
    }
  }
  effects(now){
    const c=this.ctx;this.particles=this.particles.filter(p=>(now-p.time)/1000<p.life);
    this.rings=this.rings.filter(r=>now-r.time<380);
    for(const r of this.rings){const p=(now-r.time)/380;if(p<0)continue;c.save();c.globalAlpha=1-p;c.strokeStyle=r.color;c.lineWidth=12*(1-p)*r.size;c.beginPath();c.arc(r.x,r.y,(14+p*90)*r.size,0,Math.PI*2);c.stroke();c.restore();}
    c.save();c.globalCompositeOperation='lighter';
    for(const p of this.particles){const t=(now-p.time)/1000;if(t<0)continue;const fade=1-t/p.life;
      c.save();c.translate(p.x+p.vx*t,p.y+p.vy*t+90*t*t);c.rotate(p.angle+t*3);c.globalAlpha=fade;c.fillStyle=p.color;
      c.beginPath();c.moveTo(-p.size,0);c.lineTo(p.size*2*fade,0);c.lineTo(0,p.size*.7);c.closePath();c.fill();c.restore();}
    c.restore();
    if(this.ejection?.koAt)this.koStar(now,this.ejection);
    this.floats=this.floats.filter(f=>now-f.time<800);
    for(const f of this.floats){const p=(now-f.time)/800;if(p<0)continue;c.save();c.globalAlpha=Math.min(1,(1-p)*3);c.fillStyle=f.color;c.shadowColor='#1a0f1c';c.shadowBlur=7;c.textAlign='center';c.font=`700 ${f.large?30:23}px "Space Grotesk",sans-serif`;c.fillText(f.text,f.x,f.y-(this.motion?p*40:0));c.restore();}
  }
  render(now,{upcomingMove='punch',arenaVisible=true,lit=false,playing=false,beatPhase=1,preparation=0,dance=false,musicalBeat=0,flow=false,tier=0,disciples=0,boss=false,combo=0,venueArt=''}={}){
    this.preparedMove=upcomingMove;
    const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);c.save();
    if(this.motion&&this.intense){
      const t=(now-this.shakeAt)/280,shake=t>=0&&t<1?this.shakePower*(1-t):0,z=(now-this.zoomAt)/240;
      // Punch-in on the bag; the extra scale hides the empty edges the shake would reveal.
      const scale=1+(z>=0&&z<1?this.zoomPower*(1-z)**2:0)+shake*2.2/Math.min(w,h),fx=this.layout.bagX,fy=h*.45;
      c.translate(fx+Math.sin(t*43)*shake,fy+Math.cos(t*37)*shake*.6);c.scale(scale,scale);c.translate(-fx,-fy);
    }
    c.fillStyle='#29232b';c.fillRect(0,0,w,h);
    const reveal=this.motion?Math.min(1,Math.max(0,(now-(this.litAt??-2000))/1200)):1;
    // The current venue's picture replaces the default dojo as soon as the file exists (see VENUES-ART.md).
    if(this.venueArtPath!==venueArt){this.venueArtPath=venueArt;this.venueImage=venueArt?Object.assign(new Image(),{src:new URL('./'+venueArt,import.meta.url).href}):null;}
    if(this.venueImage?.naturalWidth)this.drawRoom(this.venueImage);
    else{
      if(!lit || reveal<1 || !this.rooms[1].naturalWidth)this.drawRoom(this.rooms[0]);
      if(lit){c.save();c.globalAlpha=reveal;this.drawRoom(this.rooms[1]);c.restore();}
    }
    c.fillStyle=boss?'#41172a25':'#130d170e';c.fillRect(0,0,w,h);
    if(arenaVisible && this.welcomeDisciple){this.arrivalAt=now;this.welcomeDisciple=false;}
    this.details(tier,now);this.trainees(now,disciples,playing?musicalBeat:.5);
    const comboLevel=comboTier(combo);
    // The edge glow stays while the combo holds, pulsing on the beat, so the run is felt between hits too.
    if(comboLevel&&this.motion&&this.intense){const edge=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.75),alpha=Math.round(255*Math.min(.5,.1*comboLevel*(1.25-beatPhase*.5))).toString(16).padStart(2,'0');edge.addColorStop(0,COMBO_COLORS[comboLevel]+'00');edge.addColorStop(1,COMBO_COLORS[comboLevel]+alpha);c.fillStyle=edge;c.fillRect(0,0,w,h);}
    if(flow){const glow=c.createRadialGradient(w*.5,h*.7,0,w*.5,h*.7,w*.7);glow.addColorStop(0,'#ffc16c30');glow.addColorStop(1,'#ffc16c00');c.fillStyle=glow;c.fillRect(0,0,w,h);}
    if(playing&&beatPhase<.1&&this.motion){c.fillStyle=`rgba(246,153,75,${(.1-beatPhase)*.2})`;c.fillRect(0,0,w,h);}
    const height=Math.min(h*1.12,w*.84),y=h*.12,poseTime=now<this.holdUntil?this.holdTime:now;
    if(this.intense)this.fervor(now,combo,playing?musicalBeat:now/500);
    this.bag(now,boss);this.fighter(w*(this.mobile?.18:w<600?.34:.30),this.mobile?h*.34:y,height,'hero',poseTime,preparation,dance,musicalBeat);
    this.effects(now);c.restore();
    // Single short, soft white flash on critical hits only (kept well under photosensitivity thresholds).
    const b=(now-this.breakAt)/350;if(this.motion&&this.intense&&b>=0&&b<1){const edge=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.3,w*.5,h*.5,Math.max(w,h)*.75);edge.addColorStop(0,'rgba(216,67,59,0)');edge.addColorStop(1,`rgba(216,67,59,${.55*(1-b)})`);c.fillStyle=edge;c.fillRect(0,0,w,h);}
    const f=(now-this.flashAt)/110;if(this.motion&&this.intense&&f>=0&&f<1){c.fillStyle=`rgba(255,250,235,${.4*(1-f)})`;c.fillRect(0,0,w,h);}
  }
}
