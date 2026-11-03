# Status

As of 3 Nov 2026. All 10 phases of `docs/BUILD_PROMPT.md` are built.

## Done

- **App:** installable PWA (Vite + Svelte 5 + TypeScript strict) that works fully offline after the first load. No backend, accounts, ads or analytics.
- **Daily mission:** warm-up, review, 4 core games from 4 different skills, Star Chart card, boss, debrief, then the lock until local midnight. Seeded by date. Active-time cap of 20 minutes. Resume within the day. Clock-rewind guard. Streaks with earned freezes.
- **16 games**, each with a generator, a verifier and a 1,000-seed property test (deterministic, solvable, under 50 ms).
- **Content:** 12,898 Star Chart cards (Wikipedia), 22,387 quiz items (Wikidata), 7,534 aptitude problems (GSM8K, every step re-computed), 167 original riddles, 65 Fermi items plus generated ones. 113 chunks, 32 MB raw.
- **Art and audio:** all generated in code. The nebula and planets render in a Web Worker.
- **Adaptivity:** Elo per skill aimed at 77.5% success, in-round staircases, SM-2 reviews.

## Quality gate results

| Check | Result |
|---|---|
| ESLint, svelte-check, tsc | 0 errors, 0 warnings |
| Unit and property tests (Vitest) | 67 passed |
| E2E (Playwright, Pixel 7 + desktop) | 8 passed: full session to lock, resume after reload, install manifest, offline session |
| Lighthouse mobile | Performance 97, Accessibility 100, Best Practices 96, SEO 100 |
| Initial JS | about 46 KB gzipped; each game is its own lazy chunk |
| Screenshots | `docs/screens/`: every screen at 360×640, 412×915 and 1280×800, plus every game |

## Known limits

- The lock is client-side. Moving the clock forward or clearing site data bypasses it (see `docs/DECISIONS.md`).
- No haptics on iOS Safari (no Vibration API there).
- Review questions for cards are "which topic is this?" cloze questions, not hand-written questions.
- Card text is the raw Wikipedia summary. The local-LLM enrichment script exists (`npm run content:enrich`) but was not run at scale. Enriched cards would need a human spot check.
- Long word problems and long cards scroll on small phones.
- Map-pin questions were not built (they need map geometry).

## Next to add

- **Games:** Climograph Detective, Scale Sort, Periodic Hunt, river-crossing riddles, situation puzzles, Higher/Lower physical quantities, Nonogram.
- **Content:** MathQA aptitude items (its formula programs can be re-computed), and enrichment of the top few hundred cards with a human review pass.
- **Platform:** an optional free Cloudflare Worker time check behind `src/lib/clock.ts`, and a friends leaderboard on the shared daily seed (needs an age gate first because of India's DPDP rules).
