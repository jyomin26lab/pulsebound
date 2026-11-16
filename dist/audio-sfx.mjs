export const IMPACT_STYLES = {
  leather: {label: 'Coup sec'},
  taiko: {label: 'Taiko'},
};

// Each contact excites short, independently damped resonances.
const taiko = {length: .25, modes: [[96,.68,19],[173,.34,36],[339,.21,57],[1250,.13,130]], noise: .22};

/** Short layered leather impact: transient, filtered grit, body, sub. */
function leatherSamples(sampleRate,{critical=false,perfect=true,variant=0,seed=71}={}){
  if(!Number.isFinite(sampleRate)||sampleRate<8000)throw new RangeError('Fréquence audio invalide.');
  const duration=critical?.24:.17,data=new Float32Array(Math.ceil(sampleRate*duration));
  let phase=0,low=0,band=0,rng=seed>>>0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;const noise=rng/2147483648-1;
    low+=.085*(noise-low);band+=.43*(noise-band);
    const pitch=(critical?168:145)+variant*7;phase+=2*Math.PI*(46+(pitch-46)*Math.exp(-t*38))/sampleRate;
    const attack=1-Math.exp(-t*3200),tail=Math.max(0,1-t/duration);
    const body=Math.sin(phase)*Math.exp(-t*(critical?17:23))*.61;
    const grit=(band-low)*Math.exp(-t*47)*(critical?.76:.56);
    const snap=(noise-band)*Math.exp(-t*240)*(perfect?.26:.15);
    const sub=critical?Math.sin(2*Math.PI*48*t)*Math.exp(-t*20)*.18:0;
    data[i]=Math.tanh((body+grit+snap+sub)*1.28)*.84*attack*tail;
  }
  return data;
}
export function impactSamples(sampleRate, {style='leather', critical=false, perfect=false, variant=0, seed=71}={}) {
  if (!Number.isFinite(sampleRate) || sampleRate<8000) throw new RangeError('Fréquence audio invalide.');
  if(style !== 'taiko') return leatherSamples(sampleRate,{critical,perfect,variant,seed});
  const profile = taiko;
  const duration = profile.length * (critical ? 1.22 : 1);
  const data = new Float32Array(Math.ceil(sampleRate*duration));
  const tuning = (1 + (variant-1)*.018) * (critical ? .95 : 1);
  let rng = seed >>> 0, previousNoise = 0, peak = .001;
  for (let i=0; i<data.length; i++) {
    const t = i/sampleRate;
    rng = (Math.imul(rng,1664525)+1013904223)>>>0;
    const noise = rng/2147483648-1;
    let signal = (noise-previousNoise)*profile.noise*Math.exp(-t*(perfect?780:510));
    previousNoise = noise;
    for (const [hz,weight,decay] of profile.modes) {
      signal += weight*Math.sin(2*Math.PI*hz*tuning*t)*Math.exp(-decay*t/(critical?1.22:1));
    }
    const attack = 1-Math.exp(-t*(perfect?8500:4700));
    data[i] = signal*attack*Math.min(1,(duration-t)/.005);
    peak = Math.max(peak,Math.abs(data[i]));
  }
  for (let i=0; i<data.length; i++) data[i] *= .8/peak;
  return data;
}
export function freestyleInterval(time,last){return Number.isFinite(last)?Math.max(.085,Math.min(.5,time-last)):.3;}
/** Stereo impulse response of a small wooden dojo: pre-delay, a few early reflections, then a tail that darkens as it decays. */
export function reverbImpulse(sampleRate,seconds=1.6,seed=7){
  if(!Number.isFinite(sampleRate)||sampleRate<8000)throw new RangeError('Fréquence audio invalide.');
  const length=Math.ceil(sampleRate*seconds),preDelay=Math.round(sampleRate*.012),channels=[new Float32Array(length),new Float32Array(length)];
  const taps=[[.011,.5],[.023,.36],[.037,.27],[.053,.2],[.071,.14]];
  channels.forEach((data,side)=>{
    let rng=(seed+side*977)>>>0,low=0;
    for(let i=preDelay;i<length;i++){
      const t=(i-preDelay)/sampleRate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;
      const noise=rng/2147483648-1,damping=Math.max(.04,.75*Math.exp(-t*2.2));// one-pole lowpass closes over time: warm wood, not metal
      low+=damping*(noise-low);data[i]=low*Math.exp(-t*3.4)*(1-t/seconds)*.55;
    }
    for(const [time,gain]of taps){const at=preDelay+Math.round(sampleRate*(time+side*.0035));if(at<length)data[at]+=gain*(side?.9:1);}
  });
  return channels;
}
