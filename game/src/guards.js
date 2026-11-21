// guards.js — the harbour wardens: their patrols, their lantern vision cones,
// and the detection meter that decides when a quiet walk becomes a chase.
//
// A guard lives in one of four states:
//   patrol     — walks its waypoints, pausing to look around at each one
//   suspicious — saw something briefly; turns toward it, meter drains
//   chase      — meter full; runs at the player until sight is broken
//   search     — lost the player; walks to the last seen spot, looks around,
//                then gives up and returns to patrol
// The player always gets a chance to recover: breaking line of sight for a
// few seconds drops a chasing guard back to search, then patrol.

import { clamp, dist, angleDiff, segmentBlocked, findPath } from './util.js';
import { TILE, COLS, ROWS } from './levels.js';

export const CONE_RANGE = 195;
export const CONE_HALF_ANGLE = 0.7; // ~80 degrees of vision
export const CHASE_RANGE = 230;

const STEP_SOUND_EVERY = 0.42; // seconds between audible footstep rings

export class Guard {
  constructor(def, level) {
    this.level = level;
    this.waypoints = def.path;
    this.pauseTime = def.pause;
    this.patrolSpeed = def.speed;
    this.chaseSpeed = def.speed * 1.85;
    this.state = 'patrol';
    this.leg = 0;
    this.target = this.waypoints[1] || this.waypoints[0];
    this.x = (this.waypoints[0][0] + 0.5) * TILE;
    this.y = (this.waypoints[0][1] + 0.5) * TILE;
    this.facing = 0;
    this.meter = 0; // 0..100, how sure this guard is that someone is there
    this.pauseLeft = 0.6;
    this.scanDir = 1;
    this.path = null; // tile steps the guard is walking, from findPath
    this.loseTimer = 0;
    this.searchTimer = 0;
    this.stepTimer = 0;
    this.ring = 0; // footstep ring animation 0..1, drawn by render.js
    this.lastSeen = null;
    this.lookTarget = null;
  }

  // Walk toward a tile centre; returns true when arrived.
  moveToward(tx, ty, speed, dt) {
    const d = dist(this.x, this.y, tx, ty);
    if (d < 3) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + ((tx - this.x) / d) * step;
    const ny = this.y + ((ty - this.y) / d) * step;
    this.facing = Math.atan2(ny - this.y, nx - this.x);
    this.x = nx;
    this.y = ny;
    return d - step < 3;
  }

  // Follow a BFS tile path; returns true when the path is finished.
  followPath(dt, speed) {
    if (!this.path || !this.path.length) return true;
    const [gx, gy] = this.path[0];
    const arrived = this.moveToward((gx + 0.5) * TILE, (gy + 0.5) * TILE, speed, dt);
    if (arrived) this.path.shift();
    return !this.path.length;
  }

  startLeg() {
    const from = [Math.floor(this.x / TILE), Math.floor(this.y / TILE)];
    const to = this.target;
    this.path = findPath(this.level.grid, from[0], from[1], to[0], to[1]) || [];
  }

  // Can this guard see the point (px, py)? A target inside the cone, within
  // range, with no wall or crate between guard and target.
  canSee(px, py) {
    const d = dist(this.x, this.y, px, py);
    if (d > CONE_RANGE) return false;
    const ang = Math.atan2(py - this.y, px - this.x);
    if (Math.abs(angleDiff(this.facing, ang)) > CONE_HALF_ANGLE) return false;
    if (segmentBlocked(this.x, this.y, px, py, this.level.sightBlockers)) return false;
    return true;
  }

  // How fast the meter fills while the guard sees the player: close is fast,
  // standing in lantern light is faster, hiding in reeds is far slower.
  fillRate(player, d) {
    let rate = 170 - d * 0.55; // 170/s point blank, ~63/s at full range
    if (player.sneaking) rate *= 0.45;
    if (player.inReeds) rate *= 0.35;
    if (player.inLight) rate *= 1.5;
    if (player.running) rate *= 1.25;
    return Math.max(28, rate);
  }

  update(dt, player, audio) {
    // --- vision: the meter is the guard's memory of the player ---
    const sees = this.canSee(player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);
    if (sees) {
      this.meter = clamp(this.meter + this.fillRate(player, d) * dt, 0, 100);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
    } else {
      this.meter = clamp(this.meter - 26 * dt, 0, 100);
      if (this.state === 'chase') this.loseTimer += dt;
    }

    // --- state changes ---
    if (this.meter >= 100 && this.state !== 'chase') {
      this.state = 'chase';
      this.loseTimer = 0;
      audio.alert();
    } else if (this.state === 'chase' && this.loseTimer > 3.2) {
      this.state = 'search';
      this.searchTimer = 0;
      this.path = null;
    } else if (this.state === 'suspicious' && this.meter < 12) {
      this.state = 'patrol';
      this.path = null;
    }

    // --- behaviour per state ---
    if (this.state === 'patrol') {
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        // Look around while waiting: slow scan, so a patient player can time it.
        this.facing += this.scanDir * 0.9 * dt;
        if (this.pauseLeft <= 0) {
          this.leg = (this.leg + 1) % this.waypoints.length;
          this.target = this.waypoints[(this.leg + 1) % this.waypoints.length];
          this.startLeg();
        }
      } else if (this.followPath(dt, this.patrolSpeed)) {
        this.pauseLeft = this.pauseTime;
        this.scanDir = Math.random() < 0.5 ? 1 : -1;
      }
      if (this.meter > 40) {
        this.state = 'suspicious';
        this.lookTarget = this.lastSeen;
      }
    } else if (this.state === 'suspicious') {
      if (this.lookTarget) {
        const want = Math.atan2(this.lookTarget.y - this.y, this.lookTarget.x - this.x);
        this.facing += clamp(angleDiff(this.facing, want), -2.4 * dt, 2.4 * dt);
      }
    } else if (this.state === 'chase') {
      if (sees || this.lastSeen) {
        const tx = sees ? player.x : this.lastSeen.x;
        const ty = sees ? player.y : this.lastSeen.y;
        this.moveToward(tx, ty, this.chaseSpeed, dt);
      }
      // Catching the player ends the level.
      if (dist(this.x, this.y, player.x, player.y) < 20) {
        player.caught = true;
      }
    } else if (this.state === 'search') {
      this.searchTimer += dt;
      if (!this.path && this.lastSeen) {
        const from = [Math.floor(this.x / TILE), Math.floor(this.y / TILE)];
        const to = [clamp(Math.floor(this.lastSeen.x / TILE), 0, COLS - 1), clamp(Math.floor(this.lastSeen.y / TILE), 0, ROWS - 1)];
        this.path = findPath(this.level.grid, from[0], from[1], to[0], to[1]) || [];
      }
      if (this.followPath(dt, this.patrolSpeed * 1.25)) {
        if (this.searchTimer > 1.2) {
          this.facing += 1.6 * dt;
          if (this.searchTimer > 4.5) {
            this.state = 'patrol';
            this.searchTimer = 0;
            this.path = null;
          }
        }
      }
      if (this.meter > 55) this.state = 'suspicious';
    }

    // --- footsteps: a soft ring the player can see and hear ---
    this.stepTimer -= dt;
    const moving = this.state === 'patrol' || this.state === 'chase' || this.state === 'search';
    if (moving && this.stepTimer <= 0 && (this.path?.length || this.state === 'chase')) {
      this.stepTimer = STEP_SOUND_EVERY;
      this.ring = 1;
      audio.step(this.x, this.y, true);
    }
    if (this.ring > 0) this.ring = Math.max(0, this.ring - dt * 1.6);
  }

  // A pebble landing nearby, or a loud run past: go look at that spot.
  investigate(x, y) {
    if (this.state === 'chase') return;
    this.state = 'search';
    this.searchTimer = 0;
    this.lastSeen = { x, y };
    this.path = null;
    this.meter = Math.max(this.meter, 45);
  }

  // Cone colour and alert state for the renderer.
  coneColor() {
    if (this.state === 'chase') return 'rgba(255,64,54,0.34)';
    if (this.state === 'suspicious' || this.state === 'search') return 'rgba(255,176,66,0.30)';
    return 'rgba(255,214,120,0.26)';
  }

  mark() {
    if (this.state === 'chase') return '!';
    if (this.meter > 40) return '?';
    return null;
  }
}
