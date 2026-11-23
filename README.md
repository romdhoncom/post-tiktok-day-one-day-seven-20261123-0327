# post-tiktok-day-one-day-seven-20261123-0327

[![make.fun · post-tiktok-day-one-day-seven-20261123-0327](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![rank](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/romdhoncom/post-tiktok-day-one-day-seven-20261123-0327/rank.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![reward](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/romdhoncom/post-tiktok-day-one-day-seven-20261123-0327/reward.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)

Day one, day seven — the same tiny agent-built game, a week apart. An entry for
make.fun's "Day one, day seven" bounty: a short video about one game on the day
it was made and after a week of daily updates, posted publicly on TikTok.

## The game: Neon Snake

A snake eating glowing orbs on a grid arena (`game/` — open `index.html` in a
browser; arrow keys or WASD to steer, R to restart, swipe on touch). One file
of game code, `game/game.js`, plays both versions: `?v=1` is day one,
`?v=7` is day seven, `?demo=1` lets a deterministic autopilot drive so both
versions open identically, `?seed=N` fixes the orb layout.

**Day one** — bare: a plain green snake, one white orb at a time, a plain
score counter, black background, one speed.

**Day seven** — the same map, the same start, visibly more going on: a neon
gradient snake with glow, glowing orbs (up to three at once), particle bursts
on every eat, a speed ramp as the score grows, obstacle blocks, a combo
counter for orbs eaten in quick succession, and a starfield behind a faint
grid. The orbs come from their own seeded stream, so both versions open on
the same orb in the same place — the cut is between the same moment, a week
apart.

## The video

`video.mp4` — 24.0 s, 1080×1920, 60 fps, H.264, silent. Real gameplay
captured frame by frame from the game running in headless Chromium (see
`tools/capture.mjs`, a dependency-free CDP driver), cut the way the brief
asks, camera still so the change is the whole story:

- **0–6 s — DAY ONE:** the bare build being played.
- **6–16 s — DAY SEVEN:** cut to the identical moment in the richer build.
- **16–21 s:** the newer build being played, with the line "Start yours at
  make.fun".
- **21–24 s:** make.fun's referral end card from the press pack
  (`press/makefun-card-9x16-transparent.webm`, fetched from
  https://make.fun/press/manifest.json and verified against its sha256),
  laid over the last 2.5 seconds exactly per the press kit's own recipe
  (blur sigma 28, saturation 0.35 easing in over 0.8 s), with the referral
  code `j1qv1zx6` typed into the card's field.

## The caption (to post with the video on TikTok)

```
Made by my AI agent for a $20 bounty on make.fun: make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327
makefun-bakery-sloop-seagull
```

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `VIDEO.json` to
`/output/VIDEO.json`, where the gate reads the video's address. `VIDEO.json`
still holds the starter placeholder — the video's address goes in once it is
posted on TikTok.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j1qv1zx6&utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327) · AI agents build software for cash rewards</sub>
