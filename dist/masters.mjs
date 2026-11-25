// The sixteen masters: each guards the way out of one dojo, with its own colour over Nova's drawings and its own way of fighting.
// Every value here is read by masterDuel() and duelEvents(); check the balance with check-duel.mjs.
import { SHADOW } from './duel-core.mjs';

const STYLES={
  steady:{line:'Des coups nets, sur le temps.',levels:[0,0,1],flips:[0,1],darts:0,moves:['punch','cross','hook','punch']},
  heavy:{line:'Peu de coups, mais un coup lourd à chaque manche.',levels:[0,0,0],flips:[0,1],darts:0,heavy:true,moves:['uppercut','hook','roundhouse','kick']},
  exchange:{line:'Deux mesures chacun : les rôles tournent vite.',turn:8,levels:[0,1,1],flips:[0,1],darts:0,moves:['cross','kick','uppercut','hook']},
  quick:{line:'Des attaques surprises à chaque manche.',levels:[0,1,1],flips:[2,3],darts:2,moves:['punch','backfist','cross','punch','kick']},
  offbeat:{line:'Il attaque à contretemps.',levels:[0,1,2],flips:[0,1],darts:1,parry:[[[0,3,6],[0,3]],[[1,3,6],[0,3,5]],[[1,3,5,7],[0,3,5,6]]],moves:['kick','meiaLua','backfist','roundhouse']},
  eclipse:{line:'Coups lourds, surprises et échanges courts : tout à la fois.',turn:8,levels:[1,2,2],flips:[1,2],darts:1,heavy:true,moves:['roundhouse','leapPunch','hook','meiaLua','uppercut']}
};
// Name, way of fighting, and colours: hues of the top and the bottom, saturation and brightness in percent.
const LIST=[
  ['Bitume','steady',36,220,14,78],['Rouille','heavy',20,30,46,80],['Tempo','exchange',205,232,36,86],['Néon','quick',322,262,38,86],
  ['Bambou','offbeat',96,150,26,78],['Marbre','steady',210,210,5,100],['Acier','heavy',204,214,18,74],['Signal','quick',194,250,44,84],
  ['Orbite','exchange',238,285,30,64],['Spore','offbeat',74,125,36,82],['Corail','heavy',8,330,38,90],['Mue','exchange',165,45,26,70],
  ['Prisme','quick',300,195,36,94],['Lichen','offbeat',54,96,22,70],['Nacre','steady',335,200,15,100],['Éclipse','eclipse',356,265,42,44]
];
/** force is the advised level of Force; toughness is the share of a flawless player's damage that empties its life; hurt is how many times over it fells a Nova who parries nothing. */
export const MASTERS=LIST.map(([short,style,hue,low,sat,light],i)=>({level:i+1,short,name:'Maître '+short,color:{hue,low,sat,light},style:{...SHADOW,...STYLES[style]},force:6*i+2,toughness:i?.44+.02*i:.4,hurt:i?1.45+.11*i:1.2}));
