# BUILD PROMPT — "ORBIT" Daily Cosmic Brain Trainer

> Paste everything below into Claude Code from an empty project folder. Put the research report in the same folder as `docs/research.md` first; this prompt refers to it. ("ORBIT" is a working name; rename freely.)

---

You are building a complete, production-quality, installable web app (a PWA) from scratch. Work autonomously through every phase below. Do not stop to ask questions unless a decision is truly irreversible. Where something is unspecified, choose the option that best fits this spec, write it down in `docs/DECISIONS.md`, and continue. After each phase, run that phase's quality gate, fix everything it reports, commit, then move on.

Read `docs/research.md` before you write any code. It contains the market research, the 65-game catalogue, the content licences, the stack research and the session-design research. This prompt overrides it wherever they disagree.

## 0. What this is

This is a free daily brain-training and STEM-learning app with a cosmic hi-bit pixel-art identity.

- The user presses one button, **"Launch today's mission"**. That starts one session of about 15 minutes, made of randomised puzzles, mini-games and one learning card.
- Once the session is finished, or the daily cap is reached, the app **locks until local midnight**.
- Every day brings different, randomly generated levels.
- The audience is the owner and his friends, possibly shared later through a LinkedIn post.
- **Non-commercial.** It will never have ads, payments or accounts in v1.
- **Primary target:** Android phones in Chrome, installed to the home screen. It must also work well on desktop browsers and degrade gracefully on iOS Safari.

## 1. Locked platform decisions (do not revisit)

| Decision | Choice | Why |
|---|---|---|
| Platform | **PWA**: one hosted site, installable on Android ("Add to Home screen"), fully offline after first load | One codebase, a shareable link, no store needed, works like an app |
| Unity | **Not used** | Unity WebGL builds are heavy, start slowly and run poorly in mobile browsers. An APK would need sideloading. A PWA beats both for this use |
| Play Store | **Not used** | Not wanted. A Trusted Web Activity wrapper can be added later if ever needed |
| Hosting | **Cloudflare Pages** free plan (unlimited bandwidth). GitHub Pages is the fallback | ₹0 |
| Backend | **None in v1.** All data ships as static files and all progress lives on the device | ₹0, private, nothing to maintain |
| Accounts / analytics / ads | None in v1 | Privacy. India's DPDP rules for minors apply from May 2027 |

## 2. Tech stack

- **Build:** Vite + **Svelte 5** + TypeScript in strict mode.
- **PWA:** `vite-plugin-pwa` (Workbox), plus a manifest with maskable icons and a dark cosmic splash/theme colour.
- **Rendering:**
  - Game scenes are drawn on an HTML **Canvas 2D** context at a low *native pixel resolution*, then scaled up by an **integer** factor with `image-rendering: pixelated`.
  - UI menus and text use DOM/Svelte so they stay accessible and crisp.
  - Use WebGL (a tiny custom shader, no engine) only where a procedural effect needs it, such as nebula backgrounds. Always provide a Canvas 2D fallback.
- **Storage:** IndexedDB through `idb-keyval` or a small `idb` wrapper. Call `navigator.storage.persist()` on first run.
- **Random numbers:** a seeded PRNG, using `xmur3` to hash the seed string and `sfc32` to generate numbers. **Never use `Math.random()` in game or content logic.** Add a lint rule that forbids it outside `src/lib/rng.ts`.
- **Audio:** the Web Audio API through a small custom `AudioBus` with separate music, SFX and UI channels. Howler.js is acceptable if it saves time.
- **Testing:**
  - Vitest for unit and property tests.
  - Playwright for end-to-end tests, run at mobile (Pixel 7) and desktop viewports.
  - Lighthouse CI.
- **Tooling:** ESLint, Prettier, svelte-check, and a pre-commit hook that runs lint, typecheck and unit tests.

## 3. Art direction — cosmic hi-bit pixel art

The goal is **"hi-bit" pixel art**: modern, detailed pixel art with rich palettes, dithering, rim lighting, glow, parallax and smooth animation. Think of the polish of Eastward, Octopath Traveler or Celeste's skies. It must **not** look like 8-bit NES art. The look comes from detail, palette and animation inside a pixel grid, not from blur or smooth vector art.

### 3.1 Rendering rules
- **Native resolution:**
  - Design the game canvas at a native resolution such as 320×568 for portrait phones, adapting the width to the screen's aspect ratio.
  - Upscale by the largest integer factor that fits, and letterbox the remaining space with the animated starfield.
  - Never use non-integer scaling and never let the browser smooth pixels.
- **Sprite sizes:**
  - Detailed hero sprites (planets, ships, the mascot, game pieces): 32–128 px.
  - Background planets and celestial bodies: up to 256 px.
- **Palette:**
  - Use one master palette of about 48 colours, defined in `src/art/palette.ts`, based on deep space: indigo, violet and teal shadows, warm star-whites, magenta and cyan nebula accents, and amber for UI highlights.
  - Every procedural and hand-made asset is quantised to this palette.
  - Use ordered (Bayer) dithering for gradients.
- **Pixel-perfect motion:** draw everything at whole-pixel positions on the native canvas. Animate smoothly through extra frames and sub-pixel easing that is snapped at draw time, not through blurring.
- **Glow and bloom:** build these as pixel-art halos (a few palette steps of dithered rings), never a CSS blur on the game canvas.

### 3.2 Asset strategy

Claude Code cannot paint detailed raster art by hand. Get high-detail results in this order:

1. **Procedural pixel art, rendered in code.** This is the main source, and the cosmic theme suits it perfectly.
   - **Planet generator:** noise-based terrain, gas-giant bands, an ice/lava/terran/ring palette, 3D sphere shading with a light direction, rim light, dithered terminator, rotating animation, optional rings and moons.
   - **Nebula/galaxy backgrounds:** layered fBm noise quantised to the palette, with 3–4 parallax layers of stars of varying size and twinkle.
   - **Other effects:** asteroid fields, comets with pixel trails, black-hole lensing rings, aurora ribbons, starfield warp transitions.
   - Generate these from the **daily seed** so each day's sky is unique and shared by everyone that day.
   - Pre-render to offscreen canvases or sprite sheets at load time to save battery.
2. **Code-authored sprite sheets** for icons, UI frames, buttons, the mascot and game pieces.
   - Write them as indexed-colour pixel arrays or compact string maps in `src/art/sprites/`.
   - Build them carefully at 32–64 px with proper shading (at least 3–4 tones per material), outlines that use coloured outlines rather than pure black, and animation frames for idle, hover, press, success and fail.
   - Write a small dev-only sprite preview page at `/dev/sprites`.
3. **Free external asset packs**, only where 1 and 2 can't reach the quality.
   - Use only **CC0** or **MIT** licensed packs, for example from Kenney, OpenGameArt filtered to CC0, or itch.io packs explicitly marked CC0.
   - Deep-Fold's "Pixel Planets" generator code is a reference for the planet look. Check its licence before porting any code.
   - Record every external asset in `CREDITS.md` with its source URL and licence.
   - If a licence is unclear, do not use the asset.

Mascot: create an original small astronaut or star-creature guide, about 48 px, that reacts to the player's results. It must not be based on any existing character.

### 3.3 Screens to design (all pixel-art styled)
1. **Home / Mission Control:**
   - The daily-seeded planet rotates over a parallax nebula.
   - Shows the streak (as a constellation that grows by one star per day), the big "Launch today's mission" button, and a small "next mission in HH:MM:SS" countdown when the session is locked.
2. **Session flow:** a warp transition between rounds, a pixel progress bar shaped like an orbit path, and the mission timer.
3. **Each game screen.**
4. **The learning card ("Star Chart"):**
   - A pixel frame around readable, crisp DOM text.
   - A procedurally generated illustration that matches the topic (planet, cloud type, rock strata or map silhouette).
   - The source attribution shown on the card.
5. **Results / Debrief:**
   - Per-skill stars.
   - A share button that copies a Wordle-style emoji grid plus the site link.
6. **Lock screen:** a calm sleeping-planet scene with the countdown and the message "Mission complete. Return tomorrow."
7. **Stats / Logbook:**
   - Skill ratings over time, drawn as pixel charts.
   - Learned cards, browsable as a star map.
8. **Settings:** music, SFX and haptics toggles plus volume, reduced motion, high contrast, text size, a reset-data option with confirmation, and the credits.

## 4. Audio — royalty-free only

- **Music:** 3–5 ambient, synth or chiptune-hybrid space tracks: menu, focus (low-key, during puzzles), results, lock screen.
  - Sources, in order of preference:
    1. **Procedurally composed** with ZzFXM or a small Web Audio sequencer, so there is no licence issue and the files are tiny.
    2. **CC0** tracks from OpenGameArt or Freesound.
    3. Kevin MacLeod / Incompetech (CC BY, attribution required in `CREDITS.md`).
  - Loop seamlessly. Crossfade between scenes.
  - Ducking: lower the music by 40% while a reaction game is running.
- **SFX:**
  - Generate them with **ZzFX / jsfxr** parameters stored in code, with no files. This makes them royalty-free by construction.
  - Cover: tap, hover, correct, wrong, combo, timer warning, round start, warp, level up, unlock, card flip and lock.
  - Every SFX gets 2–3 slight pitch variations so repetition doesn't grate.
- **Behaviour:**
  - Audio starts only after the first user gesture, to satisfy browser autoplay rules.
  - Respect the device's mute setting and the Settings toggles.
  - Pause all audio when the tab is hidden.

## 5. Haptics

- Use the Vibration API (`navigator.vibrate`), which works on Android Chrome. Wrap it in `src/lib/haptics.ts` with named patterns:
  - `tap` (8 ms)
  - `correct` ([12, 40, 12])
  - `wrong` ([40, 30, 40])
  - `combo` (an increasing pattern)
  - `timerWarning`
  - `unlock`
  - `lock` (a long, soft pattern)
- **Feature detection:** iOS Safari does not support vibration, so fail silently there. Never let a missing API throw an error.
- Fire haptics only on meaningful events. Never vibrate continuously.
- Respect the haptics toggle, default it to on, and never fire haptics when reduced-motion is set *and* the user has turned haptics off.

## 6. The daily session and lock (core rule)

All of the following are constants in `src/config.ts`:
- `SESSION_TARGET_MIN = 15`: the session is composed to take about 15 minutes.
- `SESSION_HARD_CAP_MIN = 20`: the absolute maximum active time per day.
- `DAY_ROLLOVER = local midnight` (device time zone, so IST for the owner).

### 6.1 Session composition (seeded)

The seed is `"orbit-v1|" + localDateISO`. Everyone gets the same set of puzzles on the same day, which allows friends to compare results. Each session runs in this order:

1. **Warm-up** (~1 min): one easy reflex game.
2. **Review** (~2 min): 3–5 quick quiz items on Star Chart cards from previous days, scheduled with SM-2 spaced repetition.
3. **Core block** (~8 min): 4 rounds, each from a *different* category (reflex, memory, math/aptitude, logic, maze, riddle/lateral, STEM game).
   - Selection is seeded, but weighted toward the user's weakest skills (see 6.3).
   - No category appears twice.
   - No game repeats from the previous 2 days.
4. **Star Chart** (~2 min): one new curated STEM learning card. It becomes a review item tomorrow.
5. **Boss puzzle** (~2 min): one harder logic or maze puzzle.
6. **Debrief**, then the **lock**.

### 6.2 Lock behaviour
- **Active time only:** count time only while the app is visible and a round is in progress. Pause on `visibilitychange` or blur.
- **Resume:** if the user leaves mid-session, they can resume the *same* session later that day from the same point. An interruption must never forfeit the day.
- **Lock trigger:** the lock engages when the session is completed **or** when active time reaches `SESSION_HARD_CAP_MIN`. If the cap hits mid-round, finish that round and then end the session.
- **Persistence:** store `{date, sessionState, activeMs, completed}` in IndexedDB.
- **Tamper resistance (client-side, best effort):**
  - Store the highest timestamp ever seen. If the device clock moves backwards, keep the lock.
  - Detect day changes using the stored date, not only timers.
  - Document in `docs/DECISIONS.md` that a determined user can bypass the lock by moving the clock forward or clearing data. That is acceptable for v1.
  - Design `src/lib/clock.ts` behind an interface so an optional free Cloudflare Worker time check can be added later without refactoring.
- **What the locked state still allows:** viewing stats, the logbook and settings. It never allows playing.
- **Dev mode:** `?dev=1` exposes a panel to change the date or seed, skip rounds and unlock. It must be stripped from production builds.

### 6.3 Adaptive difficulty
- **Per skill:** each skill has an Elo-style rating stored locally, targeting a 75–80% success rate. Each item or generator setting has a difficulty value that maps from the rating.
- **Timed reflex games:** use a 1-up/2-down or 1-up/3-down staircase within the round.
- **Weighted selection:** select games with probability proportional to `1 + weakness_weight`, but always keep variety.
- **First week:** use sensible default difficulty, adapting gradually.

## 7. Games — MVP set (13), all procedurally generated from the daily seed

Every generator must follow **generate → verify (solver or path search) → measure difficulty → accept or regenerate**. A puzzle that can't be solved must never reach the player. Each game is a module that implements one shared interface:

```ts
interface GameModule {
  id: string; category: Category; title: string;
  generate(rng: RNG, difficulty: number): Level;   // pure, deterministic
  verify(level: Level): boolean;                     // solvable / unique
  mount(ctx: GameContext): GameInstance;             // render + input
  score(result: RoundResult): SkillUpdate;
}
```

| # | Category | Game (cosmic skin) | Source mechanic |
|---|---|---|---|
| 1 | Reflex | **Brake Light → "Thruster Abort"**: tap to fire on go-signals; withhold when the abort beacon flashes. The stop delay adapts by staircase | Stop-signal task |
| 2 | Reflex | **Catch the Comet**: a comet passes behind a planet; tap the moment it reaches the marker | Coincidence-anticipation timing |
| 3 | Reflex | **Orbit Tracker**: 3–5 marked moons, then all moons look identical and drift; pick the marked ones | Multiple object tracking |
| 4 | Memory | **Constellation Recall**: stars light up in sequence; repeat it forward, then backward | Corsi block span |
| 5 | Memory | **Dead Reckoning**: watch a ship's path of turns and thrusts, then tap where it ended up | Path integration |
| 6 | Memory | **Signal Drift (2-back)**: radio pulses; tap when the current one matches 2 back | n-back |
| 7 | Math | **Make 24 / Fuel Mix**: combine 4 numbers to hit the target (all seeded sets are verified solvable) | 24 game |
| 8 | Math | **Fermi Line**: estimate a quantity on a log slider and score by order of magnitude, with an explanation | Fermi estimation |
| 9 | Logic | **Knights & Knaves → "Truthful & Lying Aliens"**: generated statements, verified unique by a solver | Smullyan puzzles |
| 10 | Maze | **Vanishing Walls**: memorise the maze, then the walls fade and you navigate from memory | Perfect-maze generator (recursive backtracker) + memory |
| 11 | Maze | **Theseus & the Minotaur → "Escape the Void Beast"**: each move you make, the chaser makes two | Abbott logic maze, verified by BFS for a minimum solution length |
| 12 | Riddle | **Matchstick Fix → "Star-Stick Equations"**: move one stick to fix the equation, generated and verified | Matchstick puzzles |
| 13 | STEM | **Isobar Wind Reader**: generated pressure map; pick the wind direction and strength at a point (Buys-Ballot law, Coriolis by hemisphere) | Meteorology |

Next in line for v1 (take more from the research catalogue): Climograph Detective, Scale Sort, Doomsday Sprint, Periodic Hunt, Alternating-Colour maze, river-crossing riddles, situation-puzzle bank, Higher/Lower physical quantities.

**Riddles and lateral-thinking questions:**
- Use generated puzzles where possible (matchsticks, Knights & Knaves, river crossing, coin weighing).
- Also build a curated bank of **original** riddles in `content/riddles/*.json`, each with an answer, explanation, difficulty and tags.
- Write at least 150 originals. Do not copy riddles from websites or books.

Every round must be playable with touch (large hit targets, at least 48 dp) and with mouse or keyboard. Every round shows the correct answer and a short explanation afterwards.

## 8. Content database — large, local, offline

Content is built **at build time** by scripts on the developer's PC, shipped as static JSON chunks with the site, cached on the device, and read locally. The app never needs the internet after install, apart from receiving updates.

### 8.1 Pipeline (`/pipeline`, Node scripts, run manually: `npm run content:build`)
1. **Topics:**
   - Pull Wikipedia **Vital Articles** (levels 4–5) in physical sciences, earth sciences, astronomy, biology basics and geography.
   - Add meteorology topics from the NOAA/NWS JetStream and NASA Earth Observatory indexes.
   - Store the topic list with its categories.
2. **Card text:**
   - For each topic, fetch the Wikipedia REST page summary. Send a proper User-Agent with contact details, throttle requests and cache responses locally.
   - Store `title`, `extract`, `pageUrl` and `revisionId`.
   - Licence: CC BY-SA 4.0, so each card shows a "Source: Wikipedia — [article] (CC BY-SA 4.0)" link.
   - Do not copy Wikipedia images unless the individual file is public domain or CC0 and that licence is recorded. Prefer procedural illustrations.
3. **Structured quiz items:**
   - Run Wikidata SPARQL (CC0) queries for elements, planets and moons, countries and capitals, rivers, mountains, climate zones and physical constants.
   - Turn them into templated questions: higher/lower, ordering, "which of these", map pin.
   - Validate every answer against the data.
4. **Aptitude bank:** import AQuA-RAT and MathQA (Apache-2.0) plus GSM8K (MIT). Keep only items whose answer can be re-computed in code, and tag them by difficulty.
5. **Optional enrichment:**
   - Rewrite card text into the format hook → explanation → why it matters → one quiz question, using a **local** LLM via Ollama (free, on the developer's GPU).
   - Rules:
     - The model must quote the source sentence that supports each claim.
     - Run an automatic check that the quote exists in the source.
     - Keep the raw extract as a fallback.
     - Mark enriched cards `"reviewed": false` until a human spot-checks them.
6. **Output:**
   - Write `public/data/manifest.json` (version, chunk list, counts, hashes).
   - Write chunk files `public/data/cards-<category>-<n>.json` and `quiz-*.json` of about 300–500 KB each.
   - Write `CREDITS.md` and `docs/CONTENT_LICENSES.md`.

Since the app is **non-commercial**, CC BY-NC sources (e.g. SciQ, OpenStax) are also allowed, with attribution. Keep a `license` field on every item so they can be filtered out if that ever changes. Never use: the WMO Cloud Atlas (no derivatives), BRAINTEASER (research-only), RiddleSense (no licence).

### 8.2 Item schema
```json
{ "id": "card:geo:0412", "type": "card|quiz|riddle|aptitude",
  "category": "astronomy|physics|chemistry|earth|meteorology|geography|biology|math|logic",
  "title": "", "body": "", "hook": "", "whyItMatters": "",
  "quiz": { "q": "", "choices": [], "answer": 0, "explanation": "" },
  "difficulty": 1, "tags": [],
  "source": { "name": "Wikipedia", "url": "", "revisionId": 0 },
  "license": "CC BY-SA 4.0", "attribution": "", "modified": true, "reviewed": false }
```

### 8.3 Shipping and storage on the device
- **Install time:** the service worker precaches the app shell plus the manifest and **the first content chunk of each category**, so the app works offline immediately.
- **Lazy loading:** load further chunks on demand (stale-while-revalidate) or in the background on Wi-Fi.
- **Selection:** only the chunks needed for the next few days' seeded picks have to be present.
- **Updates:**
  - To add content: run the pipeline, redeploy, and the new manifest version triggers a background chunk update.
  - Show a small, non-blocking "New star charts arrived" toast.
  - Never interrupt a session in progress with an update.
- **Scale:** target **10,000+ cards and 20,000+ quiz items** in v1 (roughly 15–35 MB total compressed, spread across chunks). Generated puzzles are unlimited.
- **No repeats:** keep a "seen" set in IndexedDB so the same card is never served twice until the pool is exhausted.

## 9. Responsiveness, performance, accessibility

- **Layout:**
  - Mobile-first and portrait-first, tested at 360×640, 390×844, 412×915, tablet and desktop.
  - Landscape works without breaking anything.
  - Use safe-area insets.
  - No horizontal scroll anywhere.
- **Performance targets:**
  - 60 fps on a mid-range Android phone. Use `requestAnimationFrame`, avoid allocating memory inside the game loop, pool particles, and pre-render static layers.
  - Lighthouse (mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA installable.
  - Initial JS bundle ≤ 200 KB gzipped. Lazy-load each game module.
- **Input:**
  - Use pointer events throughout, so touch, mouse and pen behave the same.
  - Remove the 300 ms tap delay with `touch-action`, prevent double-tap zoom on game areas, and avoid accidental pull-to-refresh during games.
- **Reduced motion:** honour `prefers-reduced-motion` with static backgrounds and simple fades.
- **Readability:**
  - Learning-card text is real DOM text, at least 16 px.
  - Use a readable pixel-style font for headings only. The font must be OFL-licensed, e.g. "Press Start 2P" for titles and "Silkscreen" or "Pixelify Sans" for UI labels; check each licence.
  - Body text uses a clean sans serif.
- **Colour and labels:**
  - Every game gives colour-blind-safe cues (shape or icon as well as colour).
  - All controls have ARIA labels.

## 10. Quality gates — "error-free, glitch-free"

At each phase:
- **Static checks:** `npm run lint`, `npm run typecheck` and `svelte-check` all pass with zero warnings.
- **Unit and property tests (Vitest):**
  - **Generators:** for every game, generate 1,000 levels from 1,000 seeds across all difficulties. Each must be deterministic (same seed gives the same level), `verify()` must be true, and generation must finish in under 50 ms.
  - **Session composer:** same date gives the same session; no duplicate categories; the 2-day no-repeat rule holds; it works across month and year boundaries and time zones.
  - **Lock:** active-time accounting; resume after reload; cap mid-round; clock-backwards protection; midnight rollover; a stale tab left open across midnight.
  - **Spaced repetition and ratings:** the maths is correct.
  - **Content:** schema validation for every chunk; every quiz answer index is valid; every item has a source and a licence.
- **End-to-end tests (Playwright):** at Pixel 7 and desktop viewports:
  - A full session from start to lock, using dev-mode seeds.
  - An offline run, reloaded with the network disabled.
  - Install manifest validity.
  - Zero console errors or warnings during the run.
- **Visual check:** take screenshots of every screen at 3 viewports into `docs/screens/`, then review them against the art direction and fix any issues.
- **Runtime safety:**
  - Add a global error boundary that shows a friendly pixel "Houston, we have a problem" screen with a reload button and never loses session state.
  - Wrap all IndexedDB and audio calls in try/catch.
- **Before declaring a phase done:** look for glitches:
  - Double taps
  - Rapid navigation
  - Rotating the device mid-round
  - Switching tabs mid-timer
  - Low-battery mode
  - Muted device
  - Very slow network

## 11. Deployment

- **Hosting:** a GitHub repository, with Cloudflare Pages connected to it so every push to `main` builds and deploys. Use the `*.pages.dev` URL; a custom domain can be added later.
- **Cache headers:** long-cache the hashed assets, set no-cache on `index.html` and the service worker, and make the service worker update flow safe (prompt-free reload between sessions).
- **README:** add a section titled "Install on Android: open link in Chrome → ⋮ → Add to Home screen".
- **Open Graph:** add an Open Graph image (a pixel-art cosmic banner) so the link previews well on LinkedIn and WhatsApp.

## 12. Phases (commit at the end of each, after its quality gate passes)

1. **Scaffold:**
   - Vite, Svelte, TypeScript, PWA, lint and test setup.
   - The RNG, the clock, storage wrappers, the config, and the dev panel.
2. **Art engine:**
   - The palette, the integer-scaling canvas, and the procedural starfield, nebula and planet generators.
   - The sprite system, the `/dev/sprites` preview page, and the mascot.
3. **Shell UI:** home, session flow, debrief, lock screen, stats, settings and transitions.
4. **Audio and haptics:** the AudioBus, procedural SFX, music, and the haptics module.
5. **Session engine:** the composer, the lock, resume, adaptive ratings and SM-2 scheduling.
6. **Games 1–7.**
7. **Games 8–13**, plus the original riddle bank.
8. **Content pipeline:** run it, ship the chunks, add offline caching and the update flow, and fill in the credits.
9. **Polish pass:** animation timing, juice (screen shake capped at 2 px, particle bursts, combo feedback), accessibility and performance.
10. **Full QA:** the gate in section 10 across everything, then the deploy configuration and README.

After phase 10, write `docs/STATUS.md` covering what's done, known limitations, and the next games and content to add.

## 13. Hard rules
- Make **no claims** that the app improves IQ, memory, health or dementia risk. The tagline is about daily challenge and curiosity: "Fifteen minutes. One mission. Every day."
- Use no copyrighted characters, logos, music, riddles or images. Every external asset and dataset is listed with its licence.
- Use no `Math.random()` in gameplay or content, so the same date always produces the same day.
- Never lose user progress. Every state change is persisted before it is shown to the user.
- Nothing in the session flow may require the network after the first load.
