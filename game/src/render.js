// render.js — everything the player sees: the night harbour, the lantern
// cones, the cover, the lighting that shows what is safe, the HUD and the
// title and end screens. All art is drawn with canvas calls; the game ships
// no image files.
//
// The look, in one sentence: a dark wooden quay at night, warm lantern
// pools, and the guards' yellow cones sweeping across it — so that at a
// glance, in a screenshot shrunk to a contact sheet, you can read the level,
// the guards, the cover and the exit.

import { TILE, COLS, ROWS } from './levels.js';
import { CONE_RANGE, CONE_HALF_ANGLE, CHASE_RANGE } from './guards.js';

const W = COLS * TILE; // 1280
const H = ROWS * TILE; // 800

// Deterministic pseudo-random from two integers: stable plank shading that
// never changes between frames.
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

export class Renderer {
  constructor() {
    this.light = document.createElement('canvas');
    this.light.width = W;
    this.light.height = H;
    this.waterT = 0;
  }

  draw(ctx, s, dt) {
    this.waterT += dt;
    const level = s.level;
    this.drawFloor(ctx, level);
    this.drawReeds(ctx, level);
    this.drawSacks(ctx, level, s.time);
    this.drawExit(ctx, level, s.time);
    this.drawSolids(ctx, level);
    this.drawLanterns(ctx, level);
    for (const g of s.guards) this.drawCone(ctx, g);
    for (const g of s.guards) this.drawGuard(ctx, g);
    this.drawPebbles(ctx, s);
    this.drawPlayer(ctx, s);
    this.drawRings(ctx, s);
    this.drawLighting(ctx, s);
    this.drawHUD(ctx, s);
    if (s.state === 'title') this.drawTitle(ctx, s);
    if (s.state === 'clear') this.drawLevelClear(ctx, s);
    if (s.state === 'caught') this.drawCaught(ctx, s);
    if (s.state === 'complete') this.drawComplete(ctx, s);
    if (s.state === 'paused') this.drawPaused(ctx);
    if (s.message && s.messageTimer > 0) this.drawMessage(ctx, s);
  }

  // --- the harbour floor: wooden dock planks, stone at the edges, water ---
  drawFloor(ctx, level) {
    ctx.fillStyle = '#171310';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = level.map[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const v = hash(x, y);
        if (ch === 'w') {
          const bob = Math.sin(this.waterT * 1.4 + x * 0.7 + y) * 3;
          ctx.fillStyle = '#0a2036';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = 'rgba(96,160,210,0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 12 + bob);
          ctx.lineTo(px + 34, py + 12 + bob);
          ctx.moveTo(px + 4, py + 28 - bob);
          ctx.lineTo(px + 30, py + 28 - bob);
          ctx.stroke();
          continue;
        }
        if (ch === '#') continue; // walls drawn later, over the floor
        const shade = 38 + v * 14;
        ctx.fillStyle = `rgb(${shade + 14},${shade - 2},${shade - 12})`;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(px, py + TILE / 2);
        ctx.lineTo(px + TILE, py + TILE / 2);
        ctx.stroke();
      }
    }
  }

  drawReeds(ctx, level) {
    for (const key of level.reeds) {
      const gx = key % COLS;
      const gy = Math.floor(key / COLS);
      const px = gx * TILE;
      const py = gy * TILE;
      ctx.fillStyle = '#1d3a24';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = '#3f7a44';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const bx = px + 5 + i * 6 + hash(gx, gy * 7 + i) * 4;
        const sway = Math.sin(this.waterT * 1.1 + gx + i) * 2;
        ctx.beginPath();
        ctx.moveTo(bx, py + TILE - 3);
        ctx.quadraticCurveTo(bx + sway, py + 16, bx + sway * 2, py + 4 + hash(i, gy) * 8);
        ctx.stroke();
      }
    }
  }

  drawSacks(ctx, level, time) {
    for (const sack of level.sacks) {
      if (sack.taken) continue;
      const bob = Math.sin(time * 3 + sack.x) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(sack.x, sack.y + 12, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a86a';
      ctx.beginPath();
      ctx.moveTo(sack.x - 11, sack.y + 10 + bob);
      ctx.quadraticCurveTo(sack.x - 13, sack.y - 8 + bob, sack.x, sack.y - 12 + bob);
      ctx.quadraticCurveTo(sack.x + 13, sack.y - 8 + bob, sack.x + 11, sack.y + 10 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a6d3b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sack.x - 8, sack.y - 2 + bob);
      ctx.lineTo(sack.x + 8, sack.y - 2 + bob);
      ctx.stroke();
      ctx.fillStyle = '#fff2c0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SALT', sack.x, sack.y - 16 + bob);
    }
  }

  drawExit(ctx, level, time) {
    const e = level.exit;
    if (!e) return;
    const pulse = 0.5 + Math.sin(time * 2.4) * 0.2;
    ctx.strokeStyle = `rgba(120,220,255,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 30 + pulse * 4, 20 + pulse * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The rowboat: a small hull with two benches, moored at the water's edge.
    ctx.fillStyle = '#6d4a2f';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 24, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5f3c';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 19, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - 14, e.y - 3);
    ctx.lineTo(e.x + 14, e.y - 3);
    ctx.moveTo(e.x - 14, e.y + 4);
    ctx.lineTo(e.x + 14, e.y + 4);
    ctx.stroke();
    ctx.fillStyle = '#bfe9ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROWBOAT · EXIT', e.x, e.y - 30);
  }

  drawSolids(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = level.map[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const v = hash(x * 3, y * 5);
        if (ch === '#') {
          ctx.fillStyle = '#3d4552';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = `rgb(${58 + v * 12},${66 + v * 12},${80 + v * 12})`;
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        } else if (ch === 'C') {
          ctx.fillStyle = '#7a5a33';
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#8f6c3e';
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = '#5d4326';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE - 4, py + TILE - 4);
          ctx.moveTo(px + TILE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE - 4);
          ctx.stroke();
        } else if (ch === 'B') {
          ctx.fillStyle = '#5d4326';
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2, py + TILE / 2, 15, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7a5a33';
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2, py + TILE / 2, 12, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#3a2a18';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2, py + TILE / 2, 12, 12, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  drawLanterns(ctx, level) {
    for (const lamp of level.lanterns) {
      const flicker = 0.85 + Math.sin(this.waterT * 6 + lamp.x) * 0.08 + Math.sin(this.waterT * 11 + lamp.y) * 0.07;
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 70);
      glow.addColorStop(0, `rgba(255,200,110,${0.5 * flicker})`);
      glow.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2418';
      ctx.fillRect(lamp.x - 3, lamp.y - 4, 6, 22);
      ctx.fillStyle = '#ffd678';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2c2418';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 8, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- guards and their cones ---
  drawCone(ctx, g) {
    const half = CONE_HALF_ANGLE;
    const range = g.state === 'chase' ? CHASE_RANGE : CONE_RANGE;
    const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, range);
    grad.addColorStop(0, g.coneColor());
    grad.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, range, g.facing - half, g.facing + half);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = g.state === 'chase' ? 'rgba(255,80,60,0.55)' : 'rgba(255,220,140,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, range, g.facing - half, g.facing + half);
    ctx.closePath();
    ctx.stroke();
  }

  drawGuard(ctx, g) {
    // Soft shadow, then the warden: dark blue coat, brass trim, peaked cap,
    // and the lantern swinging at his side — bright against the dark floor.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#274b73';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f2233';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8b25c';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(g.x, g.y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    // Peaked cap.
    ctx.fillStyle = '#16283a';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 4, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(g.x - 9, g.y - 5, 18, 3);
    // Facing tick and the lantern in his hand.
    const fx = g.x + Math.cos(g.facing) * 16;
    const fy = g.y + Math.sin(g.facing) * 16;
    ctx.fillStyle = '#ffd678';
    ctx.beginPath();
    ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,120,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    // Detection mark: ? when suspicious, ! when chasing.
    const mark = g.mark();
    if (mark) {
      ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb042';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mark, g.x, g.y - 24);
    }
    // The meter, as a thin arc above the guard — the near miss, made visible.
    if (g.meter > 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = g.meter >= 100 ? '#ff5040' : '#ffb042';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + (g.meter / 100) * Math.PI * 2);
      ctx.stroke();
    }
    // Footstep ring.
    if (g.ring > 0) {
      ctx.strokeStyle = `rgba(150,190,255,${0.35 * g.ring})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 12 + (1 - g.ring) * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPebbles(ctx, s) {
    for (const p of s.pebbles) {
      const ttl = p.ttl / 1.2;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * ttl})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + (1 - ttl) * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cfd6e4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(ctx, s) {
    const p = s.player;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wren: a teal hooded cloak, readable against the brown dock at a glance.
    ctx.fillStyle = p.inReeds ? '#1f7a5c' : '#2aa198';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d4a44';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    // Hood point and the satchel.
    ctx.fillStyle = '#1d7a70';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 14);
    ctx.quadraticCurveTo(p.x + 8, p.y - 6, p.x + 4, p.y + 2);
    ctx.quadraticCurveTo(p.x, p.y - 2, p.x - 4, p.y + 2);
    ctx.quadraticCurveTo(p.x - 8, p.y - 6, p.x, p.y - 14);
    ctx.fill();
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(p.x + 6, p.y + 2, 7, 6);
    // Facing tick.
    const fx = p.x + p.dirX * 15;
    const fy = p.y + p.dirY * 15;
    ctx.fillStyle = '#e8fff8';
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();
    if (p.sneaking) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAKING', p.x, p.y - 22);
    }
  }

  drawRings(ctx, s) {
    const p = s.player;
    if (p.ring > 0) {
      ctx.strokeStyle = `rgba(180,220,255,${0.3 * p.ring})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 + (1 - p.ring) * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.noiseRing > 0) {
      ctx.strokeStyle = `rgba(255,120,90,${0.5 * p.noiseRing})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + (1 - p.noiseRing) * p.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,120,90,${0.7 * p.noiseRing})`;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOUD!', p.x, p.y - 24);
    }
  }

  // --- night lighting: darkness everywhere except around lights and the player ---
  drawLighting(ctx, s) {
    const lc = this.light.getContext('2d');
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = 'rgba(4,8,20,0.52)';
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const g = lc.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(x, y, r, 0, Math.PI * 2);
      lc.fill();
    };
    hole(s.player.x, s.player.y, 150, 0.85);
    for (const lamp of s.level.lanterns) hole(lamp.x, lamp.y, lamp.radius + 30, 0.9);
    for (const g of s.guards) hole(g.x, g.y, 90, 0.55);
    if (s.level.exit) hole(s.level.exit.x, s.level.exit.y, 110, 0.7);
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0);
  }

  // --- HUD ---
  drawHUD(ctx, s) {
    const p = s.player;
    ctx.fillStyle = 'rgba(6,10,22,0.82)';
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.level.name, 16, 28);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#c9a86a';
    ctx.fillText(`Salt ${p.sacks}/${s.level.sacks.length}`, 220, 28);
    ctx.fillStyle = '#cfd6e4';
    ctx.fillText(`Pebbles ${p.pebbles}`, 330, 28);
    ctx.fillStyle = '#9fb4d8';
    ctx.fillText(`Time ${Math.floor(s.time)}s`, 450, 28);
    // The loudest alarm: the highest guard meter, as a bar.
    const worst = s.guards.reduce((m, g) => Math.max(m, g.meter), 0);
    const label = worst >= 100 ? 'SPOTTED!' : worst > 40 ? 'SUSPICIOUS' : 'UNSEEN';
    ctx.fillStyle = '#e8ecf4';
    ctx.fillText(label, 580, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(700, 16, 220, 14);
    ctx.fillStyle = worst >= 100 ? '#ff5040' : worst > 40 ? '#ffb042' : '#2aa198';
    ctx.fillRect(700, 16, 220 * (worst / 100), 14);
    ctx.fillStyle = '#9fb4d8';
    ctx.textAlign = 'right';
    ctx.fillText('M — mute', W - 16, 28);
    ctx.textAlign = 'left';
    // Objective line under the bar.
    ctx.fillStyle = 'rgba(6,10,22,0.6)';
    ctx.fillRect(0, 44, W, 24);
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '14px sans-serif';
    ctx.fillText(s.level.brief, 16, 61);
  }

  drawMessage(ctx, s) {
    ctx.fillStyle = `rgba(6,10,22,${Math.min(0.85, s.messageTimer)})`;
    const w = ctx.measureText(s.message).width + 40;
    ctx.fillRect((W - w) / 2, 84, w, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.message, W / 2, 107);
    ctx.textAlign = 'left';
  }

  panel(ctx, title, lines, foot) {
    ctx.fillStyle = 'rgba(4,7,16,0.72)';
    ctx.fillRect(0, 0, W, H);
    const pw = 640;
    const ph = 110 + lines.length * 30 + (foot ? 46 : 0);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    ctx.fillStyle = '#101828';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, py + 56);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '17px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 100 + i * 30));
    if (foot) {
      ctx.fillStyle = '#9fb4d8';
      ctx.font = '15px sans-serif';
      ctx.fillText(foot, W / 2, py + ph - 22);
    }
    ctx.textAlign = 'left';
  }

  drawTitle(ctx, s) {
    ctx.fillStyle = 'rgba(4,7,16,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALT & SHADOW', W / 2, 250);
    ctx.fillStyle = '#bfe9ff';
    ctx.font = '26px sans-serif';
    ctx.fillText('— The Harbour Run —', W / 2, 292);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '18px sans-serif';
    ctx.fillText('Three nights. Three harbours. One rowboat home.', W / 2, 340);
    ctx.fillText('Slip past the wardens, take the salt if you dare, and reach the boat unseen.', W / 2, 368);
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('WASD / arrows — move      Shift — run (loud!)      C — sneak', W / 2, 440);
    ctx.fillText('Mouse click — throw a pebble to distract a guard      Reeds hide you · Lantern light exposes you', W / 2, 468);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px sans-serif';
    const blink = 0.6 + Math.sin(s.time * 4) * 0.4;
    ctx.fillStyle = `rgba(255,233,168,${blink})`;
    ctx.fillText('Click or press Enter to begin', W / 2, 540);
    ctx.textAlign = 'left';
  }

  drawLevelClear(ctx, s) {
    const stars = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
    this.panel(ctx, 'LEVEL CLEAR', [
      `${s.level.name} — the boat slips away into the fog.`,
      `${stars}   Salt ${s.player.sacks}/${s.level.sacks.length}   ·   Time ${Math.floor(s.time)}s (par ${s.level.par}s)`,
      `Score ${s.score}`,
    ], s.levelIndex + 1 < 3 ? 'Press Enter for the next harbour' : 'Press Enter to see how the run ends');
  }

  drawCaught(ctx, s) {
    this.panel(ctx, 'SPOTTED!', [
      'A warden caught you in the lantern light.',
      'The harbour keeps its salt tonight — unless you try again.',
      `Salt carried: ${s.player.sacks}`,
    ], 'Press R to try this harbour again');
  }

  drawComplete(ctx, s) {
    const stars = '★'.repeat(s.totalStars) + '☆'.repeat(9 - s.totalStars);
    this.panel(ctx, 'THE HARBOUR IS YOURS', [
      'Three harbours, one rowboat, and not a single warden the wiser.',
      `${stars}   ${s.totalStars}/9 stars   ·   Total score ${s.score}`,
      'Salt & Shadow — an original game, drawn and coded for this bounty.',
    ], 'Press Enter to run the harbour again');
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(4,7,16,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#9fb4d8';
    ctx.fillText('Press Esc to keep sneaking', W / 2, H / 2 + 36);
    ctx.textAlign = 'left';
  }
}
