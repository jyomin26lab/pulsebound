export const SAVE_KEY = 'pulsebound-save-v1';
export const UPGRADE_INFO = {
  power: { base: 3, growth: 1.28, max: 100 },
  echo: { base: 5, growth: 1.15, max: 100 },
  adept: { base: 65, growth: 1.18, max: 100 },
  master: { base: 550, growth: 1.19, max: 100 },
  focus: { base: 12, growth: 1.75, max: 8 },
  fury: { base: 24, growth: 1.5, max: 20 }
};
export const PRODUCERS = {
  echo: { name:'Disciples', singular:'Disciple', dps:3, income:.1, unlock:1, symbol:'一', description:'La relève du dojo. Chaque disciple rapporte 0,1 pièce par seconde.' },
  adept: { name:'Adeptes', singular:'Adepte', dps:18, income:1, unlock:5, symbol:'二', description:'Chaque adepte rapporte 1 pièce par seconde.' },
  master: { name:'Maîtres', singular:'Maître', dps:130, income:8, unlock:10, symbol:'三', description:'Chaque maître rapporte 8 pièces par seconde.' }
};
export const MILESTONES=[10,25,50,100];
export const ACHIEVEMENTS=[
  {id:'first',name:'Premier impact',text:'Briser ton premier sac',reward:0.15,test:s=>s.kills>=1},
  {id:'school',name:'La relève',text:'Recruter un disciple',reward:0.35,test:s=>s.upgrades.echo>=1},
  {id:'combo',name:'Dans le flow',text:'Enchaîner 20 actions réussies',reward:0.8,test:s=>s.bestCombo>=20},
  {id:'boss',name:'Briser le silence',text:'Briser un sac renforcé',reward:1.0,test:s=>s.bosses>=1},
  {id:'flow',name:'Incandescence',text:'Déclencher le Flow',reward:1.2,test:s=>s.flows>=1},
  {id:'ten',name:'Une véritable école',text:'Recruter 10 disciples',reward:2.5,test:s=>s.upgrades.echo>=10},
  {id:'hundred',name:'La précision du geste',text:'Réussir 100 frappes parfaites',reward:1.5,test:s=>s.perfects>=100},
  {id:'master',name:'La transmission',text:'Recruter un maître',reward:5.0,test:s=>s.upgrades.master>=1},
  {id:'legacy',name:'Un nouveau départ',text:'Transmettre ton dojo',reward:1.0,test:s=>s.prestiges>=1}
];
export function freshState(now = Date.now()) {
  return { version: 1, dojoLit: false, coins: 0, stage: 1, hp: enemyHealth(1), kills: 0,
    hits: 0, perfects: 0, dodges: 0, dodgesMissed: 0, bestCombo: 0, totalCoins: 0, totalDamage: 0,
    runCoins:0, highestStage:1, bosses:0, flows:0, seals:0, prestiges:0, achievements:[],
    upgrades: { power: 0, echo: 0, adept:0, master:0, focus: 0, fury: 0 }, savedAt: now };
}
export function rival(stage){
  const boss=stage%5===0;return {kind:'bag',name:boss?'SAC RENFORCÉ':'SAC DE FRAPPE',hint:boss?'ÉPREUVE · RÉCOMPENSE ×4':'',boss};
}
export function enemyHealth(stage) { return Math.round(90 * Math.pow(1.16, stage - 1)*Math.pow(1.08,Math.max(0,stage-5))*(stage%5===0?3:1)); }
export function enemyReward(stage) { return (5 + Math.min(stage-1,95)) * (stage%5===0?4:1) / 100; }
export function legacyMultiplier(s){return 1+(s.seals||0)*.2;}
export function attackPower(s) { return (8 + s.upgrades.power * 4)*legacyMultiplier(s); }
export function producerMultiplier(level){return 2**MILESTONES.filter(n=>level>=n).length;}
export function producerPower(s,key){const p=PRODUCERS[key];return p?s.upgrades[key]*p.dps*producerMultiplier(s.upgrades[key])*(1+s.upgrades.power*.08)*legacyMultiplier(s):0;}
export function autoPower(s) { return Object.keys(PRODUCERS).reduce((sum,key)=>sum+producerPower(s,key),0); }
export function producerIncome(s,key){const p=PRODUCERS[key];return p?s.upgrades[key]*p.income*producerMultiplier(s.upgrades[key])*legacyMultiplier(s):0;}
export function autoIncome(s){return Object.keys(PRODUCERS).reduce((sum,key)=>sum+producerIncome(s,key),0.1);}
export function earnPassive(s,seconds,boost=false){
  if(!Number.isFinite(seconds)||seconds<=0)return 0;
  const amount=autoIncome(s)*seconds*(boost?3:1);addCoins(s,amount);return amount;
}
export function producerUnlocked(s,key){return !!PRODUCERS[key]&&s.highestStage>=PRODUCERS[key].unlock;}
export function upgradeCost(s, key) {
  const spec = UPGRADE_INFO[key];if(!spec)return Infinity;
  return s.upgrades[key] >= spec.max ? Infinity : Math.ceil(100 * spec.base * Math.pow(spec.growth, s.upgrades[key])) / 100;
}
export function buyUpgrade(s, key) {
  if (!Object.hasOwn(UPGRADE_INFO, key)) return false;
  if(PRODUCERS[key]&&!producerUnlocked(s,key))return false;
  const cost = upgradeCost(s, key);
  if (s.coins < cost || !Number.isFinite(cost)) return false;
  s.coins -= cost;
  s.upgrades[key]++;
  return true;
}
export function addCoins(s, amount) { if(!Number.isFinite(amount)||amount<=0)return;s.coins=Math.min(1e30,s.coins+amount);s.totalCoins=Math.min(1e30,s.totalCoins+amount);s.runCoins=Math.min(1e30,(s.runCoins||0)+amount); }
export function damageEnemy(s, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  let defeats = 0;
  s.totalDamage = Math.min(1e30,s.totalDamage+amount);
  while (amount >= s.hp && defeats<500) {
    amount -= s.hp;
    addCoins(s, enemyReward(s.stage));
    if(s.stage%5===0)s.bosses++;
    s.kills++;
    s.stage=Math.min(500,s.stage+1);s.highestStage=Math.max(s.highestStage,s.stage);
    s.hp = enemyHealth(s.stage);
    defeats++;
  }
  s.hp = Math.max(Number.EPSILON, s.hp - amount);
  return defeats;
}
export function judgeTiming(seconds, bpm, offset = 0, calibrationMs = 0, focus = 0) {
  const period = 60 / bpm;
  const position = (seconds - offset - calibrationMs / 1000) / period;
  const beat = Math.round(position);
  const error = (position - beat) * period * 1000;
  const perfectWindow = Math.min(65 + focus * 6, period * 1000 * 0.23);
  const goodWindow = Math.min(145 + focus * 4, period * 1000 * 0.43);
  return { beat, error, grade: Math.abs(error) <= perfectWindow ? 'perfect' : Math.abs(error) <= goodWindow ? 'good' : 'miss' };
}
export function hitDamage(s, grade, combo, random = Math.random()) {
  const critical = grade !== 'miss' && random < 0.05 + s.upgrades.fury * 0.025;
  const multiplier = grade === 'perfect' ? 2.7 : grade === 'good' ? 1.4 : 0.25;
  return { damage: Math.round(attackPower(s) * multiplier * (1 + Math.min(combo, 50) * 0.025) * (critical ? 2 : 1)), critical };
}
export function claimAchievements(s){
  const earned=[];
  for(const a of ACHIEVEMENTS)if(!s.achievements.includes(a.id)&&a.test(s)){s.achievements.push(a.id);addCoins(s,a.reward);earned.push(a);}
  return earned;
}
export function dojoTier(s){return Math.min(3,(s.highestStage>=6?1:0)+(s.upgrades.echo>=10?1:0)+(s.upgrades.master>0||s.prestiges>0?1:0));}
export function prestigeGain(s){return s.stage>=21?Math.floor(Math.sqrt(s.runCoins/12000)):0;}
export function prestige(s,now=Date.now()){
  const gain=prestigeGain(s);if(gain<1)return 0;
  s.seals+=gain;s.prestiges++;s.coins=0;s.runCoins=0;s.stage=1;s.hp=enemyHealth(1);s.savedAt=now;
  for(const key of Object.keys(UPGRADE_INFO))s.upgrades[key]=0;
  s.upgrades.power=1;if(s.seals>=3)s.upgrades.echo=1;
  return gain;
}
export function currentGoal(s){
  if(!s.upgrades.echo)return {label:'Accueille ton premier disciple',detail:'Il s’entraîne avec toi · +0,1 pièce / s',current:s.coins,target:upgradeCost(s,'echo'),action:'dojo'};
  if(!s.upgrades.power)return {label:'Ton premier coup de maître',detail:'Améliore tes poings',current:s.coins,target:upgradeCost(s,'power'),action:'dojo'};
  if(s.highestStage<6)return {label:'Ouvre la cour du dojo',detail:'Brise le sac renforcé de la série 5',current:s.stage-1,target:5,action:'combat'};
  if(!s.upgrades.adept)return {label:'La cour est ouverte',detail:'Recrute ton premier adepte',current:s.coins,target:upgradeCost(s,'adept'),action:'dojo'};
  if(s.upgrades.echo<10)return {label:'Une école prend vie',detail:'10 disciples : leurs revenus ×2',current:s.upgrades.echo,target:10,action:'dojo'};
  if(s.highestStage<11)return {label:'La prochaine épreuve t’attend',detail:'Brise le sac renforcé de la série 10',current:s.stage-1,target:10,action:'combat'};
  if(!s.upgrades.master)return {label:'Transmets tes techniques',detail:'Recrute ton premier maître',current:s.coins,target:upgradeCost(s,'master'),action:'dojo'};
  if(prestigeGain(s)>0)return {label:'Une nouvelle école peut naître',detail:`Transmission : +${prestigeGain(s)} sceau${prestigeGain(s)>1?'x':''} permanent${prestigeGain(s)>1?'s':''}`,current:1,target:1,action:'legacy'};
  const next=Math.min(500,Math.ceil(s.stage/5)*5);
  return {label:'Écris la légende de ton école',detail:`Prochaine épreuve : série ${next}`,current:s.stage-1,target:next,action:'combat'};
}
export function beatAction(beat) { return beat >= 0 && beat % 8 === 7 ? 'dodge' : 'punch'; }
export function actionOutcome(action, expected, grade, guard, riposte = false) {
  if (action === expected && grade !== 'miss') {
    return expected === 'dodge'
      ? { success: true, guard: Math.min(3, guard + (grade === 'perfect' ? 1 : 0)), riposte: true, damageMultiplier: 0, staggered: false }
      : { success: true, guard, riposte: false, damageMultiplier: riposte ? 1.6 : 1, staggered: false };
  }
  const nextGuard = expected === 'dodge' ? guard - 1 : guard;
  return { success: false, guard: nextGuard <= 0 ? 3 : nextGuard, riposte: false, damageMultiplier: 0, staggered: nextGuard <= 0 };
}
export function restoreState(raw, now = Date.now()) {
  const s = freshState(now);
  if (!raw || raw.version !== 1) return s;
  for (const key of ['coins', 'kills', 'hits', 'perfects', 'dodges', 'dodgesMissed', 'bestCombo', 'totalCoins', 'totalDamage','runCoins','bosses','flows','seals','prestiges']) {
    if (Number.isFinite(raw[key]) && raw[key] >= 0) s[key] = Math.min(raw[key], 1e30);
  }
  s.dojoLit = raw.dojoLit === true;
  s.stage = Number.isInteger(raw.stage) ? Math.max(1, Math.min(500, raw.stage)) : 1;
  s.highestStage=Number.isInteger(raw.highestStage)?Math.max(s.stage,Math.min(500,raw.highestStage)):s.stage;
  for(const key of ['bosses','flows','seals','prestiges'])s[key]=Math.floor(Math.min(key==='seals'?1e6:1e12,s[key]));
  if(!Number.isFinite(raw.runCoins))s.runCoins=s.totalCoins;
  if(!Number.isFinite(raw.bosses))s.bosses=Math.floor((s.stage-1)/5);
  s.achievements=Array.isArray(raw.achievements)?ACHIEVEMENTS.filter(a=>raw.achievements.includes(a.id)).map(a=>a.id):[];
  s.hp = Number.isFinite(raw.hp) && raw.hp > 0 ? Math.min(raw.hp, enemyHealth(s.stage)) : enemyHealth(s.stage);
  for (const key of Object.keys(UPGRADE_INFO)) {
    const level = raw.upgrades?.[key];
    if (Number.isInteger(level)) s.upgrades[key] = Math.max(0, Math.min(UPGRADE_INFO[key].max, level));
  }
  s.savedAt = Number.isFinite(raw.savedAt) ? Math.min(now, Math.max(0, raw.savedAt)) : now;
  return s;
}
export function offlineReward(s, now = Date.now()) {
  const elapsed = Math.min(8 * 3600, Math.max(0, (now - s.savedAt) / 1000));
  // Absence uses the same regular income, without simulating bags or temporary Flow bonuses.
  const reward = Math.floor(autoIncome(s) * elapsed * 100) / 100;
  if (reward) addCoins(s, reward);
  s.savedAt = now;
  return { reward, seconds: elapsed };
}

// Onset autocorrelation estimates a regular beat grid; syncopation can imply half/double tempo.
export function estimateTempo(samples, sampleRate) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate < 4000) return null;
  const hop = Math.max(1, Math.round(sampleRate / 200));
  const rate = sampleRate / hop;
  const count = Math.floor(samples.length / hop);
  if (count < rate * 5) return null;
  const onset = new Float32Array(count);
  let previous = 0, bass = 0, peak = 0;
  const alpha = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let i = 0; i < count; i++) {
    let energy = 0, bassEnergy = 0;
    for (let j = 0; j < hop; j++) {
      const v = samples[i * hop + j];
      bass += alpha * (v - bass);
      energy += v * v;
      bassEnergy += bass * bass;
    }
    const level = Math.log(1 + 1000 * (energy + bassEnergy * 3) / hop);
    onset[i] = Math.max(0, level - previous);
    peak = Math.max(peak, onset[i]);
    previous = level;
  }
  if (peak < 0.015) return null;
  let active = 0;
  for (let i = 0; i < count; i++) { onset[i] = Math.max(0, onset[i] - peak * 0.045); active += onset[i]; }
  if (active < 0.1) return null;
  const scores = [];
  for (let lag = Math.floor(rate * 60 / 195); lag <= Math.ceil(rate * 60 / 68); lag++) {
    let product = 0, normA = 0, normB = 0;
    for (let i = lag; i < count; i++) {
      product += onset[i] * onset[i - lag];
      normA += onset[i] ** 2;
      normB += onset[i - lag] ** 2;
    }
    scores[lag] = product / Math.sqrt(normA * normB || 1);
  }
  let bestLag = 0, bestScore = 0;
  for (let lag = 1; lag < scores.length; lag++) {
    if (!Number.isFinite(scores[lag])) continue;
    const bpm = 60 * rate / lag;
    const preference = bpm >= 90 && bpm <= 160 ? 1.035 : 1;
    const score = (scores[lag] + (scores[lag * 2] || 0) * 0.16) * preference;
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  if (bestScore < 0.06) return null;
  if (60 * rate / bestLag < 95) {
    const half = Math.round(bestLag / 2);
    if (Math.max(scores[half - 1] || 0, scores[half] || 0, scores[half + 1] || 0) > scores[bestLag] * 0.55) bestLag = half;
  }
  const a = scores[bestLag - 1] || 0, b = scores[bestLag], c = scores[bestLag + 1] || 0;
  const correction = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / (a - 2 * b + c || 1)));
  const bpm = Math.round(60 * rate / (bestLag + correction) * 10) / 10;
  const period = 60 / bpm;
  const bins = Math.round(period * rate);
  const phases = new Float32Array(bins);
  for (let i = 0; i < count; i++) phases[Math.round((i / rate % period) / period * bins) % bins] += onset[i];
  let phase = 0, strongest = 0;
  for (let i = 0; i < bins; i++) {
    const value = phases[i] + (phases[(i + 1) % bins] + phases[(i + bins - 1) % bins]) * 0.6;
    if (value > strongest) { strongest = value; phase = i; }
  }
  return { bpm, offset: phase / bins * period, confidence: Math.min(0.99, b), };
}
