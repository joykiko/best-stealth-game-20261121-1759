// player.js — Wren, the salt smuggler: movement, noise, pebbles and hiding.
//
// Walk is quiet, run is fast and loud, sneak is slow and hard to spot.
// A pebble, thrown with the mouse, makes a guard walk over to look at where
// it landed. Reeds and darkness are the player's friends; lantern light is not.

import { clamp, dist } from './util.js';
import { TILE, isReed, inLanternLight } from './levels.js';

const RADIUS = 13;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.dirX = 0;
    this.dirY = 1;
    this.running = false;
    this.sneaking = false;
    this.inReeds = false;
    this.inLight = false;
    this.pebbles = 3;
    this.sacks = 0;
    this.caught = false;
    this.stepTimer = 0;
    this.ring = 0; // footstep ring animation 0..1
    this.noiseRing = 0; // loud-run ring animation 0..1
    this.noiseRadius = 0;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.pebbles = 3;
    this.sacks = 0;
    this.caught = false;
    this.ring = 0;
    this.noiseRing = 0;
  }

  // Move with WASD/arrows; resolve collisions against solid rects one axis
  // at a time so the player slides along walls instead of sticking to them.
  update(dt, input, level, audio) {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }

    this.running = !!input.run && len > 0;
    this.sneaking = !!input.sneak && len > 0 && !this.running;
    const speed = this.running ? 235 : this.sneaking ? 78 : 148;

    if (len > 0) {
      this.dirX = mx;
      this.dirY = my;
      const nx = this.x + mx * speed * dt;
      if (!this.hitsSolid(nx, this.y, level.solids)) this.x = nx;
      const ny = this.y + my * speed * dt;
      if (!this.hitsSolid(this.x, ny, level.solids)) this.y = ny;
    }

    const gx = Math.floor(this.x / TILE);
    const gy = Math.floor(this.y / TILE);
    this.inReeds = isReed(level, gx, gy);
    this.inLight = inLanternLight(level, this.x, this.y);

    // Footsteps: quiet while walking, a visible noise ring while running.
    this.stepTimer -= dt;
    if (len > 0 && this.stepTimer <= 0) {
      this.stepTimer = this.running ? 0.26 : this.sneaking ? 0.62 : 0.4;
      this.ring = 1;
      audio.step(this.x, this.y, false);
      if (this.running) {
        this.noiseRing = 1;
        this.noiseRadius = 130;
      }
    }
    if (this.ring > 0) this.ring = Math.max(0, this.ring - dt * 2.2);
    if (this.noiseRing > 0) this.noiseRing = Math.max(0, this.noiseRing - dt * 1.4);

    // Pick up a salt sack by walking over it.
    for (const sack of level.sacks) {
      if (!sack.taken && dist(this.x, this.y, sack.x, sack.y) < 26) {
        sack.taken = true;
        this.sacks += 1;
        audio.pickup();
      }
    }
  }

  hitsSolid(px, py, solids) {
    for (const r of solids) {
      const cx = clamp(px, r.x, r.x + r.w);
      const cy = clamp(py, r.y, r.y + r.h);
      if (dist(px, py, cx, cy) < RADIUS) return true;
    }
    return false;
  }

  // Throw a pebble toward the clicked point. Returns the landing point, or
  // null when there are no pebbles left.
  throwPebble(tx, ty, audio) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const d = dist(this.x, this.y, tx, ty);
    const maxThrow = 260;
    const t = Math.min(1, maxThrow / Math.max(1, d));
    const lx = this.x + (tx - this.x) * t;
    const ly = this.y + (ty - this.y) * t;
    audio.pebble();
    return { x: lx, y: ly };
  }

  atExit(level) {
    if (!level.exit) return false;
    return dist(this.x, this.y, level.exit.x, level.exit.y) < 30;
  }
}
