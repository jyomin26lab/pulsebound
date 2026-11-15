import assert from 'node:assert/strict';
import {DeviceCalibration} from './dist/device-calibration.mjs';
const elements=new Map();
function element(id){
  if(!elements.has(id))elements.set(id,{open:true,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});
  return elements.get(id);
}
globalThis.document={hidden:false,querySelector:element,addEventListener(){}};
let clock=0;
const sources=[];
const audio={ctx:{currentTime:0,state:'running',createGain:()=>({gain:{},connect(){},disconnect(){}})},master:{},init:async()=>{},pause(){},clock:{outputContextTimeAt:timestamp=>clock||timestamp/1000},tone(at){const voice={at,stop(){this.stopped=true;}};sources.push(voice);return voice;}};
let applied=null;
const calibration=new DeviceCalibration(audio,value=>applied=value);
try{
  await calibration.start();
  assert.equal(sources.length,16);
  for(let i=4;i<16;i++)calibration.tap((.5+i*.6+.08)*1000);
  calibration.tap((.5+15*.6+.09)*1000);
  assert.equal(calibration.samples.size,12,'Une tape par clic, échauffement exclu');
  clock=20;calibration.tick();
  assert.equal(calibration.result.offset,80);
  assert.equal(applied,null,'Le calage attend le bouton Appliquer');
  element('#apply-calibration').listeners.click();assert.equal(applied,80);
  assert.equal(calibration.running,false);
  clock=0;await calibration.start();element('#settings-dialog').listeners.close();
  assert.equal(calibration.running,false);assert(sources.every(source=>source.stopped));
}finally{calibration.stop();delete globalThis.document;}
console.log('Calibrage guidé : taps, résultat, application et fermeture sans audio résiduel vérifiés.');
