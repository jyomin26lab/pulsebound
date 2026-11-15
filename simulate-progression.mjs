import {freshState,claimAchievements,addCoins,damageEnemy,autoPower,autoIncome,earnPassive,hitDamage,buyUpgrade,upgradeCost,PRODUCERS,producerUnlocked,prestigeGain} from './dist/core.mjs';
import {FlowMeter} from './dist/flow.mjs';
function simulate(mode){
  const automatic=mode==='auto';
  const s=freshState(0),flow=new FlowMeter(),milestones={},period=60/112;let combo=0;
  for(let beat=0;beat<112*30;beat++){
    const time=(beat+1)*period,grade=automatic?'good':mode==='beginner'?(beat%5===0?'miss':beat%5===1?'perfect':'good'):beat%5?'perfect':'good';combo=grade==='miss'?0:combo+1;
    if(!automatic){s.hits++;s.bestCombo=combo;s.perfects+=grade==='perfect'?1:0;}
    if(flow.beat({songTime:time}))s.flows++;
    const boost=flow.active;
    if(grade!=='miss'){addCoins(s,(grade==='perfect'?1.5:.75)*(boost?2:1));damageEnemy(s,hitDamage(s,grade,combo,1).damage*(boost?2.5:1));flow.hit(grade,period);}else flow.miss();
    earnPassive(s,period,boost);damageEnemy(s,autoPower(s)*(boost?3:1)*period);claimAchievements(s);
    // First disciple/poings, then the best regular income per coin.
    let key=!s.upgrades.echo?'echo':!s.upgrades.power?'power':null;
    if(!key){const candidates=Object.keys(PRODUCERS).filter(k=>producerUnlocked(s,k));key=candidates.sort((a,b)=>{const value=k=>{const copy=structuredClone(s);copy.upgrades[k]++;return (autoIncome(copy)-autoIncome(s))/upgradeCost(s,k);};return value(b)-value(a);})[0];}
    if(buyUpgrade(s,key)&&!milestones[key])milestones[key]=Math.round(time);
    if(prestigeGain(s)>0){milestones.transmission=Math.round(time);break;}
  }
  return {mode,seconds:milestones,stage:s.stage};
}
console.log(JSON.stringify(['manual','beginner','auto'].map(simulate),null,2));
