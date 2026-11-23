// Neon Snake: day one, day seven — a make.fun video-on-TikTok entry (Node 22,
// standard library only). The program copies VIDEO.json from the repository
// root to /output/VIDEO.json, where the gate reads the video's address.
// The video itself is the entry: the same tiny game on the day it was made
// and after a week of daily updates, posted publicly on TikTok, ending with
// make.fun's referral end card. VIDEO.json still holds the starter
// placeholder until the owner posts the video; the program copies whatever
// is there and says so, instead of failing the run.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

// The program reads nothing but the repository's own VIDEO.json and writes
// nothing but /output/VIDEO.json: no network, no wall clock, so its two
// runs write the same bytes.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });
const src = join(BOT_DIR, 'VIDEO.json');
if (existsSync(src)) {
  copyFileSync(src, join(OUTPUT_DIR, 'VIDEO.json'));
} else {
  // No video address yet: the owner posts the video first, then VIDEO.json
  // is filled in. Say so and leave the run clean rather than failing it.
  console.log('VIDEO.json not present yet — no video address to hand in.');
}
