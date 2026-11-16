import { ANALYSIS_VERSION } from './song-chart.mjs';
import { withDeadline } from './audio-import.mjs';

export async function analyzeSong(buffer,onProgress=()=>{},{signal}={}){
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Offline)throw Error('Analyse audio indisponible dans ce navigateur. La grille manuelle reste disponible.');
  const sampleRate=11025,offline=new Offline(1,Math.ceil(buffer.duration*sampleRate),sampleRate),source=offline.createBufferSource();
  source.buffer=buffer;source.connect(offline.destination);source.start();onProgress(0);
  const prepared=await withDeadline(offline.startRendering(),30000,'Préparation audio trop longue. Tu peux utiliser la grille manuelle.',signal),samples=prepared.getChannelData(0).slice();
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./bpm-worker.mjs',import.meta.url),{type:'module'});
    const finish=(error,result)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve({...result,version:ANALYSIS_VERSION});};
    const timer=setTimeout(()=>finish(Error('Analyse trop longue. Tu peux régler la grille dans l’éditeur.')),120000);
    const abort=()=>finish(new DOMException('Import annulé.','AbortError'));
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{if(Number.isFinite(data.progress))onProgress(data.progress);else if(data.error)finish(Error(data.error));else finish(null,data.result);};
    worker.onerror=()=>finish(Error('Analyse indisponible. Utilise le BPM et le décalage manuels.'));
    worker.postMessage({samples,sampleRate},[samples.buffer]);
  });
}
