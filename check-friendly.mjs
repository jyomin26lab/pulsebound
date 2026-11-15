import assert from 'node:assert/strict';
import {gridFromTaps,alignBeat,nudgeConfig} from './dist/sync-help.mjs';
import {createSongChart} from './dist/song-chart.mjs';
import {SPRITES} from './dist/sprites/manifest.mjs';
import fs from 'node:fs';
const taps=Array.from({length:8},(_,i)=>70.13+i*.5+(i%2?.004:0)),config=gridFromTaps(taps);assert.ok(config);assert.ok(Math.abs(config.bpm-120)<2);assert.ok(config.offset<60/config.bpm,'Tapping at 70 s never makes a 70 s intro');
assert.equal(gridFromTaps([1,2]),null);assert.equal(gridFromTaps([0,1,1,2,3,4]),null);assert.equal(gridFromTaps([0,.3,1,1.3,2,2.3,3,3.3]),null);assert.equal(gridFromTaps([0,1,2,NaN,4,5]),null);
const base={version:1,source:'grid',bpm:120,offset:.1,segments:[]},aligned=alignBeat(base,[.1,.6,1.1,69.6,70.1,70.6],70.14,120);
assert.ok(Math.abs(aligned.offset-.14)<1e-8);assert.equal(base.offset,.1);assert.equal(nudgeConfig(base,-.5,120).offset,0);
const variable={...base,segments:[{time:10.1,bpm:180}]},moved=nudgeConfig(variable,.02,120);assert.ok(Math.abs(moved.segments[0].time-10.12)<1e-8);assert.equal(variable.segments[0].time,10.1);
const originalChart=createSongChart({duration:30,chart:variable}),movedChart=createSongChart({duration:30,chart:moved});
for(let i=0;i<originalChart.beats.length;i++)assert.ok(Math.abs(movedChart.beats[i]-originalChart.beats[i]-.02)<.00002,'Le calage déplace aussi les changements de tempo');
const chart=createSongChart({duration:120,bpm:120,chart:aligned});assert.ok(chart.beats[0]<.2);assert.ok(chart.beats.some(t=>Math.abs(t-70.14)<.001));
const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'No duplicate UI ids');assert.ok(html.indexOf('data-upgrade="power"')<html.indexOf('id="school-panel"'));
assert.ok(!ids.includes('session-score')&&!ids.includes('song-record'));assert.ok(ids.includes('session-coins')&&ids.includes('income-rate'));
for(const [id,meta]of Object.entries(SPRITES)){assert.ok(meta.hatWidth>200&&meta.cornerAlpha===0);const data=fs.readFileSync(new URL('./dist/sprites/'+id+'.png',import.meta.url));assert.equal(data.readUInt32BE(16),meta.width);assert.equal(data.readUInt32BE(20),meta.height);}
assert.equal(Object.keys(SPRITES).length,9);
console.log('UX : pièces au premier plan, calage à 70 s sans intro vide, validation, alignement local et 9 PNG séparés vérifiés.');
