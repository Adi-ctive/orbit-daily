# Status

As of 5 Nov 2026, after v2.2 (owner feedback on repetition, vague rules and scrolling).

## What changed in v2.2

- Scrolling works with the mouse wheel and touch swipes everywhere.
- 23 games (7 new), each with clear numbered rules. Catch the Comet, Signal Match and Truth & Lies were rebuilt.
- No game from the last two missions comes back, bonus rounds never repeat a game played today, and riddles and Fermi questions never repeat for a player.

## What changed in v2

- **Look:** realistic space with a minimal adult UI. A WebGL planet shader (terrain, oceans with glint, clouds, ice caps, soft terminator, atmosphere), a calm static starfield, the Inter font, clean cards. All pixel art, the mascot and the pixel fonts are gone. Games draw smooth vector shapes at full screen resolution.
- **Learning:** the Wikipedia cards and the pop-quiz review round are gone. Each mission now ends with one original explainer on an idea most people never met in school: politics, economics, the mind, philosophy, maths, physics, space, engineering, Earth and life sciences. No quiz after it.
- **Difficulty:** a new player now starts around difficulty 0.55 instead of 0.09, warm-up about 0.35 and boss about 0.8. Every game was also retuned to be faster and denser (details in `docs/DECISIONS.md`).

## Mission

Warm-up reflex game, core games from different skills (yesterday's weakest skill first), a data question round, today's explainer, boss puzzle. After that the player can keep taking new games until the 20-minute limit, then the debrief and the lock until local midnight.

## Quality gate results

| Check | Result |
|---|---|
| ESLint, svelte-check, tsc | 0 errors, 0 warnings |
| Unit and property tests | 81 passed (1,000 seeds per game, each under 50 ms, 2 years of missions with no game shared by consecutive two days) |
| E2E (Pixel 7 + desktop) | 10 passed: full session to lock with a bonus round, resume, manifest, offline, wheel scroll |
| Lighthouse mobile | Performance 100, Accessibility 100, Best Practices 100, SEO 100 |

## Known limits

- 64 explainers, so the cycle repeats after about two months of daily play. New ones need writing and checking by hand.
- Devices without a usable GPU get a simpler 2D planet, because the shader would take seconds to compile on the CPU.
- The lock is client-side (moving the clock forward or clearing data bypasses it).
- No haptics on iOS Safari.

## Next

- More explainers (aim for 365), possibly in short themed runs of 3 to 5 days.
- Harder tiers that unlock at high ratings: dual n-back, two-stick matchstick moves, larger Void Beast boards.
- An optional friends leaderboard on the shared daily seed (needs an age gate first).
