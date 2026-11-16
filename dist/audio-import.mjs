export function withDeadline(operation,milliseconds,message,signal){
  return new Promise((resolve,reject)=>{
    let timer,finished=false;
    const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('Import annulé.','AbortError'));
    Promise.resolve(operation).then(value=>finish(null,value),error=>finish(error));
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>finish(new Error(message)),milliseconds);
  });
}

export async function decodeMusicFile(context,file,{signal,timeoutMs=30000}={}){
  if(!file||!Number.isFinite(file.size)||file.size===0)throw Error('Fichier vide. Télécharge le morceau dans Fichiers avant de le choisir.');
  if(file.size>80*1024*1024)throw Error('80 Mo maximum par son.');
  if(!file.type?.startsWith('audio/')&&!/\.(mp3|wav|wave|ogg|m4a|flac|aac|opus|aif|aiff|caf|mp4)$/i.test(file.name))throw Error('Choisis un fichier audio MP3, M4A ou WAV depuis Fichiers.');
  return decodeAudioBlob(context,file,{signal,timeoutMs});
}

export async function decodeAudioBlob(context,file,{signal,timeoutMs=30000}={}){
  const bytes=await withDeadline(file.arrayBuffer(),timeoutMs,'Lecture du fichier trop longue. Télécharge-le sur l’iPhone depuis Fichiers, puis réessaie.',signal);
  const decoding=Promise.resolve().then(()=>context.decodeAudioData(bytes)).catch(()=>{throw Error('Audio illisible dans ce navigateur. Essaie un MP3, M4A ou WAV non protégé.');});
  const buffer=await withDeadline(decoding,timeoutMs,'Le décodage n’a pas abouti. Essaie un fichier plus court en MP3 ou M4A.',signal);
  if(!Number.isFinite(buffer?.duration)||buffer.duration<5||buffer.duration>1200)throw Error('Durée : 5 secondes à 20 minutes.');
  return buffer;
}
