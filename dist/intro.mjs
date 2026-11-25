/** Opening film. It waits for its picture and its title font (3 s at most), plays over the loading game, and any tap or key skips it. */
const intro=document.querySelector('#intro'),calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rest=[...document.body.children].filter(node=>node!==intro&&node.tagName!=='DIALOG');
for(const node of rest)node.inert=true;// the game under the film stays out of reach
intro.classList.add('on');
let timer;
function leave(){
  clearTimeout(timer);removeEventListener('keydown',skip,true);intro.classList.add('leave');// the picture fades to black, then the black opens on the game
  intro.animate([{opacity:1},{opacity:1,offset:.4},{opacity:0}],{duration:1300,fill:'forwards'}).finished.then(()=>{
    intro.remove();for(const node of rest)node.inert=false;
  });
}
function skip(event){
  if(event.ctrlKey||event.metaKey||event.altKey||/^(F\d+|Tab)$/.test(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();if(!intro.classList.contains('leave'))leave();
}
addEventListener('keydown',skip,true);intro.addEventListener('click',skip);
await Promise.race([Promise.allSettled([intro.querySelector('img').decode(),document.fonts.load('900 italic 50px "Barlow Condensed"')]),new Promise(done=>setTimeout(done,3000))]);
intro.classList.add('play');
if(!intro.classList.contains('leave'))timer=setTimeout(leave,calm?1800:4600);
