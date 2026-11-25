const median = values => {
  const sorted = values.slice().sort((a,b) => a-b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center-1] + sorted[center]) / 2;
};

export function calibrationResult(errors) {
  const finite = errors.filter(Number.isFinite);
  if (finite.length < 8) return null;
  const center = median(finite);
  const deviation = median(finite.map(value => Math.abs(value-center)));
  const kept = finite.filter(value => Math.abs(value-center) <= Math.max(35, deviation*3));
  if (kept.length < 8 || deviation > 45) return null;
  return {offset: Math.round(Math.max(-250, Math.min(450, median(kept)))), spread: Math.round(deviation), taps: kept.length};
}

/** A tap just before the good window (`early`) spoils its note, so hammering never replaces listening. Further away, the note stays available. */
export function judgePlayable(rhythm, time, focus, lastExpired, resolved) {
  const candidate = rhythm.playable(time, lastExpired, resolved);
  if (!candidate) return null;
  const error = (time-candidate.time)*1000;
  const window = rhythm.windows(candidate, focus);
  const grade=Math.abs(error)<=window.perfect*1000?'perfect':Math.abs(error)<=window.good*1000?'good':'miss';
  return {event:candidate,index:candidate.index,error,grade,early:grade==='miss'&&error<0&&error>-window.good*1800};
}
