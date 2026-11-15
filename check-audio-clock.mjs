import assert from 'node:assert/strict';
import { AudioClock } from './dist/audio-clock.mjs';
import { BeatConductor } from './dist/beat-conductor.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const context={currentTime:10,state:'running',getOutputTimestamp:()=>({contextTime:10.4,performanceTime:1000})};
const clock=new AudioClock(context);
clock.start({at:10.1,duration:20});context.currentTime=10.05;close(clock.position,0);assert.equal(clock.started,false);
context.currentTime=10.5;close(clock.position,.4);close(clock.contextTimeFor(1),11.1);close(clock.outputPositionAt(1000),.3);
context.state='suspended';close(clock.outputPositionAt(100000),.4);assert.equal(clock.started,false);context.state='running';
close(clock.pause(),.4);context.currentTime=50;close(clock.position,.4);close(clock.outputPositionAt(90000),.4);
clock.start({at:50.1});context.currentTime=50.05;close(clock.position,.4);context.currentTime=50.6;close(clock.position,.9);
clock.stop();close(clock.position,0);assert.equal(clock.contextTimeFor(1),null);
assert.throws(()=>clock.start({position:-1}),RangeError);
assert.throws(()=>clock.start({position:2,duration:1}),RangeError);
clock.start({at:50.6,position:0,duration:1});context.currentTime=100;close(clock.position,1);

const dsp={currentTime:0,state:'running'},master=new AudioClock(dsp),conductor=new BeatConductor(master);
const beats=[],halves=[],scheduled=[],resync=[];
conductor.on('beat',e=>beats.push(e));conductor.on('halfbeat',e=>halves.push(e));conductor.on('schedule',e=>scheduled.push(e));conductor.on('resync',e=>resync.push(e));
master.start({at:.1});conductor.poll();assert.equal(beats.length,0);close(scheduled[0].contextTime,.1);
dsp.currentTime=.1;conductor.poll();conductor.poll();assert.equal(beats.length,1);assert.equal(beats[0].index,0);
dsp.currentTime=.36;conductor.poll();assert.equal(halves.length,1);close(halves[0].songTime,.25);close(halves[0].lateBy,.01);
master.pause();conductor.poll();dsp.currentTime=12;conductor.poll();assert.equal(beats.length,1);
master.start({at:12.1});dsp.currentTime=12.1;conductor.poll();assert.equal(halves.length,1,'Pas de doublon après pause/reprise');
dsp.currentTime=12.34;conductor.poll();assert.equal(beats.length,2);close(beats[1].songTime,.5);

master.stop();dsp.currentTime=0;master.start();conductor.setBeatMap({beats:[.13,.63,1.1],duration:1.5,bpm:120});
dsp.currentTime=.13;conductor.poll();close(beats.at(-1).songTime,.13);
dsp.currentTime=.38;conductor.poll();close(halves.at(-1).songTime,.38);
assert.throws(()=>conductor.setBeatMap({beats:[.5,.3]}),TypeError);
conductor.setBeatMap({beats:[],bpm:120});const count=beats.length;dsp.currentTime=1;conductor.poll();assert.equal(beats.length,count);

master.stop();dsp.currentTime=0;master.start();conductor.setBeatMap({bpm:120});conductor.poll();
dsp.currentTime=3600;conductor.poll();assert.ok(resync.at(-1).skipped>10000);
assert.equal(beats.at(-1).index,7200);close(beats.at(-1).songTime,3600);close(beats.at(-1).contextTime,3600);
const stable=beats.length;conductor.poll();assert.equal(beats.length,stable,'Aucune dérive ni répétition au même instant DSP');
conductor.dispose();
console.log('Horloge DSP : départ différé, pause/reprise, sortie audio, beats/demi-beats, rattrapage et 1 h sans dérive validés.');
