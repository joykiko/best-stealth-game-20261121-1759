// util.js — small math and line-of-sight helpers shared by the whole game.
// Nothing here knows about guards, the player or drawing: only numbers and grids.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Smallest signed angle from a to b, in (-PI, PI].
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the segment (x0,y0)->(x1,y1) touches any rect in `solids`.
// Used for vision cones: a wall or a tall crate between guard and player hides the player.
export function segmentBlocked(x0, y0, x1, y1, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x0, y0, x1, y1, r)) return true;
  }
  return false;
}

function segmentHitsRect(x0, y0, x1, y1, r) {
  // Slab test: clip the segment's parameter range against the rect's x span,
  // then against its y span. A non-empty surviving range means a hit.
  const dx = x1 - x0;
  const dy = y1 - y0;
  const rx = slabRange(x0, dx, r.x, r.x + r.w, 0, 1);
  if (!rx) return false;
  const ry = slabRange(y0, dy, r.y, r.y + r.h, rx[0], rx[1]);
  return !!ry;
}

function slabRange(p, d, lo, hi, t0, t1) {
  if (Math.abs(d) < 1e-9) {
    return p >= lo && p <= hi ? [t0, t1] : null;
  }
  let a = (lo - p) / d;
  let b = (hi - p) / d;
  if (a > b) { const t = a; a = b; b = t; }
  const nt0 = Math.max(t0, a);
  const nt1 = Math.min(t1, b);
  return nt0 <= nt1 ? [nt0, nt1] : null;
}

// Breadth-first shortest path on a grid of walkable tiles.
// grid[y][x] is true when the tile can be walked on. Returns a list of
// [gx, gy] tile centres to walk through (excluding the start tile), or null.
export function findPath(grid, sx, sy, tx, ty) {
  const h = grid.length;
  const w = grid[0].length;
  if (sx === tx && sy === ty) return [];
  const key = (x, y) => y * w + x;
  const prev = new Map();
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!grid[ny][nx]) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, [x, y]);
      if (nx === tx && ny === ty) {
        const path = [[tx, ty]];
        let cur = [tx, ty];
        while (!(cur[0] === sx && cur[1] === sy)) {
          cur = prev.get(key(cur[0], cur[1]));
          path.unshift(cur);
        }
        path.shift(); // drop the start tile itself
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}
