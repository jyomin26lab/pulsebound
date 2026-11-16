import { TRACKS } from './audio.mjs';
import { songSettings } from './song-chart.mjs';
import { withDeadline } from './audio-import.mjs';
const originals=()=>Object.entries(TRACKS).map(([id,t])=>({id,title:t.title,bpm:t.bpm,offset:0,duration:t.duration,builtin:true}));
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
export class BrowserMusicStore {
  async open(){
    if(this.db)return this.db;
    if(!globalThis.indexedDB)throw Error('Stockage musical indisponible.');
    const opening=indexedDB.open('pulsebound-music-v1',1);
    opening.onupgradeneeded=()=>{opening.result.createObjectStore('audio',{keyPath:'id'});opening.result.createObjectStore('state');};
    this.db=await Promise.race([request(opening),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Stockage musical indisponible.')),3000);opening.addEventListener('success',()=>clearTimeout(timer),{once:true});opening.addEventListener('error',()=>clearTimeout(timer),{once:true});})]);
    this.db.onversionchange=()=>{this.db.close();this.db=null;};return this.db;
  }
  async load(){const db=await this.open(),tx=db.transaction(['audio','state']);const [records,queue]=await withDeadline(Promise.all([request(tx.objectStore('audio').getAll()),request(tx.objectStore('state').get('queue'))]),5000,'Le stockage musical ne répond pas.');return {records,queue};}
  async write({queue,record,removeId}){
    const db=await this.open(),tx=db.transaction(['audio','state'],'readwrite');
    const writing=new Promise((resolve,reject)=>{
      if(record)tx.objectStore('audio').put(record);if(removeId)tx.objectStore('audio').delete(removeId);
      tx.objectStore('state').put(queue,'queue');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Stockage plein.'));
    });
    try{return await withDeadline(writing,5000,'Le stockage musical ne répond pas.');}catch(error){try{tx.abort();}catch{}throw error;}
  }
}
export function moveItem(order,id,to){const from=order.indexOf(id);if(from<0||!Number.isInteger(to))return order.slice();const next=order.slice();next.splice(from,1);next.splice(Math.max(0,Math.min(next.length,to)),0,id);return next;}
export class MusicLibrary {
  constructor(store=new BrowserMusicStore()){this.store=store;this.all=new Map(originals().map(t=>[t.id,t]));this.order=[...this.all.keys()];this.selected=this.order[0];this.repeat=true;this.persistent=true;}
  get items(){return this.order.map(id=>this.all.get(id)).filter(Boolean);}
  get current(){return this.all.get(this.selected)||null;}
  async load(){
    try{
      const {records=[],queue}=await this.store.load();
      for(const row of records)if(row&&typeof row.id==='string'&&row.blob instanceof Blob&&Number.isFinite(row.duration)&&row.duration>=5&&row.duration<=1200&&Number.isFinite(row.bpm)&&row.bpm>=40&&row.bpm<=240)this.all.set(row.id,{...row,title:String(row.title).slice(0,180),offset:Math.max(0,Math.min(row.duration,Number(row.offset)||0)),chart:songSettings(row)});
      if(queue&&Array.isArray(queue.order)){this.order=[...new Set(queue.order)].filter(id=>this.all.has(id));this.selected=this.order.includes(queue.selected)?queue.selected:this.order[0]||null;this.repeat=queue.repeat!==false;}
      for(const row of queue?.originals||[])if(TRACKS[row.id]&&Number.isFinite(row.bpm)&&row.bpm>=40&&row.bpm<=240){Object.assign(this.all.get(row.id),{bpm:row.bpm,offset:Math.max(0,Math.min(120,Number(row.offset)||0)),chart:songSettings({...row,duration:120})});}
    }catch{this.persistent=false;}
    return this;
  }
  async persist(extra={}){try{await this.store.write({queue:{order:this.order,selected:this.selected,repeat:this.repeat,originals:[...this.all.values()].filter(t=>t.builtin).map(t=>({id:t.id,bpm:t.bpm,offset:t.offset,chart:t.chart}))},...extra});return true;}catch{this.persistent=false;return false;}}
  async add(record){if(!record?.id||this.all.has(record.id)||!(record.blob instanceof Blob))throw Error('Morceau invalide.');this.all.set(record.id,record);this.order.push(record.id);if(!this.selected)this.selected=record.id;return this.persist({record});}
  async addOriginal(id){if(!TRACKS[id]||this.order.includes(id))return false;this.order.push(id);if(!this.selected)this.selected=id;await this.persist();return true;}
  async select(id){if(!this.order.includes(id))return false;this.selected=id;await this.persist();return true;}
  async move(id,to){this.order=moveItem(this.order,id,to);await this.persist();}
  async remove(id){
    const index=this.order.indexOf(id);if(index<0)return null;
    const record=this.all.get(id);this.order.splice(index,1);if(this.selected===id)this.selected=this.order[Math.min(index,this.order.length-1)]||null;
    if(!record.builtin)this.all.delete(id);await this.persist({removeId:record.builtin?undefined:id});return {record,index};
  }
  async restore({record,index}){if(this.order.includes(record.id))return;this.all.set(record.id,record);this.order.splice(Math.min(index,this.order.length),0,record.id);if(!this.selected)this.selected=record.id;await this.persist(record.builtin?{}:{record});}
  next(direction=1){if(!this.order.length)return null;const index=this.order.indexOf(this.selected),next=index+direction;if(next>=0&&next<this.order.length)return this.order[next];return this.repeat?this.order[(next+this.order.length)%this.order.length]:null;}
}
