import assert from 'node:assert/strict';
import fs from 'node:fs';
import { combatLayout, spritePlacement } from './dist/scene-layout.mjs';
import { HERO_SPRITES } from './dist/sprites/hero-manifest.mjs';
import { DojoScene, MOVES } from './dist/scene.mjs';

let placements=0;
for(let width=280;width<=2560;width+=8){
  for(let height=220;height<=1100;height+=37){
    for(const centered of [true,false]){
      const layout=combatLayout(width,height,centered);
      for(const [id,sprite] of Object.entries(HERO_SPRITES)){
        const box=spritePlacement(id,layout);
        assert.ok(box.width>0 && box.height>0);
        assert.ok(box.x>=layout.left-1e-8 && box.x+box.width<=layout.right+1e-8,id+' déborde horizontalement');
        assert.ok(box.y>=layout.top-1e-8 && box.y+box.height<=layout.bottom+1e-8,id+' déborde verticalement');
        assert.ok(Math.abs(box.width/box.sw*sprite.unit-layout.unit)<1e-8,'Échelle anatomique commune');
        assert.ok(fs.existsSync(new URL('./dist/sprites/'+sprite.file,import.meta.url)));
        placements++;
      }
    }
  }
}

// Exercise the actual scene renderer: every technique reaches the bag on the input frame, on phones and desktops.
const poses=Object.fromEntries(Object.keys(HERO_SPRITES).map(id=>[id,{naturalWidth:268,naturalHeight:394,id}]));
let contacts=0;
for(const [width,height,phone]of [[280,300,true],[296,320,true],[320,380,true],[366,420,true],[390,450,true],[676,510,true],[350,410,false],[466,370,false],[900,520,false],[1400,600,false]]){
  for(const motion of [false,true]){
    const scene=Object.create(DojoScene.prototype);scene.initState();
    Object.assign(scene,{width,height,mobile:phone,poses,layout:combatLayout(width,height,phone),motion,intense:false});
    scene.ctx={drawImage(image,sx,sy,sw,sh,x,y,w,h){
      assert.ok(arguments.length===9,'Toutes les poses passent par le même placement');
      assert.ok(x>=0 && x+w<=width+1e-8 && y>=0 && y+h<=height+1e-8,'Nova reste dans la scène');
    },save(){},restore(){}};
    // The first students stand beside Nova or beyond the bag, never hidden behind him.
    for(const spot of scene.traineeSpots(2))assert.ok(spot.x>=scene.layout.left&&spot.x<=scene.layout.right&&(spot.x<scene.layout.heroX||spot.x>scene.layout.bagX),'Premiers élèves visibles ('+width+'×'+height+')');
    for(const [move,spec] of Object.entries(MOVES)){
      scene.swing={angle:motion?(contacts%3-1)*.15:0,velocity:0};
      const now=1000+contacts*500,c=scene.hit({move,now,interval:.4});
      scene.fighter(now);
      assert.equal(scene.drawn.id,spec.pose,move+' : le contact est dessiné dès l’input');
      const edge=scene.bagEdge(c.y),tolerance=scene.layout.bagWidth*.25;
      // Without motion the bag cannot be shoved, so a strike that had to stop at the lane may sink a little deeper.
      assert.ok(c.x>=edge-1,move+' s’arrête avant le sac ('+width+'×'+height+')');
      if(motion||c.fit)assert.ok(c.x<=edge+tolerance,move+' traverse le sac ('+width+'×'+height+')');
      for(const t of [10,60,140,260,420,700])scene.fighter(now+t,{preparation:t/700,upcomingMove:'kick',dance:true,musicalBeat:t/300});
      contacts++;
    }
  }
}
console.log(placements+' cadrages validés pour 22 sprites, 286 largeurs, 24 hauteurs et deux dispositions ; '+contacts+' contacts poing/pied sur le bord du sac.');
