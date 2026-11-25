import {scoreStep} from './scores.mjs';
/**
 * The three built-in songs. The lead plays the written score (scores.mjs): what you strike is what you hear. What plays
 * around it is written here, section by section; a section that comes back uses its variants in turn.
 *   chords: one per bar · lead: eight pitches per bar, « . » repeats the last one
 *   the others: bars of 1, 4, 8 or 16 equal steps that repeat through the section. « - » holds, « . » rests
 *   drums and comp: x = hit, o = soft · bass: 0 = root, 5 = fifth, 8 = octave · arp: which note of the chord
 *   cutoff: how open the chords sound, [from, to] through the section · swell: the drums grow · riser: rising noise
 *   double: the lead is doubled an octave higher
 */
const DRUMS=['kick','snare','hat','open','crash'];
const RISE={swell:true,riser:true,kick:'xxxx xxxx xxxx x...',snare:'.x.x xxxx xxxxxxxx xxxxxxxxxxxxxxxx'};
const NEON_VERSE={comp:'x-------',bass:'00080080',kick:'x...xx..',snare:'.x.x .x.x .x.x ....x.......x.oo',hat:'xoxoxoxo'};
const NEON_CHORUS={comp:'x-------',bass:'0.080.080.080.08',arp:'0213021302130213',kick:'xxxx',snare:'.x.x .x.x .x.x ....x.......x.ox',hat:'o.ooo.ooo.ooo.oo',open:'.x.x.x.x',crash:'x . . .',cutoff:2400};
const CHROME_VERSE={bass:'0..0..0.0..0..8.',kick:'x.x.......x.....',snare:'....x..o.o..x..o ....x..o.o..x..o ....x..o.o..x..o ....x..o.oo.xoxx',hat:'xoxoxoxo',cutoff:1300};
const CHROME_CHORUS={comp:'x--x--x-x--x--x-',bass:'0.000.000.000.80',kick:'x.x.......xx.... x.x.......x...x.',snare:'....x..o.o..x..o ....x..o.o....x.',hat:'xoooxoooxoooxooo',open:'.x.x.x.x',crash:'x . . .',cutoff:2600};
const AFTER_VERSE={cutoff:3200,kick:'x......x..x.....',snare:'.x.x .x.x .x.x ....x..o....x.oo',hat:'x.xox.x.x.xox.xo',bass:'0----.0-..5-..8.'};
const AFTER_CHORUS={cutoff:4200,kick:'x......x.xx.....',snare:'....x..o....x..o ....x..o....x..o ....x..o....x..o ....x..o..o.xoxo',hat:'x.xox.xox.xox.xo',bass:'0---..0-..5-0-8.',comp:'x-----x---x-----',arp:'0.1.2.3.2.1.2.1.'};
export const SONGS={
  neon:{swing:.5,level:.63,echo:.3,pump:.45,
    chord:{osc:[['sawtooth',1,-7,1],['sawtooth',1,7,1]],attack:.07,decay:.5,sustain:.8,release:.4,level:.085},
    bass:{osc:[['sawtooth',1,0,1],['square',1,6,.5],['sine',1,0,1]],attack:.004,decay:.12,sustain:.6,release:.06,level:.074,cutoff:[1100,320]},
    arp:{osc:[['square',1,0,1]],attack:.003,decay:.07,sustain:.2,release:.08,level:.075,cutoff:[2600,2600]},
    lead:{osc:[['sawtooth',1,-5,1],['sawtooth',1,5,1],['square',.5,0,.7]],attack:.012,decay:.25,sustain:.7,release:.16,level:.1,cutoff:4200},
    kit:{kick:[165,47,.07,.32,.56],click:.16,body:[235,165,.05,.16,.24],snare:[.62,.24],rattle:2100,hat:.17,bright:7000,room:.55},
    sections:{
      intro:[{comp:'x-------',chords:'Am G F E',bass:'. . 0------- 0-------',kick:'. . x.x. x.x.',hat:'. . .o.o.o.o .o.o.o.o',cutoff:[350,1000],
        lead:'A4 . C5 . E5 . . . | D5 . . . . . B4 . | C5 . A4 . C5 . D5 . | E5 . . . . . B4 .'}],
      couplet:[{...NEON_VERSE,chords:'Am F C G',cutoff:900,
        lead:'A4 . C5 B4 A4 . E4 G4 | A4 . C5 D5 C5 . A4 G4 | E5 . D5 C5 D5 . C5 D5 | B4 . A4 B4 D5 C5 B4 G4'},
      {...NEON_VERSE,chords:'Am F Dm E',arp:'0.1.2.1.0.1.2.1.',cutoff:1200,
        lead:'A4 . C5 B4 A4 . C5 D5 | F5 . E5 D5 C5 . . . | D5 . F5 E5 D5 . F5 G5 | A5 . G#5 F5 E5 . . .'}],
      montée:[{...RISE,comp:'x-------',chords:'Dm F G E',bass:'00000000',arp:'0123012301230123',hat:'oooooooo',cutoff:[600,3400],
        lead:'D5 . E5 F5 A5 . F5 . | F5 . F5 G5 A5 . G5 F5 | D5 D5 G5 A5 B5 . A5 G5 | E5 F5 G#5 A5 B5 A5 B5 D6'}],
      refrain:[{...NEON_CHORUS,chords:'F G Am C',
        lead:'E5 E5 D5 C5 A4 A4 C5 B4 | B4 . D5 E5 G5 . E5 D5 | A5 A5 G5 E5 C5 C5 E5 D5 | C5 D5 E5 D5 G5 . . .'},
      {...NEON_CHORUS,double:true,chords:'F G Em Am',
        lead:'E5 E5 D5 C5 A4 A4 C5 B4 | B4 C5 D5 E5 G5 . A5 B5 | B5 B5 A5 G5 E5 E5 G5 A5 | A5 G5 E5 D5 C5 . D5 B4'}],
      silence:[{comp:'x-------',chords:'Am F Am E',cutoff:1100,
        lead:'A4 . . . . . E4 . | C5 . . . . . . . | E5 . . . E5 . . . | E5 . . . B4 . C5 D5'},
      {comp:'x-------',chords:'F E',cutoff:1100,lead:'C5 . . . . . . . | B4 . . . B4 . D5 .'}],
      roulement:[{swell:true,riser:true,comp:'x-------',chords:'E E',bass:'00000000',kick:'xxxx xxxxxxxx',cutoff:[500,3000],
        lead:'E5 . G#5 F5 E5 . D5 B4 | E5 E5 F5 F5 G#5 G#5 B5 D6'}],
      final:[{...NEON_CHORUS,double:true,chords:'F G Am Am',crash:'x . x x',kick:'xxxx xxxx xxxx x.x.',snare:'.x.x .x.x .x.x xxxxx...',
        bass:'0.080.080.080.08 0.080.080.080.08 0.080.080.080.08 00000---',arp:'0213021302130213 0213021302130213 0213021302130213 .',
        hat:'o.ooo.ooo.ooo.oo o.ooo.ooo.ooo.oo o.ooo.ooo.ooo.oo .',open:'.x.x.x.x .x.x.x.x .x.x.x.x .',
        lead:'E5 . D5 C5 C5 D5 C5 B4 | B4 C5 D5 E5 G5 . A5 B5 | C6 C6 B5 A5 G5 A5 G5 E5 | C6 B5 A5 G5 A5 . . .'}]
    }},
  chrome:{swing:.5,level:.63,echo:.22,pump:.5,drive:[3,.36],
    chord:{osc:[['sawtooth',1,-12,1],['sawtooth',1,12,1]],attack:.004,decay:.16,sustain:.45,release:.12,level:.095},
    bass:{osc:[['sawtooth',1,-8,1],['sawtooth',1,8,1],['sine',1,0,1]],attack:.003,decay:.09,sustain:.55,release:.04,level:.09,cutoff:[1800,420]},
    arp:{osc:[['sawtooth',1,0,1]],attack:.003,decay:.06,sustain:.3,release:.04,level:.1,cutoff:[2600,500],resonance:9},
    lead:{osc:[['square',1,0,1],['sawtooth',1,8,1],['square',2,0,.25]],attack:.004,decay:.12,sustain:.55,release:.08,level:.09,cutoff:4600},
    kit:{kick:[190,50,.05,.22,.58],click:.18,body:[245,180,.04,.11,.2],snare:[.62,.15],rattle:2500,hat:.11,bright:7800,room:.3},
    sections:{
      intro:[{comp:'x-------',chords:'Cm Cm Ab Bb',bass:'. . 0..0..0.0..0..0. 0..0..0.0..0..8.',kick:'. . x.x. xxxx',hat:'. . oooooooo xoxoxoxo',cutoff:[300,1500],
        lead:'C5 . . . G4 . Bb4 . | C5 . . . . . G4 . | C5 . Eb5 . D5 . C5 . | D5 . . . . . . .'}],
      couplet:[{...CHROME_VERSE,comp:'x-.x-...',chords:'Cm Cm Ab Bb',
        lead:'C5 . Eb5 D5 C5 . G4 Bb4 | C5 . . . . . G4 Bb4 | C5 . Eb5 D5 C5 . Ab4 Bb4 | D5 D5 F5 Eb5 D5 . Bb4 C5'},
      {...CHROME_VERSE,comp:'...x..x....x..x.',open:'.x.x.x.x',chords:'Cm Cm Fm G',
        lead:'C5 . Eb5 F5 G5 . F5 Eb5 | G5 . . . F5 . Eb5 D5 | F5 . Ab5 G5 F5 . Eb5 D5 | D5 Eb5 F5 D5 B4 . . .'},
      {...CHROME_VERSE,comp:'...x..x....x..x.',open:'.x.x.x.x',arp:'0.2.1.2.0.2.1.3.',chords:'Cm Eb Ab Bb',
        lead:'C5 . Eb5 F5 G5 . F5 Eb5 | G5 . . . Bb5 . G5 . | Ab5 . G5 F5 Eb5 . F5 Eb5 | F5 G5 Ab5 G5 F5 . D5 F5'},
      {...CHROME_VERSE,comp:'x-.x-...',open:'.x.x.x.x',chords:'Cm Cm Ab Bb',
        lead:'C5 . Eb5 D5 C5 . G4 Bb4 | C5 . . . . . G4 Bb4 | C5 . Eb5 D5 C5 . Ab4 Bb4 | D5 D5 F5 Eb5 D5 . Bb4 C5'},
      {...CHROME_VERSE,comp:'...x..x....x..x.',open:'.x.x.x.x',arp:'0.2.1.2.0.2.1.3.',chords:'Cm Cm Fm G',
        lead:'C5 . Eb5 F5 G5 . F5 Eb5 | G5 . . . F5 . Eb5 . | F5 . Ab5 G5 F5 . Eb5 D5 | D5 Eb5 F5 D5 B4 . . .'},
      {comp:'x-------',bass:'0-------',kick:'x...',snare:'..x.',hat:'.o.o.o.o',cutoff:900,chords:'Ab Bb Cm G',
        lead:'Eb5 . . . . . C5 . | D5 . F5 . . . Bb4 D5 | Eb5 . . . . . G5 . | F5 . D5 . B4 . . .'}],
      montée:[{...RISE,kick:'xxxx xxxx xxxxxxxx x...',comp:'x-------',bass:'0000000000000000',arp:'0012003100210032',hat:'oooooooo',cutoff:[700,3600],chords:'Fm Ab Bb G',
        lead:'F5 . Ab5 G5 F5 . Eb5 F5 | Ab5 G5 Ab5 Bb5 C6 . Bb5 Ab5 | Bb5 Ab5 Bb5 C6 D6 . C6 Bb5 | D5 Eb5 F5 G5 Ab5 Ab5 B5 D6'}],
      refrain:[{...CHROME_CHORUS,chords:'Cm Ab Eb Bb',
        lead:'C5 C5 C5 Eb5 G5 . F5 Eb5 | Ab5 Ab5 Ab5 G5 Eb5 . C5 D5 | G5 G5 Bb5 G5 Eb5 . F5 G5 | D5 Eb5 F5 Eb5 Bb5 . . .'},
      {...CHROME_CHORUS,double:true,chords:'Cm Ab Fm G',
        lead:'C5 C5 C5 Eb5 G5 . F5 Eb5 | Ab5 Ab5 Ab5 G5 Eb5 . C5 D5 | Ab5 Ab5 C6 Ab5 F5 . G5 Ab5 | B5 Ab5 G5 F5 D5 . B4 D5'}],
      silence:[{comp:'x-------',chords:'Ab G',cutoff:1200,lead:'C5 . . . . . . . | B4 . . . B4 . D5 .'}],
      roulement:[{swell:true,riser:true,comp:'x-------',chords:'G G',bass:'00000000',kick:'xxxx xxxxxxxx',cutoff:[500,3200],
        lead:'G5 F5 D5 F5 G5 . Ab5 G5 | G5 F5 D5 F5 G5 Ab5 B5 D6'}],
      final:[{...CHROME_CHORUS,double:true,kick:'xxxx',arp:'0012003100210032',chords:'Cm Ab Eb Bb',
        lead:'C5 C5 C5 Eb5 G5 . F5 Eb5 | Ab5 Ab5 Ab5 G5 Eb5 . C5 D5 | G5 G5 Bb5 G5 Eb5 . F5 G5 | D5 Eb5 F5 G5 Bb5 Bb5 Ab5 G5'},
      {...CHROME_CHORUS,double:true,crash:'x . x x',chords:'Cm Ab G Cm',kick:'xxxx xxxx xxxx x.x.',snare:'....x..o.o..x..o ....x..o.o..x..o ....x..o.o..x..o xxxxx...',
        bass:'0.000.000.000.80 0.000.000.000.80 0.000.000.000.80 00000---',comp:'x--x--x-x--x--x- x--x--x-x--x--x- x--x--x-x--x--x- x-------',
        hat:'xoooxoooxoooxooo xoooxoooxoooxooo xoooxoooxoooxooo .',open:'.x.x.x.x .x.x.x.x .x.x.x.x .',arp:'0012003100210032 0012003100210032 0012003100210032 .',
        lead:'C5 C5 C5 Eb5 G5 . F5 Eb5 | Ab5 G5 Ab5 Bb5 C6 C6 Bb5 Ab5 | B5 Ab5 G5 F5 G5 . B5 D6 | Eb6 D6 C6 B5 C6 . . .'}]
    }},
  after:{swing:.6,level:.63,echo:.25,pump:.8,crackle:.06,
    chord:{osc:[['sine',1,0,1]],fm:[[1,1.4,.7],[14,.3,.06]],attack:.005,decay:.9,sustain:.35,release:.35,level:.078},
    bass:{osc:[['triangle',1,0,.8],['sine',1,0,.7]],attack:.006,decay:.28,sustain:.4,release:.1,level:.12,cutoff:[900,420]},
    arp:{osc:[['triangle',1,0,1]],attack:.004,decay:.12,sustain:.1,release:.2,level:.095,cutoff:[2200,2200]},
    lead:{osc:[['sine',1,0,1]],fm:[[4,.5,.12]],attack:.004,decay:.5,sustain:.3,release:.7,level:.115,cutoff:5200},
    kit:{kick:[115,46,.06,.3,.5],click:.06,body:[210,170,.04,.12,.17],snare:[.42,.17],rattle:1900,hat:.14,bright:6000,room:.4},
    sections:{
      intro:[{comp:'x-------',chords:'Gm9 Ebmaj7 Gm9 D7',bass:'. . 0------- 0-----5-',hat:'. . o.o.o.o.o.o.o.oo o.o.o.o.o.o.o.oo',
        lead:'D5 . . . . . . . | Bb4 . C5 . D5 . F5 . | A4 . . . . . Bb4 . | C5 . . . A4 . F#4 .'}],
      couplet:[{...AFTER_VERSE,comp:'x---------x-----',chords:'Gm9 Cm9 F9 Bbmaj7',
        lead:'D5 . C5 Bb4 . A4 G4 A4 | Bb4 . . C5 D5 . Eb5 D5 | C5 . Bb4 A4 . G4 F4 G4 | A4 . C5 D5 F5 . D5 C5'},
      {...AFTER_VERSE,comp:'x-----x---x-----',chords:'Ebmaj7 Am7b5 D7 Gm9',
        lead:'G5 . F5 Eb5 . D5 . Bb4 | C5 . Eb5 . C5 . . . | A4 . C5 Eb5 . F#5 . A5 | Bb5 . A5 . G5 . . .'}],
      montée:[{swell:true,riser:true,kick:'x.x. x.x. xxxx x.x.',snare:'.x.x .x.x .x.x xxxxxxxx',hat:'xoxoxoxo',bass:'0-5-8-5-',comp:'x-x-x-x-',chords:'Cm9 F9 Ebmaj7 D7',
        lead:'Eb5 . D5 C5 D5 . Eb5 . | F5 . Eb5 D5 Eb5 . F5 G5 | G5 . F5 Eb5 F5 . G5 A5 | A5 G5 F#5 Eb5 D5 Eb5 F#5 A5'}],
      refrain:[{...AFTER_CHORUS,crash:'o . . .',chords:'Ebmaj7 F9 Gm9 Bbmaj7',
        lead:'D5 . Eb5 G5 F5 D5 . Bb4 | C5 . D5 Eb5 G5 . F5 Eb5 | D5 . F5 A5 G5 F5 . D5 | C5 D5 F5 . D5 Eb5 F5 G5'},
      {...AFTER_CHORUS,chords:'Ebmaj7 F9 D7 Gm9',
        lead:'D5 . Eb5 G5 F5 D5 . Bb4 | A5 . . . G5 . F5 Eb5 | D5 . F#5 A5 G5 F#5 . D5 | A5 Bb5 A5 . G5 . F5 D5'}],
      silence:[{comp:'x-------',chords:'Ebmaj7 D7 Gm9 D7',
        lead:'G5 . . . . . . . | F#5 . . . F#5 . A5 . | Bb4 . . . . . . . | A4 . . . C5 . Eb5 .'}],
      roulement:[{swell:true,riser:true,comp:'x-------',chords:'D7 D7',bass:'0-0-0-0-',kick:'x.x. xxxx',
        lead:'D5 . F#5 A5 C6 . A5 F#5 | D5 Eb5 F#5 A5 C6 A5 F#5 A5'}],
      final:[{...AFTER_CHORUS,double:true,crash:'o . o .',chords:'Ebmaj7 F9 Gm9 Gm9',
        lead:'D5 . Eb5 G5 F5 D5 Bb4 D5 | C5 D5 Eb5 G5 A5 . G5 F5 | D5 . F5 A5 Bb5 A5 F5 D5 | G5 A5 Bb5 D6 C6 Bb5 A5 F5'}],
      fin:[{comp:'x-------',bass:'0-------',crash:'o',kick:'x',chords:'Gm9',lead:'G5 . . . . . . .'}]
    }}
};
const QUALITIES={'':[0,4,7],m:[0,3,7],m9:[3,7,10,14],9:[4,7,10,14],maj7:[4,7,11,14],7:[4,7,10,13],m7b5:[0,3,6,10]};// the bass plays the root of a ninth
const PITCHES={C:0,D:2,E:4,F:5,G:7,A:9,B:11},ALTERED={b:-1,'#':1};
const pitchClass=(letter,altered)=>PITCHES[letter]+(ALTERED[altered]||0);
const within=(pitch,low)=>low+((pitch-low)%12+12)%12;// the same note in the octave that starts on « low »
const hertz=midi=>440*2**((midi-69)/12);
function parseChord(name){
  const [,letter,altered,quality]=name.match(/^([A-G])([b#]?)(.*)$/),root=pitchClass(letter,altered);
  return {bass:within(root,33),fifth:quality==='m7b5'?6:7,tones:QUALITIES[quality].map(step=>within(root+step,53)).sort((a,b)=>a-b)};
}
function parsePart(part){
  let last;
  const parsed={...part,chords:part.chords.split(' ').map(parseChord),lead:part.lead.split(' | ').map(bar=>bar.split(' ').map(name=>{
    const match=name.match(/^([A-G])([b#]?)(\d)$/);
    return last=match?pitchClass(match[1],match[2])+12*(+match[3]+1):last;
  }))};
  for(const name of ['comp','bass','arp',...DRUMS])if(part[name])parsed[name]=part[name].split(' ');
  return parsed;
}
for(const song of Object.values(SONGS))for(const variants of Object.values(song.sections))variants.forEach((part,i)=>{variants[i]=parsePart(part);});
/** What a part writes on a sixteenth of a bar, and how many sixteenths it lasts. */
export function written(bars,bar,sixteenth){
  const text=bars?.[bar%bars.length],size=16/text?.length,i=sixteenth/size;
  if(!text||!Number.isInteger(i)||'.-'.includes(text[i]))return null;
  let steps=1;while(text[i+steps]==='-')steps++;
  return {mark:text[i],sixteenths:steps*size};
}
/** The arrangement of an eighth note: where the song is, and which part plays. */
export function partAt(trackId,step){
  const at=scoreStep(trackId,step),variants=SONGS[trackId].sections[at.section];
  return {...at,part:variants[at.take%variants.length],bar:at.eighth>>3,beat:at.eighth%8};
}
/** Plays one built-in song, an eighth note at a time, into a node of any audio context (live or offline); « room » receives what goes to the reverb. */
export class Band{
  constructor(ctx,out,trackId,{noise,room}){
    const song=SONGS[trackId],{kit}=song,mix=this.mix=(this.ctx=ctx,this.gain(song.level,out));
    Object.assign(this,{trackId,song,noise,loops:[]});
    this.room=this.gain(song.level,room);
    // The echo repeats on a dotted eighth note, a little darker each time.
    this.echo=ctx.createDelay(2);const dark=this.filter('lowpass',2400,.5,mix);this.echo.connect(dark).connect(this.gain(.36,this.echo));
    // Chords, bass and arpeggio dip under each kick.
    this.pump=this.gain(1,mix);
    this.hats=this.filter('highpass',kit.bright,.7,mix);
    this.snares=this.filter('bandpass',kit.rattle,.6,mix,this.gain(kit.room,this.room));
    this.chords=this.filter('lowpass',1500,.7,this.pump,this.gain(.35,this.room));
    this.sides=[-.45,.45].map(x=>{const side=ctx.createStereoPanner?.()??ctx.createGain();if(side.pan)side.pan.value=x;side.connect(this.chords);return side;});
    this.basses=this.filter('lowpass',song.bass.cutoff[1],2,song.drive?this.shaper(song.drive,this.pump):this.pump);
    this.arps=this.filter('lowpass',song.arp.cutoff[1],song.arp.resonance||1,this.pump,this.gain(song.echo,this.echo));
    this.leads=this.filter('lowpass',song.lead.cutoff,.7,mix,this.gain(song.echo,this.echo),this.gain(.22,this.room));
    this.vibrato=this.gain(9);const lfo=ctx.createOscillator();lfo.frequency.value=5.4;lfo.connect(this.vibrato);lfo.start();this.loops.push(lfo);
    if(song.crackle){
      const dust=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=dust.getChannelData(0),record=ctx.createBufferSource();
      for(let i=0;i<60;i++)data[Math.floor(Math.random()*data.length)]=Math.random()*2-1;
      record.buffer=dust;record.loop=true;record.connect(this.gain(song.crackle,mix));record.start();this.loops.push(record);
    }
  }
  gain(value,...to){const node=this.ctx.createGain();node.gain.value=value;for(const next of to)node.connect(next);return node;}
  filter(type,frequency,q,...to){const node=this.ctx.createBiquadFilter();node.type=type;node.frequency.value=frequency;node.Q.value=q;for(const next of to)node.connect(next);return node;}
  shaper([drive,level],to){const node=this.ctx.createWaveShaper();node.curve=Float32Array.from({length:1025},(_,i)=>Math.tanh(drive*(i/512-1))*level);node.connect(to);return node;}
  /** A note of an instrument. Its oscillators share one envelope; fm adds modulators that fade (Rhodes, vibraphone). */
  note(voice,midi,time,length,level,out,held=false){
    const {ctx}=this,hz=hertz(midi),peak=level*voice.level,hold=time+Math.max(length,voice.attack+.02),end=hold+voice.release,amp=this.gain(0,out),nodes=[amp];
    amp.gain.setValueAtTime(0,time);amp.gain.linearRampToValueAtTime(peak,time+voice.attack);
    amp.gain.setTargetAtTime(peak*voice.sustain,time+voice.attack,voice.decay);amp.gain.setTargetAtTime(0,hold,voice.release/5);
    const oscillator=(type,frequency,to)=>{const osc=ctx.createOscillator();osc.type=type;osc.frequency.setValueAtTime(frequency,time);osc.connect(to);osc.start(time);osc.stop(end);nodes.push(osc);return osc;};
    const carriers=voice.osc.map(([type,ratio,cents,part])=>{
      let to=amp;if(part!==1)nodes.push(to=this.gain(part,amp));
      const osc=oscillator(type,hz*ratio,to);osc.detune.value=cents;if(held)this.vibrato.connect(osc.detune);return osc;
    });
    for(const [ratio,index,fade] of voice.fm||[]){
      const depth=this.gain(0,carriers[0].frequency);nodes.push(depth);
      depth.gain.setValueAtTime(index*hz*ratio*(.4+.6*level),time);depth.gain.setTargetAtTime(0,time,fade);oscillator('sine',hz*ratio,depth);
    }
    carriers[0].onended=()=>{for(const node of nodes)node.disconnect();if(held)for(const osc of carriers)this.vibrato.disconnect(osc.detune);};
  }
  thump(time,[from,to,sweep,fade,level],velocity){
    const osc=this.ctx.createOscillator(),amp=this.gain(0,this.mix);
    osc.frequency.setValueAtTime(from,time);osc.frequency.exponentialRampToValueAtTime(to,time+sweep);
    amp.gain.setValueAtTime(level*velocity,time);amp.gain.exponentialRampToValueAtTime(.001,time+fade);
    osc.connect(amp);osc.start(time);osc.stop(time+fade);osc.onended=()=>{osc.disconnect();amp.disconnect();};
  }
  burst(time,out,level,fade){
    const source=this.ctx.createBufferSource(),amp=this.gain(0,out);source.buffer=this.noise;source.loop=true;
    amp.gain.setValueAtTime(level,time);amp.gain.exponentialRampToValueAtTime(.0005,time+fade);
    source.connect(amp);source.start(time,Math.random());source.stop(time+fade);source.onended=()=>{source.disconnect();amp.disconnect();};
  }
  hit(drum,time,velocity){
    const {kit,pump}=this.song;
    if(drum==='kick'){
      this.thump(time,kit.kick,velocity);this.burst(time,this.hats,kit.click*velocity,.014);
      this.pump.gain.setTargetAtTime(1-(1-pump)*velocity,time,.006);this.pump.gain.setTargetAtTime(1,time+.07,.09);
    }else if(drum==='snare'){this.burst(time,this.snares,kit.snare[0]*velocity,kit.snare[1]);this.thump(time,kit.body,velocity);}
    else this.burst(time,this.hats,kit.hat*velocity*(drum==='hat'?1:1.4),drum==='crash'?1.5:drum==='open'?.2:.045);
  }
  rise(time,length,from,to){
    const source=this.ctx.createBufferSource(),band=this.filter('bandpass',400,.9),amp=this.gain(0,this.mix);source.buffer=this.noise;source.loop=true;
    band.frequency.setValueAtTime(400*16**from,time);band.frequency.exponentialRampToValueAtTime(400*16**to,time+length);
    amp.gain.setValueAtTime(.09*from,time);amp.gain.linearRampToValueAtTime(.09*to,time+length);
    source.connect(band).connect(amp);source.start(time,Math.random());source.stop(time+length);source.onended=()=>{source.disconnect();band.disconnect();amp.disconnect();};
  }
  // shortcut: after a pause in the middle of a bar, held chords and notes wait for their next attack; replay them if a resume sounds empty.
  /** Plays an eighth note that starts at « time » and lasts « length » seconds. */
  play(step,time,length){
    const {song,trackId}=this,{part,section,mark,bar,beat,eighth,size}=partAt(trackId,step),chord=part.chords[bar%part.chords.length],progress=eighth/size,swell=part.swell?.4+.6*progress:1;
    if(this.length!==length){this.length=length;this.echo.delayTime.setValueAtTime(Math.min(2,length*1.5),time);}
    const cutoff=part.cutoff||1500;this.chords.frequency.setTargetAtTime(cutoff.length?cutoff[0]*(cutoff[1]/cutoff[0])**progress:cutoff,time,.05);
    for(const half of [0,1]){
      const at=time+half*song.swing*length,sixteenth=length/2,read=name=>written(part[name],bar,beat*2+half);
      const pluck=(bus,[open,shut])=>{bus.frequency.setValueAtTime(open,at);bus.frequency.setTargetAtTime(shut,at,.06);};
      for(const drum of DRUMS){const hit=read(drum);if(hit)this.hit(drum,at,(hit.mark==='o'?.5:1)*(drum==='kick'?1:swell));}
      const comp=read('comp'),bass=read('bass'),arp=read('arp');
      if(comp)chord.tones.forEach((tone,i)=>this.note(song.chord,tone,at,comp.sixteenths*sixteenth*.97,comp.mark==='o'?.6:1,this.sides[i%2]));
      if(bass){pluck(this.basses,song.bass.cutoff);this.note(song.bass,chord.bass+{0:0,5:chord.fifth,8:12}[bass.mark],at,bass.sixteenths*sixteenth*.92,1,this.basses);}
      if(arp){const i=+arp.mark,count=chord.tones.length;pluck(this.arps,song.arp.cutoff);this.note(song.arp,chord.tones[i%count]+12*(1+Math.floor(i/count)),at,sixteenth*.9,swell,this.arps);}
    }
    if('123'.includes(mark)){
      let held=1;while(held<8&&scoreStep(trackId,step+held).mark==='-')held++;
      const rings=held>1?held:scoreStep(trackId,step+1).mark==='.'?2:1,level={1:1,2:.9,3:.38}[mark],pitch=part.lead[bar%part.lead.length][beat];
      this.note(song.lead,pitch,time,rings*length*.92,level,this.leads,held>1);
      if(part.double)this.note(song.lead,pitch+12,time,rings*length*.92,level*.32,this.leads,held>1);
      if(section==='roulement')this.hit('snare',time,(mark==='3'?.5:1)*swell);
    }
    if(part.riser&&beat===0)this.rise(time,length*8,progress,progress+8/size);
  }
  stop(){for(const loop of this.loops)loop.stop();this.room.disconnect();}
}
