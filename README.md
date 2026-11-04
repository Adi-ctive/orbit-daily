# ORBIT

**Fifteen minutes. One mission. Every day.**

A free daily mission for focus, memory and curiosity, set in a calm, realistic space. Press **Launch today's mission** for about 15 minutes of fast, seeded games and one short explainer. Then it locks until local midnight. Everyone gets the same levels and the same explainer on the same day.

No ads, no accounts, no payments, no tracking. Progress lives on your device. ORBIT is a daily challenge for focus and curiosity. It makes no claims about improving memory, IQ or health.

## Install on Android

Open link in Chrome → ⋮ → Add to Home screen.

On iPhone: open the link in Safari → Share → Add to Home Screen.

## What's in a mission

1. **Warm-up:** one reflex game.
2. **Core:** four games from four different skills, weighted toward your weakest, never repeating the last two days.
3. **Explainer:** one idea worth knowing (politics, economics, psychology, philosophy, maths, physics, space, engineering, Earth or life sciences), about three minutes, no quiz.
4. **Boss:** a harder logic or maze puzzle.
5. **Debrief:** scores per skill and a spoiler-free share grid. Then the lock.

16 games: Thruster Abort, Catch the Comet, Orbit Tracker, Constellation Recall, Dead Reckoning, Signal Drift, Fuel Mix (24), Fermi Line, Doomsday Sprint, Truthful & Lying Aliens, Vanishing Walls, Escape the Void Beast, Pulsar Path, Star-Stick Equations, Signal from Deep Space (167 original riddles) and the Isobar Wind Reader.

## Develop

```bash
npm install
npm run dev
```

Dev builds only: add `?dev=1` for the dev panel (change date or seed, skip a round, unlock today). `/dev/game?id=fuel-mix&d=0.5` mounts one game, `/dev/og` renders the link-preview banner, and `&forcegl` forces the WebGL planet in headless browsers.

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

## Deploy (Cloudflare Pages)

Connect the GitHub repository in the Cloudflare dashboard with build command `npm run build` and output directory `dist`, or deploy directly:

```bash
npm run build && npx wrangler pages deploy dist --project-name orbit-daily --branch main
```

`public/_headers` sets long caching for hashed assets and no caching for `index.html` and the service worker.

## Docs

- `docs/DECISIONS.md`: choices made during the build.
- `docs/STATUS.md`: what is done, known limits, what to add next.
- `CREDITS.md`: every source and licence.
- `docs/screens/`: screenshots of every screen at three sizes.
