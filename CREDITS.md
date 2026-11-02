# Credits

ORBIT uses no copyrighted characters, logos, music, riddles or images. Everything below is either original to this project or used under the licence listed.

## Made for ORBIT (original)

- All pixel art: planets, nebulae, starfield, comets, card illustrations, icons and Pip the mascot are generated in code (`src/art`).
- All music and sound effects are synthesised in code with the Web Audio API (`src/audio`). No sample files.
- 167 riddles and lateral-thinking questions (`content/riddles`, source in `pipeline/riddles-src.mjs`).
- Fermi estimation questions (`src/games/fermiData.ts`), written from standard reference figures.
- Every puzzle generator: Knights and Knaves, matchsticks, mazes, 24, Doomsday, isobar maps and the rest.

## Fonts

| Font | Author | Source | Licence |
|---|---|---|---|
| Press Start 2P | CodeMan38 | https://fonts.google.com/specimen/Press+Start+2P (via `@fontsource/press-start-2p`) | SIL Open Font License 1.1 |
| Pixelify Sans | Stefie Justprince | https://fonts.google.com/specimen/Pixelify+Sans (via `@fontsource/pixelify-sans`) | SIL Open Font License 1.1 |

## Content

| Content | Source | Licence |
|---|---|---|
| Star Chart card text | Wikipedia contributors, page summaries of Vital Articles (each card links to its article) | CC BY-SA 4.0 |
| Quiz facts | Wikidata | CC0 1.0 |
| Arithmetic word problems | GSM8K, OpenAI (Cobbe et al. 2021), https://github.com/openai/grade-school-math | MIT |

See `docs/CONTENT_LICENSES.md` for counts and what was left out.

## Design references (no code or assets copied)

- Deep-Fold's "Pixel Planets" was looked at as a visual reference for the planet look. ORBIT's planet generator is written from scratch, so no licence applies.
- Robert Abbott's logic mazes and the Theseus and Minotaur rules inspired the maze rules.
