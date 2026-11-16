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

export function combatLayout(width, height, centered = false) {
  const margin = Math.max(8, Math.min(18, width * .025));
  const railHalf = centered ? 34 : 0;
  const left = margin;
  const right = centered ? width / 2 - railHalf - margin : width * .57;
  const top = Math.max(64, height * .2);
  const bottom = height - Math.max(24, height * .12);
  const availableWidth = Math.max(0, right - left);
  const availableHeight = Math.max(0, bottom - top);
  const unit = Math.min(
    availableWidth / HERO_ENVELOPE.width,
    availableHeight / (HERO_ENVELOPE.bottom - HERO_ENVELOPE.top)
  );
  const heroX = (left + right) / 2;
  return {left, right, top, bottom, heroX, unit, bagX: width * (centered ? .83 : .76)};
}

export function spritePlacement(id, layout) {
  const sprite = HERO_SPRITES[id] || HERO_SPRITES.idle;
  const scale = layout.unit / sprite.unit;
  const [sx, sy, sw, sh] = sprite.bounds;
  return {
    sx, sy, sw, sh,
    x: Math.max(layout.left, Math.min(layout.right - sw * scale, layout.heroX + (sx - sprite.anchor[0]) * scale)),
    y: layout.bottom + (sy - sprite.anchor[1]) * scale,
    width: sw * scale,
    height: sh * scale
  };
}
