import assert from 'node:assert/strict';
import fs from 'node:fs';
import { combatLayout, spritePlacement } from './dist/scene-layout.mjs';
import { HERO_SPRITES } from './dist/sprites/hero-manifest.mjs';
import { DojoScene } from './dist/scene.mjs';

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

// Exercise the actual scene renderer, including form transitions and desktop poses.
const poses=Object.fromEntries(Object.keys(HERO_SPRITES).map(id=>[id,{naturalWidth:268,naturalHeight:394,id}]));
for(const [width,height,mobile]of [[296,320,true],[366,420,true],[676,510,true],[350,410,false],[900,760,false]]){
  const scene=Object.create(DojoScene.prototype);
  Object.assign(scene,{width,height,mobile,poses,layout:combatLayout(width,height,mobile),motion:false,intense:false});
  scene.ctx={drawImage(image,sx,sy,sw,sh,x,y,w,h){
    assert.ok(arguments.length===9,'Toutes les poses passent par le même placement');
    assert.ok(x>=0 && x+w<=width+1e-8 && y>=0 && y+h<=height+1e-8);
  }};
  for(const kind of ['idle','punch','cross','kick','uppercut','hook','roundhouse','backfist','meiaLua','leapPunch','axeKick','cartwheel']){
    for(const progress of [.01,.1,.22,.4,.7,.85,.98]){
      scene.actions={hero:{kind,time:0,duration:1000}};
      scene.fighter(0,0,0,'hero',progress*1000);
    }
  }
}
console.log(placements+' cadrages validés pour 22 sprites, 286 largeurs, 24 hauteurs et deux dispositions.');
