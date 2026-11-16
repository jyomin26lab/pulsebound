import { analyzeTrack } from './rhythm.mjs';
import { estimateTempo } from './core.mjs';
import { waveformPeaks } from './song-chart.mjs';
self.onmessage = ({ data }) => {
  try { const result=data.mode==='tempo'?{tempo:estimateTempo(data.samples,data.sampleRate)}:analyzeTrack(data.samples, data.sampleRate, progress=>self.postMessage({progress}));self.postMessage({result:{...result,waveform:waveformPeaks(data.samples)}}); }
  catch { self.postMessage({ error: 'Tempo indisponible. Tu peux le régler manuellement.' }); }
};
