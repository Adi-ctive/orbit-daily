# ORBIT

**Fifteen minutes. One mission. Every day.**

A free daily brain-training and STEM-learning app with cosmic pixel art. Press **Launch today's mission** for about 15 minutes of seeded puzzles, mini-games and one learning card. Then it locks until local midnight. Everyone gets the same levels on the same day, so friends can compare.

No ads, no accounts, no payments, no tracking. Progress lives on your device. ORBIT is a daily challenge for curiosity and fun; it makes no claims about improving memory, IQ or health.

## Install on Android

Open link in Chrome → ⋮ → Add to Home screen.

On iPhone: open the link in Safari → Share → Add to Home Screen.

## What's in a mission

1. **Warm-up:** one easy reflex game.
2. **Review:** quick questions on cards you charted on earlier days (spaced repetition).
3. **Core:** four games from four different skills, weighted toward your weakest, never repeating the last two days.
4. **Star Chart:** one new sourced science card.
5. **Boss:** a harder logic or maze puzzle.
6. **Debrief:** stars per skill and a spoiler-free share grid. Then the lock.

16 games: Thruster Abort, Catch the Comet, Orbit Tracker, Constellation Recall, Dead Reckoning, Signal Drift, Fuel Mix (24), Fermi Line, Doomsday Sprint, Truthful & Lying Aliens, Vanishing Walls, Escape the Void Beast, Pulsar Path, Star-Stick Equations, Signal from Deep Space (167 original riddles) and the Isobar Wind Reader.

## Develop

```bash
npm install
npm run dev
```

Dev builds only: add `?dev=1` for the dev panel (change date or seed, skip a round, unlock today). `/dev/sprites` previews the art, `/dev/game?id=fuel-mix&d=0.5` mounts one game, `/dev/og` renders the link-preview banner.

## Checks

```bash
npm run lint && npm run typecheck && npm test
```

```bash
npm run test:e2e
```

```bash
npm run build && npm run lighthouse
```

`npm test` includes a property test that generates 1,000 levels per game and checks each one is deterministic, verified solvable and generated in under 50 ms.

## Content

```bash
npm run content:build
```

Rebuilds `public/data` from Wikipedia (CC BY-SA 4.0), Wikidata (CC0) and GSM8K (MIT). Responses are cached in `pipeline/.cache`, so reruns are fast. Redeploying with new content shows a "New star charts arrived" note in the app.

## Deploy (Cloudflare Pages)

Connect the GitHub repository in the Cloudflare dashboard with build command `npm run build` and output directory `dist`, or deploy directly:

```bash
npm run build && npx wrangler pages deploy dist --project-name orbit-daily
```

`public/_headers` sets long caching for hashed assets and no caching for `index.html` and the service worker.

## Docs

- `docs/DECISIONS.md`: choices made during the build.
- `docs/STATUS.md`: what is done, known limits, what to add next.
- `docs/CONTENT_LICENSES.md` and `CREDITS.md`: every source and licence.
- `docs/screens/`: screenshots of every screen at three sizes.
