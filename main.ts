// main.ts — Salt & Shadow: The Harbour Run. The entrypoint the grader runs
// (Node 22, standard library only). It copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json with the
// vendored make.fun library, exactly as the kit's RULES.txt asks.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always writes the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outDir, 'game'));

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir)) {
    if (name.startsWith('.')) continue;
    cpSync(join(shotsDir, name), join(outDir, 'screenshots', name));
  }
}

// The scorer's own caps, from the kit's reference/gate.json: the dossier
// text is capped at 160 KiB, at most 4 screenshots of 256 KiB each, and
// game/ holds at most 993 files and 48 MiB with paths under 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
