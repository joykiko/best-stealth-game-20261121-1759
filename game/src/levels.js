// levels.js — the three harbours of Salt & Shadow, and the parser that turns
// a hand-drawn character map into the world the game plays on.
//
// Map legend (one character per 40px tile, 32 x 20 tiles):
//   '#' stone wall — blocks movement and sight
//   'C' tall crate — blocks movement and sight
//   'B' barrel — blocks movement, low enough to see over
//   'r' reed bed — walkable, hides you: guards see you far slower inside it
//   'w' harbour water — blocks movement
//   'L' lantern post — blocks movement, casts a pool of light (being lit makes
//       you easier to spot)
//   'S' salt sack — walkable, pick it up for score
//   'E' the rowboat — walkable, reach it unseen to finish the level
//   'P' where Wren starts
//   '.' wooden dock floor

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;

export const LEVELS = [
  {
    name: '1 · The Quay',
    brief: 'Slip past the night wardens and reach the rowboat. Salt sacks are optional — the boat is not.',
    par: 90,
    map: [
      '################################',
      '#P....r..C......r.......S......#',
      '#......C...........C...........#',
      '#..C.......####...........C....#',
      '#.........##..##.....r.........#',
      '#..r......##..##..C......C.....#',
      '#....C....######....S..........#',
      '#..............................#',
      '#..C......r.....C........C.....#',
      '#......S.............r.........#',
      '#...........####...............#',
      '#..r........#..#....C....S.....#',
      '#...........#..#...............#',
      '#....C......####...r....C......#',
      '#..............................#',
      '#..S....C.......C......r.......#',
      '#.........r...........C........#',
      '#....C...........S.............#',
      '#......r.....C...........E.....#',
      '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
    ],
    guards: [
      { path: [[15, 1], [4, 1]], pause: 1.4, speed: 52 },
      { path: [[27, 7], [27, 14]], pause: 1.0, speed: 55 },
      { path: [[6, 15], [6, 18]], pause: 1.2, speed: 50 },
    ],
    lanterns: [[16, 7], [8, 14], [24, 9]],
  },
  {
    name: '2 · Warehouse Row',
    brief: 'The warehouses hide good cover and better patrols. The wardens walk in pairs here — watch the gaps.',
    par: 120,
    map: [
      '################################',
      '#P....r....C......r......S.....#',
      '#..C.....#####.......C.........#',
      '#........#...#...r.............#',
      '#..r.....#...#.....C.....C.....#',
      '#....C...#####...S.............#',
      '#........r.....................#',
      '#..C.........C........r........#',
      '#......S.....####..............#',
      '#..r.........#..#....C.........#',
      '#...........#..#.......S.......#',
      '#....C......####....r..........#',
      '#..............................#',
      '#..C.....r......C........C.....#',
      '#.......S............r.........#',
      '#..r........C......S...........#',
      '#....C...........C......r......#',
      '#.........r..........C.........#',
      '#..S....C......S...........E...#',
      '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
    ],
    guards: [
      { path: [[14, 1], [3, 1]], pause: 1.2, speed: 58 },
      { path: [[28, 3], [28, 10]], pause: 1.0, speed: 60 },
      { path: [[6, 14], [18, 14]], pause: 1.4, speed: 56 },
      { path: [[12, 17], [26, 17]], pause: 1.0, speed: 62 },
    ],
    lanterns: [[16, 6], [10, 12], [22, 15], [27, 8]],
  },
  {
    name: '3 · The Customs House',
    brief: 'Five wardens, lit lanes and no patience left. Cross the yard, take the sacks if you dare, and vanish.',
    par: 150,
    map: [
      '################################',
      '#P....r.....C......r.......S...#',
      '#..C......#####......C.........#',
      '#........#...#....r....C.......#',
      '#..r.....#...#..####...........#',
      '#....C...#...#..#..#...S.......#',
      '#........#...#..#..#....r......#',
      '#..C.....#####..####......C....#',
      '#......S......r................#',
      '#..r........C......C....S......#',
      '#...........####...............#',
      '#....C.....#....#....r.........#',
      '#..........#....#..............#',
      '#..r.......######....C....S....#',
      '#..............................#',
      '#..C.....r......C........C.....#',
      '#.......S..........r...........#',
      '#....C.......C......S..........#',
      '#..S......r.........C.....E....#',
      '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
    ],
    guards: [
      { path: [[16, 1], [4, 1]], pause: 1.0, speed: 64 },
      { path: [[28, 2], [28, 9]], pause: 1.2, speed: 66 },
      { path: [[6, 12], [20, 12]], pause: 1.4, speed: 62 },
      { path: [[24, 15], [24, 18]], pause: 1.0, speed: 68 },
      { path: [[10, 17], [18, 17]], pause: 1.2, speed: 64 },
    ],
    lanterns: [[16, 8], [8, 13], [24, 11], [12, 16], [27, 17]],
  },
];

// Turn a level definition into the structures the game loop uses.
export function parseLevel(def) {
  const grid = [];
  const solids = []; // rects that block movement (walls, crates, barrels, lanterns, water)
  const sightBlockers = []; // subset of solids tall enough to block a vision cone
  const reeds = new Set();
  const sacks = [];
  let exit = null;
  let playerStart = null;

  for (let y = 0; y < ROWS; y++) {
    const row = def.map[y];
    grid.push([]);
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      const px = x * TILE;
      const py = y * TILE;
      let walkable = true;
      if (ch === '#' || ch === 'C') {
        walkable = false;
        const rect = { x: px, y: py, w: TILE, h: TILE };
        solids.push(rect);
        sightBlockers.push(rect);
      } else if (ch === 'B' || ch === 'w') {
        walkable = false;
        solids.push({ x: px, y: py, w: TILE, h: TILE });
      } else if (ch === 'r') {
        reeds.add(y * COLS + x);
      } else if (ch === 'S') {
        sacks.push({ x: px + TILE / 2, y: py + TILE / 2, taken: false });
      } else if (ch === 'E') {
        exit = { x: px + TILE / 2, y: py + TILE / 2, tx: x, ty: y };
      } else if (ch === 'P') {
        playerStart = { x: px + TILE / 2, y: py + TILE / 2 };
      }
      grid[y].push(walkable);
    }
  }

  const lanterns = def.lanterns.map(([gx, gy]) => {
    const rect = { x: gx * TILE, y: gy * TILE, w: TILE, h: TILE };
    solids.push(rect);
    grid[gy][gx] = false;
    return { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2, radius: 130 };
  });

  return {
    name: def.name,
    brief: def.brief,
    par: def.par,
    grid,
    solids,
    sightBlockers,
    reeds,
    sacks,
    exit,
    playerStart,
    lanterns,
    guards: def.guards,
    map: def.map,
  };
}

// True when the tile (gx, gy) is a reed bed — the hiding spots of the level.
export function isReed(level, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return false;
  return level.reeds.has(gy * COLS + gx);
}

// True when the point (px, py) lies inside any lantern's pool of light.
export function inLanternLight(level, px, py) {
  for (const lamp of level.lanterns) {
    const dx = px - lamp.x;
    const dy = py - lamp.y;
    if (dx * dx + dy * dy < lamp.radius * lamp.radius) return true;
  }
  return false;
}
