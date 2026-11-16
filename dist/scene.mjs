import { techniquePose, STYLE_MOVES, FORMS } from './combat-controls.mjs';
import { HERO_SPRITES } from './sprites/hero-manifest.mjs';
import { combatLayout, spritePlacement } from './scene-layout.mjs';
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
    this.particles=[];this.floats=[];this.shakeAt=-1000;this.shakePower=0;this.holdUntil=0;this.holdTime=0;
    this.bagStrikes=[];
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
  impact({side='enemy',damage='',critical=false,dodge=false,now=performance.now()}={}){
    const x=this.layout.bagX,y=this.height*.45;
    this.burst(x,y,dodge?'#a6efff':critical?'#ffe2a0':'#ffc58b',critical?28:dodge?14:17,now);
    if(damage)this.floats.push({text:String(damage),x,y:y-15,time:now,color:critical?'#ffe4a4':dodge?'#b9f3ff':'#fff2de',large:critical});
    this.floats=this.floats.slice(-12);
    if(this.motion&&this.intense&&!dodge){this.shakeAt=now;this.shakePower=critical?4:2;this.holdTime=now;this.holdUntil=now+(critical?55:32);}
  }
  celebrate(kind='victory',now=performance.now()){
    this.burst(this.width*.5,this.height*.4,kind==='flow'?'#ffe2a0':'#f9bb7c',kind==='flow'?54:36,now);
    if(this.motion&&this.intense){this.shakeAt=now;this.shakePower=kind==='flow'?4:2;}
  }
  strikeBag(now=performance.now(),power=1){this.bagStrikes.push({time:now,power});this.bagStrikes=this.bagStrikes.slice(-5);}
  bag(now,reinforced){
    const c=this.ctx,w=this.width,h=this.height,x=this.layout.bagX,anchor=h*.055,width=Math.max(36,Math.min(100,w*(this.mobile?.15:.145))),top=h*.21,height=h*(this.mobile?.48:.58);
    this.bagStrikes=this.bagStrikes.filter(s=>now-s.time<2200);
    const swing=this.motion?this.bagStrikes.reduce((a,s)=>{const t=(now-s.time)/1000;return a+(t>=0?Math.sin(t*11)*Math.exp(-t*2.8)*s.power*.12:0);},0):0;
    c.save();c.translate(x,anchor);const leftLimit=this.mobile?w/2+34+8:w*.6;
    const clearance=Math.min(w-x-width*.6-8,x-leftLimit-width*.6);
    const safeAngle=Math.min(.28,Math.max(0,clearance/(top-anchor+height)));
    c.rotate(-Math.min(safeAngle,Math.max(-safeAngle,swing)));
    c.strokeStyle='#ada59b';c.lineWidth=2;
    for(const dx of [-width*.25,width*.25]){c.beginPath();c.moveTo(0,0);c.lineTo(dx,top-anchor+5);c.stroke();}
    for(let i=0;i<4;i++){const y=i*(top-anchor)/4;c.strokeStyle=i%2?'#d5b99d':'#716b6d';c.beginPath();c.moveTo(-3,y);c.lineTo(3,y+8);c.lineTo(-3,y+16);c.stroke();}
    c.translate(0,top-anchor);
    c.fillStyle=reinforced?'#694139':'#35404a';c.beginPath();c.moveTo(-width*.39,0);c.lineTo(width*.35,-2);c.lineTo(width*.5,12);c.lineTo(width*.49,height-13);c.lineTo(width*.3,height);c.lineTo(-width*.32,height);c.lineTo(-width*.5,height-13);c.lineTo(-width*.5,12);c.closePath();c.fill();
    c.fillStyle=reinforced?'#9b6150':'#52616a';c.beginPath();c.moveTo(-width*.39,0);c.lineTo(-width*.06,3);c.lineTo(-width*.13,height-4);c.lineTo(-width*.32,height);c.lineTo(-width*.5,height-13);c.lineTo(-width*.5,12);c.closePath();c.fill();
    c.fillStyle=reinforced?'#432a30':'#242b38';c.beginPath();c.moveTo(width*.35,-2);c.lineTo(width*.5,12);c.lineTo(width*.49,height-13);c.lineTo(width*.3,height);c.lineTo(width*.16,height-7);c.lineTo(width*.23,12);c.closePath();c.fill();
    for(const sy of [height*.15,height*.73]){c.fillStyle=reinforced?'#d7ad73':'#b45f46';c.fillRect(-width*.49,sy,width*.98,reinforced?11:8);c.fillStyle=reinforced?'#f2ce91':'#d48a62';c.fillRect(-width*.49,sy,width*.35,reinforced?11:8);}
    c.strokeStyle=reinforced?'#dfb47966':'#bf9a7c55';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(width*.14,18);c.lineTo(width*.12,height-12);c.stroke();c.setLineDash([]);
    c.fillStyle='#c5a487';c.font=Math.max(18,width*.34)+'px serif';c.textAlign='center';c.fillText(reinforced?'力':'心',-2,height*.52);
    if(reinforced){c.strokeStyle='#d1ae82';c.lineWidth=2;c.strokeRect(-width*.5-2,height*.15-2,width+4,15);c.strokeRect(-width*.5-2,height*.73-2,width+4,15);}
    c.restore();
  }
  burst(x,y,color,count,now){
    count=this.motion?(this.intense?count:Math.min(6,count)):0;
    for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=45+Math.random()*190;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-25,size:2+Math.random()*4,life:.3+Math.random()*.45,time:now,color,angle});}
    this.particles=this.particles.slice(-160);
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
    for(const p of this.particles){const t=(now-p.time)/1000;if(t<0)continue;const fade=1-t/p.life;
      c.save();c.translate(p.x+p.vx*t,p.y+p.vy*t+90*t*t);c.rotate(p.angle+t*3);c.globalAlpha=fade;c.fillStyle=p.color;
      c.beginPath();c.moveTo(-p.size,0);c.lineTo(p.size*2*fade,0);c.lineTo(0,p.size*.7);c.closePath();c.fill();c.restore();}
    this.floats=this.floats.filter(f=>now-f.time<800);
    for(const f of this.floats){const p=(now-f.time)/800;if(p<0)continue;c.save();c.globalAlpha=Math.min(1,(1-p)*3);c.fillStyle=f.color;c.shadowColor='#1a0f1c';c.shadowBlur=7;c.textAlign='center';c.font=`700 ${f.large?30:23}px "Space Grotesk",sans-serif`;c.fillText(f.text,f.x,f.y-(this.motion?p*40:0));c.restore();}
  }
  render(now,{upcomingMove='punch',arenaVisible=true,lit=false,playing=false,beatPhase=1,preparation=0,dance=false,musicalBeat=0,flow=false,tier=0,disciples=0,boss=false}={}){
    this.preparedMove=upcomingMove;
    const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);c.save();
    if(this.motion&&this.intense){const t=(now-this.shakeAt)/180;if(t>=0&&t<1)c.translate(Math.sin(t*43)*this.shakePower*(1-t),Math.cos(t*37)*this.shakePower*.5*(1-t));}
    c.fillStyle='#29232b';c.fillRect(0,0,w,h);
    const reveal=this.motion?Math.min(1,Math.max(0,(now-(this.litAt??-2000))/1200)):1;
    if(!lit || reveal<1 || !this.rooms[1].naturalWidth)this.drawRoom(this.rooms[0]);
    if(lit){c.save();c.globalAlpha=reveal;this.drawRoom(this.rooms[1]);c.restore();}
    c.fillStyle=boss?'#41172a25':'#130d170e';c.fillRect(0,0,w,h);
    if(arenaVisible && this.welcomeDisciple){this.arrivalAt=now;this.welcomeDisciple=false;}
    this.details(tier,now);this.trainees(now,disciples,playing?musicalBeat:.5);
    if(flow){const glow=c.createRadialGradient(w*.5,h*.7,0,w*.5,h*.7,w*.7);glow.addColorStop(0,'#ffc16c30');glow.addColorStop(1,'#ffc16c00');c.fillStyle=glow;c.fillRect(0,0,w,h);}
    if(playing&&beatPhase<.1&&this.motion){c.fillStyle=`rgba(246,153,75,${(.1-beatPhase)*.2})`;c.fillRect(0,0,w,h);}
    const height=Math.min(h*1.12,w*.84),y=h*.12,poseTime=now<this.holdUntil?this.holdTime:now;
    this.bag(now,boss);this.fighter(w*(this.mobile?.18:w<600?.34:.30),this.mobile?h*.34:y,height,'hero',poseTime,preparation,dance,musicalBeat);
    this.effects(now);c.restore();
  }
}
