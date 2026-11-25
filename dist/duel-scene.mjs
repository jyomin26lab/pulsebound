import { DojoScene, MOVES } from './scene.mjs';
import { combatLayout } from './scene-layout.mjs';

// Both fighters use Nova's poses; the rival is drawn in a mirrored space with the same layout, so one set of rules moves both.
const DISTANCE=3.1,BACK=1.5;// in body units, between their feet and behind them: guards almost touch, every strike steps in
function tinted(image,color){
  const c=document.createElement('canvas');c.width=c.naturalWidth=image.naturalWidth;c.height=c.naturalHeight=image.naturalHeight;
  const g=c.getContext('2d');g.drawImage(image,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c;
}
// The rival keeps Nova's drawing and shading, in violet only, so its pose reads as well as hers.
function shadowed(image){
  const c=tinted(image,'#0000'),g=c.getContext('2d');
  g.globalCompositeOperation='color';g.fillStyle='#6b4fb0';g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='multiply';g.fillStyle='#b3a3d6';g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='destination-in';g.drawImage(image,0,0);return c;
}
export class DuelScene extends DojoScene{
  constructor(canvas){
    super(canvas);
    this.rival=Object.create(this);this.rival.initState();// same stage, size and settings; its own strikes, particles and recoil
    this.rival.poses={};this.rival.flash={};this.flash={};this.rivalMove={};
    for(const [id,image]of Object.entries(this.poses))image.addEventListener('load',()=>{
      const shade=this.rival.poses[id]=shadowed(image);this.rival.flash[id]=tinted(shade,'#fff6e090');this.flash[id]=tinted(image,'#e0432f90');
    });
  }
  resize(){
    super.resize();const L=this.layout,w=this.width;
    const unit=Math.min(combatLayout(4000,this.height,this.mobile).unit,(w-2*L.left)/(2*BACK+DISTANCE)),heroX=(w-DISTANCE*unit)/2;
    this.layout={...L,unit,heroX,bagX:w-heroX,bagWidth:unit*1.1};
  }
  reset(){for(const actor of [this,this.rival]){actor.initState();actor.reaction=null;actor.koAt=0;}this.alertAt=-Infinity;}
  mirrored(draw){const c=this.ctx;c.save();c.translate(this.width,0);c.scale(-1,1);draw();c.restore();}
  /** On a narrow stage the longest techniques would pass through the opponent: a kick replaces them. */
  within(move){const L=this.layout;return this.contact(MOVES[move].pose).x-(L.bagX-L.bagWidth*.4)>L.unit*.5?'kick':move;}
  // A fighter with its recoil, its hit flash and its collapse; the pose and the step come from DojoScene.
  actor(actor,now,options){
    const c=this.ctx,L=this.layout,re=actor.reaction,since=re?(now-re.at)/1000:9,s=since-.05,k=this.motion&&s>0&&s<.6?Math.min(1,s/.05)*Math.exp(-s*8)*re.power:0;// after the hit-stop
    const fall=actor.koAt?this.motion?Math.min(1,Math.max(0,(now-actor.koAt)/650)):1:0,normal=actor.poses;
    const pulse=this.motion&&!actor.koAt?Math.sin(((options?.musicalBeat||0)%1)*Math.PI):0;// both bounce on the beat
    c.save();c.translate(L.heroX-L.unit*k*.5,L.bottom);c.rotate(-k*.1+fall*.1);c.scale(1-.006*pulse,1+.014*pulse-.15*fall);c.translate(-L.heroX,-L.bottom);
    if(re?.flash&&since<.08)actor.poses=actor.flash;
    DojoScene.prototype.fighter.call(actor,now,options);
    actor.poses=normal;c.restore();
  }
  // The rival stands where the bag hangs in the dojo.
  bag(now){
    this.swing.angle=this.rival.swing.angle=0;
    this.mirrored(()=>this.actor(this.rival,now,this.rivalMove));
  }
  fighter(now,options){this.actor(this,now,options);}
  effects(now){
    super.effects(now);this.mirrored(()=>super.effects.call(this.rival,now));
    const t=(now-this.alertAt)/550;if(!(t>=0&&t<1))return;
    const c=this.ctx,L=this.layout,size=L.unit*(1.1+(this.motion?Math.max(0,1-t*5)*.8:0)),x=L.bagX,y=Math.max(size*.62,L.bottom-L.unit*6);
    c.save();c.globalAlpha=Math.min(1,(1-t)*4);c.translate(x,y);c.fillStyle='#ff2f1f';c.strokeStyle='#fff';c.lineWidth=Math.max(2,L.unit*.06);c.beginPath();c.arc(0,0,size*.6,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#fff';c.font='900 '+Math.round(size*.9)+'px "Barlow Condensed",Impact,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('!',0,size*.04);c.restore();
  }
  react(actor,now,power,flash=true){actor.reaction={at:now,power,flash};}
  say(text,color,now,{x=this.width/2,y=this.height*.34,large=true}={}){this.floats.push({text,x,y,time:now,color,large});this.floats=this.floats.slice(-6);}
  /** Nova lands a strike on the rival. */
  strikeRival(options){this.hit(options);this.react(this.rival,options.now,options.grade==='perfect'?1:.6);}
  /** The rival's blow reaches Nova on its note, whatever the player did. */
  rivalBlow(move,now,interval,heavy=false){
    const c=this.rival.hit({move,now,interval,light:!heavy});this.blow={x:this.width-c.x,y:c.y};
  }
  /** A sudden blow is coming: a red mark bursts above the rival. */
  alert(now){this.alertAt=now;const L=this.layout;this.ring(L.bagX,L.bottom-L.unit*3.2,'#ff4a35',1.4,now);this.burst(L.bagX,L.bottom-L.unit*3.6,'#ff6a50',14,now,{spread:3});}
  guard(now,perfect,push=0){
    const {x,y}=this.blow;
    this.ring(x,y,'#2fb7b2',perfect?1.3:.7,now);this.burst(x,y,perfect?'#a9eee9':'#dff6f4',perfect?16:7,now,{spread:2.6});
    if(this.motion&&this.intense&&perfect)this.sparks.push({x,y,at:now,size:this.layout.unit*.6,color:'#d8fffb'});
    this.react(this,now,perfect?.12:.35,false);if(push)this.react(this.rival,now,push,push>1);
  }
  wound(now,heavy){
    const {x,y}=this.blow;
    this.react(this,now,heavy?2:1.1);this.burst(x,y,'#ff7a5c',heavy?26:12,now,{dir:Math.PI,spread:2.4});this.comboBreak(now);
    if(this.motion&&this.intense){this.shakeAt=now;this.shakePower=heavy?11:5;}
  }
  knockOut(actor,now){
    // Bent double, one hand on the ground: a fall to the floor would leave a phone's frame.
    actor.koAt=now;actor.strike={pose:'cartwheel-0',at:now-100,hold:Infinity,extend:0,recover:0,dx:-this.layout.unit,dy:0};this.focus={x:this.width/2,y:this.height*.5};
    this.burst(this.width/2,this.height*.45,'#ffe2a0',60,now);if(this.motion&&this.intense){this.shakeAt=now;this.shakePower=14;this.zoomAt=now;this.zoomPower=.12;}
  }
}
