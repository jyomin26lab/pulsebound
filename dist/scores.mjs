/**
 * The written scores of the three built-in songs: a section name, then its bars of 8 eighth notes.
 * 1 = every difficulty · 2 = Standard and Intense · 3 = Intense only · - = the note is held · . = rest
 * The music reads them too (music.mjs): its lead plays these notes, and a snare strikes each note of a « roulement ».
 */
const WRITTEN={
  neon:`
    intro     1.3.2... 1---..2. 1.3.2.3. 1----.2.
    couplet   1.231.3. 1.231.23 1---1.33 1.32.312
    couplet   1.231.32 3.2.1--- 1.231.32 3.2.1---
    montée    1.231.3. 1---1.3. 1.231.23 13231222
    refrain   13213312 1.231.23 13213312 13231---
    refrain   13213312 1.231.22 13213312 13221.22
    silence   1----.2. 1----... ....1... 1...2.22
    couplet   1.231.23 1---1.2. 1.231.23 1---1.22
    couplet   1.231.32 3.231--- 1.231.32 3.2.1---
    montée    1.231.3. 1.231.23 13221.22 13221222
    refrain   13213312 1.231.22 13213312 13221---
    refrain   13213312 13221.22 13213312 13221.22
    silence   1----... ....1.2.
    roulement 1.231.23 12221222
    final     1.213212 13221.22 13213212 12221---`,
  chrome:`
    intro     1...3.2. 1----.2. 1.3.2.3. 1----...
    couplet   1.231.3. 1----.23 1.231.3. 1.231.23
    couplet   1.221.33 1----.23 1.221.33 1.231---
    couplet   1.221.33 1---1.2. 1.221.33 13231.23
    montée    1.231.3. 1---1.33 1.221.33 13221.23
    refrain   13221.12 1.321.23 13221.23 13231---
    refrain   13221.13 1.321.23 13221.23 13231.23
    silence   1----... ....1...
    roulement 13231.23 13231222
    couplet   1.231.23 1----.23 1.231.23 13.21.2.
    couplet   1.221.33 1---1.2. 1.221.33 13231---
    montée    1.231.33 1.231.23 13221.23 13221.23
    silence   1----... ......2.
    roulement 13231.23 13231222
    refrain   13221.13 13321.23 13221.23 13231---
    refrain   13221.13 13321.23 13221.23 13231.22
    couplet   1----.2. 1.3...12 1----.2. 1.2.1---
    montée    1.231.23 13221.23 13221.22 13221322
    final     13221.12 13321.23 13221.23 13221322
    final     13221.12 13221322 13221.12 13221---`,
  after:`
    intro     1---.... 1.3.1.3. 1---..2. 1...2.3.
    couplet   1.32.31. 1---1.23 1.32.31. 1.321.13
    couplet   1.23.1.2 3.1.1--- 1.23.1.2 3.1.1---
    refrain   1.2132.3 1.231.13 1.2132.2 321.1---
    refrain   1.2132.2 1---1.12 1.2132.2 321.1.12
    silence   1-----.. ....1... 1-----.. 1...2.2.
    couplet   1.32.312 3..1--.2 1.32.312 3.1.1---
    montée    1.231.2. 1.231.13 1.231.12 13221222
    silence   1---.... ....1.2.
    roulement 1.231.23 12221222
    refrain   1.2132.2 1.231.12 1.2132.2 321.1222
    final     1.213212 13221.22 1.213212 12221322
    fin       1------.`
};
/** Each eighth note: its section and mark, how many times this section has played before, and where it falls in it. */
export const SCORES=Object.fromEntries(Object.entries(WRITTEN).map(([id,text])=>{
  const takes={};
  return [id,text.trim().split('\n').flatMap(line=>{
    const [section,...bars]=line.trim().split(/\s+/),marks=[...bars.join('')],take=takes[section]=(takes[section]??-1)+1;
    return marks.map((mark,eighth)=>({section,mark,take,eighth,size:marks.length}));
  })];
}));
/** What is written on an eighth note, counted from the start of the song. A longer song starts its score again. */
export function scoreStep(trackId,step){const score=SCORES[trackId];return score?.[step%score.length];}
