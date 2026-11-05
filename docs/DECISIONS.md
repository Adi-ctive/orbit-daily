# Decisions

Choices made where the build prompt left room, grouped by phase.

## Phase 1: scaffold

- **Project folder:** `C:\projects\orbit`. The prompt and research live in `docs/`.
- **Versions:** Vite 8, Svelte 5.57, TypeScript 6 (strict), vite-plugin-pwa 2, Vitest 5, ESLint 10 (flat config), Playwright 1.64, Lighthouse CI.
- **Dev panel gate:** a compile-time `__DEV_PANEL__` flag. It is `false` in `vite build` (production mode), so the panel and the `/dev/*` pages are removed from production. `vite build --mode e2e` keeps them for Playwright. At runtime the panel also needs `?dev=1`.
- **Dev date override:** an offset on `appClock`, so every time read goes through one place. `?dev=1&date=YYYY-MM-DD&seed=x` set it from the URL.
- **Storage:** `idb-keyval`, one store (`orbit-db/kv`). If IndexedDB is missing or throws, an in-memory map takes over, so a round never crashes. Every call is wrapped in try/catch.
- **Math.random ban:** `no-restricted-properties` in ESLint, off only for `src/lib/rng.ts`. It covers the pipeline too.
- **RNG:** sfc32 seeded by xmur3, first 12 outputs discarded. `fork(label)` gives each game its own stable stream.
- **npm audit:** the open advisories are in build-time dependencies (vite-plugin-pwa → workbox-build, Svelte plugin, Lighthouse CI). None ships to the browser.

## Phase 2: art engine

- **Integer scaling in device pixels.** `PixelCanvas` picks the largest whole-number scale in *device* pixels, so art pixels are exact on 2.6× phone screens. Backgrounds cap their native size at about 400 px, which keeps pixels chunky on desktop and keeps generation fast.
- **Heavy art runs in a Web Worker** (`src/art/artWorker.ts`): the nebula and the 48-frame planet sheet. This took Lighthouse mobile Performance from 55 to 97 (Total Blocking Time 3,350 ms → 150 ms). If workers fail, the client draws in place after an 8 s timeout.
- **Nebula feature size tracks the canvas size**, so every screen shows the same amount of nebula.
- **Planet generator written from scratch.** Deep-Fold's Pixel Planets was only a visual reference; no code was ported.
- **Mascot "Pip"** is an original five-point star creature built in code (puffy star body, 5 tones, coloured outline, 6 moods).
- **No WebGL.** Canvas 2D in a worker was fast enough, so the WebGL path and its fallback were not needed.

## Phase 3-4: shell, audio, haptics

- **Feedback before advancing.** Each round's result is saved first, then the answer and explanation are shown. A reload on the feedback panel lands on the next round, never repeats or loses one.
- **Debrief survives a reload.** `DayRecord.debriefed` decides between debrief and lock screen.
- **Audio** is a custom Web Audio bus (music, SFX, UI gain nodes). SFX are rendered from note parameters in code with three pitch variants. Music is a small look-ahead sequencer (pads, arpeggio, bass) per scene with 1.5 s crossfades. The music ducks 40% during reaction games.
- **Combo feedback:** three or more correct answers in a row upgrade the chime, buzz the combo haptic, and show ×N; every third fires a pixel particle burst. Screen shake is capped at 2 px and off under reduced motion.

## Phase 5: session engine

- **Catalogue size.** The 2-day no-repeat rule plus 4 distinct core categories is only always satisfiable if at most three categories have two or fewer games. So three games beyond the MVP 13 were added from the "next in line" list: Doomsday Sprint (math), Pulsar Path (the alternating-colour maze) and Signal from Deep Space (the riddle bank). A test composes 730 consecutive days with skewed ratings and checks the rule every day.
- **Shared vs personal.** Each game's level seed is `date|game|phase`, so anyone who gets the same game on the same day gets the same level. Category choice is weighted toward the player's weak skills, so two friends can get different games. New players (default ratings) all get the identical session.
- **Resume granularity is the round.** Leaving mid-round restarts that round with the same level; finished rounds are never lost.
- **Midnight with a stale tab.** A session belongs to the date it started. If the date changes while a round is running, that round finishes and the session ends there.
- **Cap:** active time counts only while the page is visible and focused and a round is mounted. Gaps over 5 s in one tick are ignored (suspended tabs). At 20 minutes the current round finishes, then the session ends.
- **Ratings:** Elo per skill. Difficulty 0..1 maps to item ratings 700-1700; the target difficulty puts predicted success at 77.5%. K is reduced for each skill's first five rounds. Reaction games also run in-round staircases.
- **Streak freezes:** one earned per 7 completed days, at most 2, used automatically for a single missed day. Never bought.
- **Review round:** due SM-2 card reviews first; on early days it is topped up to 3 with the day's shared quiz and aptitude items.

## Phase 6-7: games

- Every generator follows generate → verify → accept or regenerate, and `generateVerified` throws if 200 attempts fail, which the tests would catch. Verifiers: a 24 solver with exact fractions, Doomsday rule cross-checked with the JS calendar for every tested date 1800-2199, a 2ⁿ Knights-and-Knaves solver requiring exactly one answer, BFS over (you, beast) states for the Void Beast with a minimum solution length, BFS over (cell, last colour) for Pulsar Path plus rejection of levels a greedy walker can solve, brute force over every single-stick move for matchsticks (exactly one fix), and isobar points rejected when the wind is within 15° of a compass boundary or the strength near a class edge.
- **Isobar wind physics:** geostrophic flow along the isobars (low pressure on the left in the north, right in the south), turned 25° toward the low by surface friction. Buttons ask where the wind blows *toward*; the explanation names it the meteorological way ("a south-westerly").
- **Fermi Line:** 65 hand-written items plus generated unit-conversion items. Score = 1 − |log₁₀(guess/answer)| / 1.5.
- **Riddles:** 167 originals, written for this app, each with three wrong choices, an explanation, a difficulty and a tag.

## Phase 8: content

- **Topics** come from Wikipedia Vital Articles Level 5 (which includes Level 4): astronomy, physics, chemistry, earth science, meteorology (the Air, Meteorology and Climatology sections of Earth science), physical geography, regions and countries, biology, animals, plants and mathematics. The NOAA JetStream and NASA indexes were not scraped: the Wikipedia meteorology section already gives several hundred topics, all under one licence.
- **Card review question:** "Which topic is this?" built from the card's own first sentence with the subject hidden, plus three other titles from the same category. Cards whose subject cannot be hidden ship without a review question.
- **Quiz bank:** Wikidata templates (symbols, atomic numbers, capitals, population, area, continent, rivers, mountains, moons, planets). Pairs are only used when the values differ enough (≥ 30% for population and area) that small data changes cannot flip the answer.
- **Aptitude:** GSM8K only. AQuA-RAT and MathQA are documented as not used in `docs/CONTENT_LICENSES.md`.
- **LLM enrichment** is implemented (`npm run content:enrich`, local Ollama, quote-checked) but not run at scale. On a 6 GB laptop GPU, 10,000 cards would take hours, and every enriched card needs a human spot check before it is trusted. Cards ship with their unmodified Wikipedia summary.
- **Chunks:** 400 items each. Item ids encode their chunk, so the loader can fetch any single item. Chunk 0 of every type and category is precached by the service worker; the rest are cached when first used. Next chunks are prefetched in the background on Wi-Fi.
- **Content fetches time out after 4 s**, so a crawling network never blocks "Launch today's mission".

## Phase 9-10: polish, QA, deploy

- **Service worker updates:** `registerType: 'prompt'` with `clientsClaim`. The first install controls the page at once (offline right away). Later updates wait until no session or debrief is on screen, then reload.
- **Lighthouse 12 has no PWA category**, so installability is covered by the e2e manifest test (name, display, start URL, 192/512 icons and a maskable icon, all fetchable).
- **Hosting:** Cloudflare Pages with `public/_headers` (immutable hashed assets, no-cache on `index.html` and `sw.js`).

## Known limits (accepted for v1)

- The daily lock is client-side only. A determined user can bypass it by moving the device clock forward or clearing site data. Clearing data also wipes their streak, which is deterrent enough. Moving the clock *backwards* is caught by the high-water mark. `src/lib/clock.ts` hides time behind a `Clock` interface, so a free Cloudflare Worker time check can be added later.
- Haptics do nothing on iOS Safari (no Vibration API). It fails silently.

## v2 redesign (4 Nov 2026, owner feedback)

The owner found the pixel art busy, the games too easy and slow, and the learning part too much like school quizzes. The audience is adults and older teens.

- **Visuals:** realistic space replaces pixel art. The planet is a WebGL fragment shader. `PixelCanvas` keeps its small logical coordinate space but renders at full device resolution with smoothing, so game code kept its layout while every shape became a vector path (`src/art/draw.ts`). The palette was softened.
- **Planet cost:** on a software renderer (no GPU) the shader takes seconds to compile, which wrecked Lighthouse (Performance 47). Now a throwaway canvas checks the renderer first and falls back to a 2D planet. On real GPUs the shader compiles in the background (`KHR_parallel_shader_compile`), starts after first paint, and redraws about 20 times a second. Lighthouse mobile is back to 100.
- **Content:** removed the Wikipedia/Wikidata/GSM8K pipeline and its 32 MB of chunks, the review round and SM-2 scheduling. The owner asked for teaching, not pop quizzes, and for ideas beyond school basics. 64 original explainers replace them (`src/content/explainers`). Everyone reads the same one on a given day (a fixed shuffled order), skipping ones already read.
- **Difficulty anchor:** `difficultyToElo` moved from 700 + 1000d to 250 + 1000d, so a 1000-rated new player starts near 0.55.
- **Game retune:** Thruster Abort 30 trials with 8 aborts and a 0.45-0.75 s window. Catch the Comet 10 faster trials with longer occlusion and 0.10-0.22 s tolerance. Orbit Tracker 8-13 moons, 3-6 targets, 6-11 s tracking. Constellation 12 stars, spans from 4-7, faster flashes. Dead Reckoning 4-8 legs, faster. Signal Drift 30 pulses, 3-back above 0.5. Fuel Mix 4 sets with fewer solution paths. Fermi 5 items. Doomsday 10 dates across the full range. Aliens 3-5. Vanishing Walls 7-12 cells with 4-8 s to memorise. Void Beast 7×7 with 10-20 move escapes. Pulsar Path 6-8 grids. Star-Sticks two-digit sums. Riddles difficulty 2-3 only.
- **Removed:** the pixel mascot, particle bursts and screen shake. They clashed with the minimal look.

## v2.1 (4 Nov 2026, owner feedback)

- **Fully random levels.** Every attempt at a round gets a fresh random level (a crypto nonce added to the seed at round start), and each player has a random salt, so players get their own mix of games. Dev seeds (`?seed=`) stay fixed so tests and screenshots are repeatable. The shared same-puzzle-for-everyone idea from the research was dropped at the owner's request. The day's planet and explainer are still shared.
- **Rematch.** The game with the lowest score under 70% yesterday takes the first core slot today, with a new level and a note saying so. The debrief lists where points were lost.
- **Play to the time limit.** Finishing the planned rounds no longer locks the day. It marks `planDone` (and counts the streak). The player then picks Another round (weighted toward weak skills, never the same game twice in a row) or Finish mission. The 20-minute active-time cap ends the mission after the current round.
- **Updates reach phones.** The service worker now uses `skipWaiting`, so a new version takes over on the next reload, and a game file removed by an update triggers a reload instead of a crash. Missions saved by v1 are migrated on load.

## v2.2 (5 Nov 2026, owner feedback)

The owner found the games repetitive, some rules vague, and scrolling broken on desktop and Android. Worst games named: Catch the Comet, Signal Drift and the aliens puzzle.

- **Scrolling.** `overflow-x: hidden` and `overscroll-behavior` sat on `body`, which turned it into a scroll container that swallowed the mouse wheel and swipes. Both now sit on `html`. An e2e test scrolls the explainer with the wheel.
- **No repeats.** A mission never uses a game from the previous two missions (relaxing to one day, then none, only if the pool runs dry). Bonus rounds only use games not played today. Riddles and Fermi questions are tracked per player and never repeat until the bank runs out. The explainer appears once per mission and does not repeat until all of them have been read.
- **Clear rules.** Every game has a goal and numbered steps on its intro screen. After a round, one tap starts the next one.
- **Rebuilt:** Catch the Comet (practice pass, bright gate, a ghost marker that shows how early or late you were). Signal Drift became Signal Match (SAME or DIFFERENT for every symbol, with a history strip during practice). The aliens puzzle became Truth & Lies (rules banner, Truth-teller and Liar buttons, two Checks that mark clashing statements).
- **7 new games, 23 in all:** Rule Flip (task switching), Odd One Out (visual search), Spot the Change (change detection), Running Tally (two counters at once), Code Lock (Mastermind deduction, boss), Turn or Mirror (mental rotation), Ice Drift (sliding puzzle, boss). Each passes the 1,000-seed generator test.
- **365 explainers (5 Nov 2026).** 301 new readings bring the total to 365, so a daily player meets no repeat for a year. They cover politics and law, economics, the mind, philosophy and logic, maths, physics, space, engineering, technology, Earth, life and health, and history. Each was written for ORBIT, checked for dates and figures, and passes the format test (3+ paragraphs, 110 to 600 words, plain punctuation, a source link). Adding entries reshuffles the shared daily order, which is harmless because each player skips what they have read.
