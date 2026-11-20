import { HERO_SPRITES } from './sprites/hero-manifest.mjs';

// Register every pose to the same foot/hand baseline and beret-width unit.
// Fit the whole animation library once, so changing pose cannot change its scale.
export const HERO_ENVELOPE = Object.values(HERO_SPRITES).reduce((box, sprite) => {
  const [x, y, width, height] = sprite.bounds;
  const [anchorX, anchorY] = sprite.anchor;
  return {
    left: Math.min(box.left, (x - anchorX) / sprite.unit),
    right: Math.max(box.right, (x + width - anchorX) / sprite.unit),
    top: Math.min(box.top, (y - anchorY) / sprite.unit),
    bottom: Math.max(box.bottom, (y + height - anchorY) / sprite.unit),
    width: Math.max(box.width, width / sprite.unit)
  };
}, {left: 0, right: 0, top: 0, bottom: 0, width: 0});

// Tip of the striking fist or foot in each contact pose, in sprite pixels (measured on the alpha channel).
export const HERO_REACH = {
  jab: [248, 110], cross: [262, 107], kick: [249, 97], uppercut: [199, 32],
  hook: [262, 216], roundhouse: [262, 191], backfist: [262, 147], meiaLua: [262, 183],
  'leapPunch-1': [263, 141], 'axeKick-1': [240, 69], 'cartwheel-1': [259, 112]
};
// Poses held between strikes. The guard spot keeps every one of them clear of the bag.
const GUARD = ['idle', 'dance-left', 'dance-right', 'kick-ready', 'uppercut-ready'];
const extent = side => Math.max(...GUARD.map(id => {
  const s = HERO_SPRITES[id], [x, , w] = s.bounds;
  return (side > 0 ? x + w - s.anchor[0] : s.anchor[0] - x) / s.unit;
}));
export const GUARD_FRONT = extent(1), GUARD_BACK = extent(-1);

/** On phones the note lane sits under the stage: Nova and the bag get the whole width and height, framed on the contact. */
export function combatLayout(width, height, phone = false) {
  const margin = Math.max(8, Math.min(18, width * .025));
  const left = margin;
  const right = width - margin;
  const top = phone ? Math.max(40, height * .12) : Math.max(64, height * .2);
  const bottom = height - (phone ? Math.max(12, height * .05) : Math.max(24, height * .12));
  const bagWidth = Math.max(36, Math.min(100, width * (phone ? .16 : .145)));
  const bagX = width * (phone ? .8 : .74);
  const unitH = Math.max(0, bottom - top) / (HERO_ENVELOPE.bottom - HERO_ENVELOPE.top);
  const unitW = Math.max(0, bagX - bagWidth / 2 - left) / (GUARD_FRONT + GUARD_BACK + .2);
  const unit = Math.min(unitH, unitW);
  // Guard spot: the widest guard or dance pose stops just short of the bag; every strike steps in from here.
  const heroX = bagX - bagWidth / 2 - (GUARD_FRONT + .2) * unit;
  return {left, right, top, bottom, heroX, unit, bagX, bagWidth};
}

/** dx/dy move Nova's feet from the guard spot (step in, step back, rise); the sprite never leaves the stage. */
export function spritePlacement(id, layout, dx = 0, dy = 0) {
  const sprite = HERO_SPRITES[id] || HERO_SPRITES.idle;
  const scale = layout.unit / sprite.unit;
  const [sx, sy, sw, sh] = sprite.bounds;
  return {
    sx, sy, sw, sh,
    x: Math.max(layout.left, Math.min(layout.right - sw * scale, layout.heroX + dx + (sx - sprite.anchor[0]) * scale)),
    y: Math.max(0, Math.min(layout.bottom - sh * scale, layout.bottom + dy + (sy - sprite.anchor[1]) * scale)),
    width: sw * scale,
    height: sh * scale
  };
}
