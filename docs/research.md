# Build the daily-locked STEM trainer nobody ships

**Verdict: build it. Nothing that was checked combines all five requirements, and every requirement can be met at zero cost.** No app found mixes random cognitive games, riddles and mazes, curated STEM cards and a hard daily lock. Every commercial brain-trainer is freemium. Their "3 games a day" limits are paywalls that paying removes, not training design ([App Store: Lumosity](https://apps.apple.com/app/id577232024), [Brilliant help](https://brilliant.org/help/pricing-and-plans/what-s-the-difference-between-free-and-premium)). The closest partial match, "10 Games: Daily Brain Training", serves a daily random set from 68 games but explicitly allows unlimited replays and has paid Pro ([App Store SG](https://apps.apple.com/sg/app/10-games-daily-brain-training/id6478441539)).

The recommended build is:
- **Stack:** a Vite + Svelte PWA on Cloudflare Pages, which has unlimited free bandwidth.
- **Randomisation:** a date-seeded PRNG drives generate-then-verify puzzle generators, so levels are random every day and still guaranteed solvable.
- **Lock:** counts active seconds, is stored in IndexedDB, and is framed as "done for today", never sold.
- **Content:** a large bank built from licence-clean sources: Wikidata (CC0), Wikipedia Vital Articles (CC BY-SA), US-government public-domain science, and Apache/MIT maths datasets (about 140k aptitude items).

The real bottleneck is content verification, not code. The one hard rule is to make no cognitive-benefit claims: Lumosity paid $2M to the FTC over exactly that ([FTC](https://ftc.gov/news-events/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges)).

**Flags used below:** **[UNVERIFIED]** means the research notes rest on background knowledge, not a source fetched this session. "Design inference" means a design proposal, not a measured result.

---

## The gap is real: competitors cap to sell, nobody caps to train

| Product | What it does | Daily limit | Cost | Misses |
|---|---|---|---|---|
| Lumosity | 40+ adaptive games, 10-min Fit Test | Free tier about 3 games/day [competitor blog, unverified] | IAP $11.99–$89 | Paywall cap, no learning cards, games repeat ([App Store](https://apps.apple.com/app/id577232024)) |
| Elevate | 40+ games, 3–5 per workout | Free = 3 games ([Elevate help](https://support.elevateapp.com/hc/en-us/articles/13596850071579-How-do-I-change-my-workout-length)) | IAP $4.99–$39.99 | Paywall, user picks games, no riddles or mazes ([App Store](https://apps.apple.com/app/id875063456)) |
| Peak | 45+ games, under 5-min "Coffee Break" | None stated | Pro $34.99/yr | Ads before replays ([App Store](https://apps.apple.com/us/app/peak-brain-training/id806223188)) |
| BrainHQ | UFOV-type speed training | 1 free exercise/day | $94.99/yr ([AppFollow](https://appfollow.io/ios/brainhq/537452201?country=us)) | Paywall |
| Impulse | Games, mini-courses, daily challenges | None; users report it "absorbing" | $9.99/wk–$49.99 | Pastime problem, ads ([App Store](https://apps.apple.com/us/app/1451295827)) |
| 10 Games | 10 random games/day from 68, plus Fact of the Day | **No lock** | Pro paid | Facts not STEM-curated ([App Store SG](https://apps.apple.com/sg/app/10-games-daily-brain-training/id6478441539)) |
| Brilliant | STEM lessons | 2 "keys"/day, buyable off | Premium | Sequential lessons, no reflex or memory games ([help](https://brilliant.org/help/pricing-and-plans/what-s-the-difference-between-free-and-premium)) |
| NYT Games | Wordle, Connections, Strands… | One puzzle each | Partly paid | Separate games, no learning ([NYT help](https://thenewyorktimeshelpcenter.helpjuice.com/360052272251-New-York-Times-Games-Subscription)) |
| Dr Kawashima (Nintendo) | About 10 min/day, locked once a day | **Hard lock**; an interruption forfeits the day | Paid console game | No cards or riddles; the lock is called "harsh" ([Pocket Gamer](https://www.pocketgamer.com/brain-exercise-with-dr-kawashima/review/)) |
| Scroll IQ / Factasive / Fact Front | Swipe fact feeds | Factasive gives a one-time free allowance | Ads or $14.99/yr | Generalist topics; "verified" claims with no stated method ([Scroll IQ](https://apps.apple.com/ge/app/scroll-iq-learn-daily-facts/id6753589197), [Factasive](https://apps.apple.com/app/id6760104653)) |
| WikiTok | Random Wikipedia in an infinite scroll, open-source PWA | Infinite | Free | The opposite of a lock, and random wiki filler ([Wikipedia](https://en.wikipedia.org/wiki/WikiTok)) |
| Simon Tatham's Puzzles | 40 seeded logic puzzles, MIT licence | None | Free | Logic only, no daily structure ([site](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/)) |
| Riddle apps (e.g. Brain Teasers) | "Hundreds" of riddles | — | IAP | Missing answers, no explanations, unlabelled difficulty, ad spam; rated 3.7 ([App Store](https://apps.apple.com/app/id848312533)) |

The evidence on daily limits points one way. **Users love limits that are free, uniform and unpurchasable, and they revolt against limits they can buy off.** Wordle went from 90 players to over 2 million in about ten weeks on one puzzle a day. Its creator described the scarcity as the point, at about 3 minutes a day ([Wikipedia](https://en.wikipedia.org/wiki/Wordle)). Duolingo's 2025 energy system drew heavy criticism and a petition ([Android Authority](https://androidauthority.com/quitting-duolingo-energy-system-3599842)). Nintendo shows the opposite failure: when an interruption cost players the whole day's session, the lock felt punitive. So the lock should allow resuming within the same day.

The user complaints line up with the differentiators:
- **Content runs out** (games repeat within weeks to months, per a competitor blog, unverified): answer with procedural generation.
- **No answers or explanations:** show the correct answer and an explanation after every item.
- **Opaque "verified" facts:** put a cited source on every card.

**Unoccupied positions:** a free lock that cannot be bought off; one cross-genre random session (competitors make users pick games or offer one genre); STEM-only cards with sources; rare memory formats instead of card-flip; and riddles with answers, explanations and difficulty tags.

**Unverified scope limits:** the scan was not exhaustive. Play Store-only and Indian-market apps were not checked, and INR pricing was not retrieved.

---

## Sixty-five generatable mechanics cover every required category

Every entry is a design inference built on a named source task or puzzle genre. All of them can be seeded from the date. Round lengths are design targets, not measurements.

- **Build:** E = under 1 day, M = 1–3 days, H = a week or more (needs a solver or generator).
- **★** marks the best novelty-to-effort picks.
- **Source tasks:** the cognitive tasks come from established psychology paradigms: stop-signal ([eLife consensus guide](https://elifesciences.org/articles/46323/figures)), UFOV ([Wikipedia](https://en.wikipedia.org/wiki/Useful_field_of_view)) and MOT ([Wikipedia](https://en.wikipedia.org/wiki/Multiple_object_tracking)).
- **Mazes:** maze texture depends on the generation algorithm ([Jamis Buck](https://weblog.jamisbuck.org/2011/2/7/maze-generation-algorithm-recap)). Rule mazes descend from Robert Abbott's logic mazes ([Wikipedia](https://en.wikipedia.org/wiki/Logic_maze)).

### Reflex and attention (11)
| ID | Name | Mechanic | Seeded variables / knobs | Round | Build |
|---|---|---|---|---|---|
| A1★ | Brake Light | Stop-signal: tap "go", withhold when a brake light flashes; the stop delay adapts by staircase | Trial order (~25% stop [UNVERIFIED parameter]), stop delay, deadline | 60–90 s | E |
| A2 | Rule Flip | Go/no-go where the rule switches every N items | Stream, switch points, cued vs uncued | 90 s | E |
| A3 | Peripheral Flash | UFOV: name the central object and locate the peripheral target, then a mask | Display duration (frame-quantised, ~16.7 ms steps), eccentricity, distractors | 2 min | M |
| A4 | Swarm | Multiple object tracking: 3–4 of 10 dots flash, then all move; find the targets | Positions and velocities, targets 1–6, speed, crowding | ~1.5 min | E–M |
| A5★ | Catch the Comet | Coincidence-anticipation: tap when an occluded dot reaches the gate; score is signed error in ms | Speed profile, occlusion fraction | ~1 min | E |
| A6 | Inner Clock | Reproduce an interval of 0.8–4 s by holding a button | Interval list, distraction | 1 min | E |
| A7 | Metronome Fade | Tap along with a beat, keep the tempo after it fades | Tempo, fade point, syncopation (needs latency calibration) | 60 s | M |
| A8 | Global/Local | Navon letters: answer the BIG or small letter as cued | Letter pairs, congruency ratio | 60–90 s | E |
| A9 | Flock Flanker | Eriksen flanker with a coherent-motion twist | Flanker count, incongruent ratio | 60 s | E |
| A10 | Blink | Attentional blink: find two digits in a ~10 items/s letter stream | T1 position, lag, rate | ~1.5 min | E |
| A11 | Odd One Out | Feature vs conjunction visual search, including target-absent trials | Poisson-disc layout, set size | 60 s | E |

### Memory, no card-flip (8)
| ID | Name | Mechanic | Seeded variables / knobs | Round | Build |
|---|---|---|---|---|---|
| M1 | Constellation | Corsi span on stars: retrace the order, reverse it, or retrace after the sky rotates 90° | Star layout, sequence, span staircase | 1.5 min | E |
| M2 | Spot the Change | Flicker change-detection on procedural shape scenes | Scene, mutation type, blank duration | ~2 min | M |
| M3 | Dual Stream | Dual n-back where n changes mid-round, cued by colour | Sequence with a controlled 30% match rate, lures | 2 min | E–M |
| M4 | Running Tally | PASAT-lite: sum of the last two numbers | Digit stream, interval 3 s→1.6 s, operation | 60–90 s | E |
| M5 | Shape Twins | Shepard–Metzler 3D rotation: same object or mirror? | Cube walk, rotation, 50% mirror | ~1.5 min | M |
| M6★ | Dead Reckoning | Path integration: follow a walk, then point home and estimate the distance | Leg lengths, turn angles | ~2 min | M |
| M7 | Sky Map | Study a route for 10 s, then redraw it on a blank grid | Route, grid | ~1.5 min | E |
| M8 | Switch Sort | Task switching: parity or vowel/consonant, depending on where the pair appears | Pair stream, run length | 90 s | E |

### Math and aptitude (7)
| ID | Name | Mechanic | Generation / check | Round | Build |
|---|---|---|---|---|---|
| N1★ | Make 24 / Countdown | Combine numbers with + − × ÷ to hit a target | Brute-force solver (<10k expressions) rejects unsolvable draws; fewer solutions = harder | ~2 min | E |
| N2★ | Doomsday Sprint | Give the weekday of a random date from 1800–2199 | JS Date verifies the answer; teach the Doomsday rule | 60 s | E |
| N3★ | Fermi Line | Order-of-magnitude estimate on a log slider; score = abs(log10(guess/answer)) | Curated 365+ bank plus unit-conversion templates | ~2 min | E (content-heavy) |
| N4 | Calibration Quiz | Give 90% confidence intervals for numeric facts; tracks calibration over time | Same bank as N3 | ~2 min | E |
| N5 | Triad | Set-style triples: 4 attributes × 3 values (avoid the "SET" trademark) | Deal, then check all 220 triples for ≥ k sets | 2 min | E |
| N6 | KenKen / Kakuro / Futoshiki | Arithmetic Latin squares, 4×4–5×5 | Latin square → cages → uniqueness solver (port Tatham's Keen) | 2–4 min | H |
| N7 | Sequence Detective | Next term from composed rules | Rule grammar; reject if a simpler rule fits | ~2 min | M |

### Logic puzzles (8)
| ID | Name | Mechanic | Generation / check | Round | Build |
|---|---|---|---|---|---|
| L1 | Nonogram | Picture logic, 5×5–8×8 | Random or blob bitmap; keep only if a line solver solves it uniquely | 2–3 min | M |
| L2 | Slitherlink | Draw a single loop from the number clues | Random loop → all clues → prune while solution stays unique | ~3 min | H |
| L3 | Hashi | Connect islands with bridges | Planar connected graph → counts → uniqueness check | ~2 min | M–H |
| L4 | Numberlink / Nurikabe / Range | Path and region puzzles | Solution → clues → prune (Numberlink is easiest) | ~2–3 min | M–H |
| L5 | Code Lock | Mastermind, 4 pegs from 6 colours; Black Box variant | Seed the code | 2 min | E |
| L6 | Mini Zebra | 3×4 logic grid | Random solution → add clues greedily until unique → drop redundant clues | 3 min | M–H |
| L7 | Signpost / Inertia / Net | Tatham touch puzzles | Port the MIT code | 2 min | M |
| L8 | (see R1) | Knights & Knaves | — | — | — |

### Mazes (11)
| ID | Name | Mechanic | Generation / check | Round | Build |
|---|---|---|---|---|---|
| Mz1★ | Vanishing Walls | Walls show for 5–10 s, then hide; bumping a wall flashes it | Recursive backtracker (long corridors) | 1.5 min | E |
| Mz2 | Fog of War | Only cells within radius r are visible | Prim's (many dead ends), braid factor adds loops | 2 min | E |
| Mz3★ | Alternating Colour | Each step must alternate red/blue (Abbott-style) | BFS over (cell, last colour); reject if greedy solves it | 2 min | M |
| Mz4 | Number Jump | Move exactly k cells, where k is the cell's number | BFS depth = difficulty | 1–2 min | E |
| Mz5★ | Theseus & Minotaur | Minotaur takes 2 steps per player step | BFS over (player, minotaur) states, minimum 15+ moves; hill-climb walls | 2–3 min | M–H |
| Mz6 | Ice Slide / Multi-ball Tilt | Slide until hitting a wall; one tilt moves every ball | BFS over stopping positions | ~2 min | E–M |
| Mz7 | Gravity Rotate | Maze rotates 90° per move, then the ball drops | BFS over (position, rotation) | ~2 min | M |
| Mz8 | One-way + Portals | Directed edges and paired teleports | Perfect maze → convert some edges to one-way arcs → BFS reachability | ~2 min | E–M |
| Mz9 | Hex / Theta | Hexagonal or circular grids | Wilson's (unbiased) on any graph | ~2 min | M |
| Mz10 | No Left Turn | Only straight or right turns allowed | BFS over (cell, heading) | ~2 min | E |
| Mz11 | Area Maze | Tile areas must alternately increase and decrease | State BFS | ~2 min | M |

### Riddles and lateral thinking (8)
| ID | Name | Mechanic | Source | Round | Build |
|---|---|---|---|---|---|
| R1★ | Knights & Knaves | 2–4 islanders, truth-tellers or liars | Procedural: statement grammar, enumerate 2ⁿ assignments, add statements until exactly one is consistent | ~2 min | M |
| R2★ | Matchstick Fix | Move one stick to make a seven-segment equation true | Procedural: inverse move from a true equation, then brute-force uniqueness | ~2 min | M |
| R3 | River Crossing | "Cannot be left alone" constraints, boat capacity k | Procedural: BFS over bank states, minimum 7+ moves | 2–3 min | M |
| R4 | Compound Triads | Find the word linking three cues (remote-associates style; Hindi possible) | Procedural from a compound-word list; check no other hub word fits ([RAT](https://en.wikipedia.org/wiki/Remote_Associates_Test)) | ~2 min | M |
| R5 | Situation Puzzle | "Turtle soup" yes/no questioning | Curated; use a fixed decision tree, because a live LLM breaks zero cost | 2–3 min | M |
| R6 | Insight Classics | Nine-dot, candle problem, coin weighing | Curated; coin weighing is procedural | ~2 min | E–M |
| R7 | Rebus | Word arrangements, e.g. MIND over MATTER | Phrase list plus spatial templates | ~1 min | M |
| R8 | Out-of-the-box Fermi | "How many ₹1 coin rolls circle the Earth?" | Generated from N3 templates | ~1 min | E |

### Science, geography and meteorology games (12)
| ID | Name | Mechanic | Data | Round | Build |
|---|---|---|---|---|---|
| G1 | Pin Drop | Place a city on a blank map; score decays with distance | GeoNames / Natural Earth | ~1.5 min | M |
| G2 | Hot/Cold Country | Globle-style proximity colouring | Country list | ~2 min | M |
| G3★ | Climograph Detective | Name the city from its temperature and rainfall chart | Climate normals (licence check needed; Open-Meteo is CC BY) | ~2 min | M |
| G4 | Köppen Classifier | Apply Köppen rules to a climograph; the answer is computed | Same data | ~2 min | M |
| G5★ | Isobar Wind Reader | Read wind direction and strength from a procedural pressure field (Buys Ballot's law) | Fully procedural | ~2 min | M–H |
| G6 | Cloud Spotter | Identify the 10 cloud genera from photos | Commons photos checked one by one (not the WMO atlas) | ~1 min | E (content) |
| G7★ | Scale Ladder | Order 5 items by a physical quantity; score by Kendall tau | Wikidata snapshot | ~1.5 min | E |
| G8 | Higher/Lower Physics | Streak game: which quantity is larger? | Same table | ~1 min | E |
| G9 | Element Hunt | Periodic-table property hunt, Wordle-style feedback | 118-row table | ~1.5 min | E |
| G10 | Timeline Drop | Place an event in time; log scale for deep time | Wikidata snapshot | ~1.5 min | E |
| G11 | Outline / Trade | Guess the country from its outline, rivers or exports | Natural Earth; trade data licence unchecked | ~1.5 min | M |
| G12 | Taxonomy Tree | Metazooa-style deepest shared clade | GBIF taxonomy snapshot (licence unchecked) | ~2 min | M |

The Randopedia cards are the eighth category and are covered in the next section.

**What can honestly be claimed.** Training improves the trained task, but evidence for far transfer is very thin. Simons et al. (2016) found "very little evidence" of gains on distant tasks or everyday cognition ([APS](https://www.psychologicalscience.org/publications/brain-training.html)). Owen et al. (2010) trained 11,430 adults and found no transfer to untrained tasks ([KCL](https://www.kcl.ac.uk/archive/news/ioppn/records/2010/04april/braintraininggamesdonotmakeyousmarter)). The ACTIVE trial's 29% lower dementia risk from speed training is a single older-adult trial and must not be generalised ([ScienceDaily](https://www.sciencedaily.com/releases/2017/11/171116104955.htm)). That evidence argues for a wide, rotating catalogue rather than grinding n-back. It also means the STEM cards are where the real learning value sits.

---

## Content comes from CC0, public-domain and Apache sources; NC sources are out

| Source | Use | Size | Licence | Obligation |
|---|---|---|---|---|
| Wikidata | Templated quiz questions (capitals, rivers, elements, elevations) | Tens of thousands of templated items (inference) | **CC0** ([Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)) | None; query service limit 60 s per query ([docs](https://search.r-project.org/CRAN/refmans/WikidataQueryServiceR/html/query_wikidata.html)) |
| Wikipedia Vital Articles L4 / L5 | Randopedia topic list plus source text | L4 10,005 total (geography 1,209, physical sciences 1,115, maths 298); L5 has about 15.6k geography, physical-science and biology articles ([L5](https://arhiva.e-laboratorij.carnet.hr/en.wikipedia.org/wiki/Wikipedia_Vital_articles/Level/5.html), [L4](https://arhiva.e-laboratorij.carnet.hr/en.wikipedia.org/wiki/Wikipedia_Vital_articles/Level/4.html)) | CC BY-SA | Link and licence on each card; paraphrased cards stay BY-SA. The app itself is a collection, so ShareAlike does not spread to it ([CC](https://wiki.creativecommons.org/wiki/ShareAlike_interpretation)) |
| NASA / Earth Observatory | Astronomy and earth-science cards | — | US public domain ([NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/)) | No logos; never write "according to NASA" on AI-drafted text; drop third-party-credited images |
| NWS JetStream / USGS | Meteorology and geology cards | — | Public domain ([NWS](https://www.weather.gov/disclaimer), [USGS](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted)) | Do not imply endorsement; credit USGS |
| Natural Earth | Maps for G1, G2, G11 | — | Public domain ([terms](https://www.naturalearthdata.com/about/terms-of-use/)) | None |
| Open-Meteo | Climate normals for G3 and G4 | — | CC BY 4.0 ([licence](https://open-meteo.com/en/licence)) | "Weather data by Open-Meteo.com"; free tier is non-commercial [UNVERIFIED] |
| OpenStreetMap | Geography facts only | — | ODbL ([OSM](https://www.openstreetmap.org/copyright)) | Shipping extracted OSM data triggers share-alike |
| AQuA-RAT | Aptitude word problems | 97,467 train | Apache-2.0 ([HF](https://huggingface.co/datasets/deepmind/aqua_rat)) | Re-solve in code; answer keys are noisy [UNVERIFIED] |
| MathQA | Aptitude | ~37k | Apache-2.0 ([HF](https://huggingface.co/datasets/allenai/math_qa)) | Same |
| GSM8K | Arithmetic reasoning | 8,792 | MIT ([HF](https://huggingface.co/datasets/openai/gsm8k)) | Notice |
| MMLU (STEM and geography subsets) | Hard-tier quiz | 14k test overall | MIT ([HF](https://huggingface.co/datasets/cais/mmlu)) | Filter by level; many items are college-level |
| ARC | Science MCQ | 7,787 | CC BY-SA 4.0 ([HF](https://huggingface.co/datasets/allenai/ai2_arc)) | Attribute; keep in a separate BY-SA pack |
| Open Trivia DB | STEM trivia | 5,299 total, small STEM share | CC BY-SA 4.0 ([opentdb](https://opentdb.com/)) | Spot-check; rate limit 1 call per 5 s |
| **Avoid** | SciQ (NC), Trivia API (NC), Knights & Knaves dataset (NC-SA), BRAINTEASER (research-only), RiddleSense (no licence), current OpenStax (BY-NC-SA), CK-12, Khan, WMO Cloud Atlas (no derivatives) | | ([OpenStax](https://openstax.org/license), [WMO](https://cloudatlas.wmo.int/en/copyright.html), [SciQ](https://huggingface.co/datasets/allenai/sciq)) | Generate Knights & Knaves yourself; use WMO and AMS only for fact-checking |

**No clean commercial riddle or lateral-thinking corpus exists.** Riddle-site wordings are copyrighted, and one incumbent app faces an alleged-plagiarism complaint ([App Store](https://apps.apple.com/app/id848312533)). Generate whatever can be generated: Knights & Knaves, matchsticks, river crossings, triads and Fermi problems. Write original situation puzzles and rebuses, drafted with an LLM and checked by a human.

**Card pipeline.**
1. Take topic titles from the Vital Articles lists.
2. Pull source text from Wikipedia summaries or the Hugging Face dump, plus NWS, USGS and NASA pages.
3. A local open-weights LLM drafts 2–5 cards and 2–3 MCQs per article, each with a required verbatim `support_quote`. The RTX 5060 Ti in your hardware notes can run this at no cost.
4. Verify:
   - String-check that each quote appears in the source.
   - Have a second model answer from the passage alone.
   - Re-run every numeric item in code.
   - Dedupe with embeddings.
   - Human-review 5–10% of each batch and reject the batch above about 2% errors.

Staged multi-agent pipelines are reported to cut STEM MCQ hallucinations by more than 90% ([arXiv 2601.14280](https://arxiv.org/abs/2601.14280v1)). Tag every item with source URL, revision ID, licence and how it was generated, and show a "Sources & licences" screen in the app. **Storage** (inference): 10k items is about 1.5–4 MB compressed; 100k is about 15–35 MB. That fits a PWA comfortably.

---

## A static PWA on Cloudflare runs the whole thing for ₹0

| Host / backend | Free limits | Catch | Role |
|---|---|---|---|
| **Cloudflare Pages** | Unlimited bandwidth and static requests, 500 builds/month, 25 MiB per file, 20k files ([pages](https://pages.cloudflare.com/), [limits](https://developers.cloudflare.com/pages/platform/limits/)) | — | **Primary host** |
| GitHub Pages | 1 GB site, 100 GB/month soft limit ([docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | No custom headers [UNVERIFIED]; not for commercial SaaS | Mirror |
| Netlify Free | 300 credits ≈ 15 GB bandwidth ([pricing](https://www.netlify.com/pricing/)) | Site pauses when credits run out | Skip |
| Vercel Hobby | 100 GB transfer | Non-commercial only; even AdSense counts as commercial, donations do not ([Vercel](https://vercel.com/docs/limits/fair-use-guidelines)) | Skip |
| Firebase Hosting | 360 MB/day ([pricing](https://firebase.google.com/pricing)) | Too small for the content bank | Skip |
| **Cloudflare Workers + D1 + KV** | 100k requests/day; D1 500 MB per database; KV 1k writes/day ([Workers](https://developers.cloudflare.com/workers/platform/limits/), [D1](https://developers.cloudflare.com/d1/platform/limits/), [KV](https://developers.cloudflare.com/kv/platform/limits/)) | Auth is do-it-yourself | **Optional backend** (server time, streaks) |
| Supabase Free | 500 MB database, 50k MAU auth ([pricing](https://supabase.com/pricing)) | Pauses after 1 week of inactivity | Auth, if accounts are needed |
| Firebase Spark | Auth 50k MAU; Firestore 50k reads/day | No Cloud Functions | Auth alternative |
| PocketBase | — | Self-host only, pre-1.0 ([FAQ](https://pocketbase.io/faq/)) | Skip |

**Stack:**
- **Frontend:** Vite + Svelte (or vanilla TypeScript) + vite-plugin-pwa/Workbox ([guide](https://vite-pwa-org.netlify.app/guide/)), with Dexie/idb over IndexedDB. Avoid localStorage: it holds about 5 MiB, strings only, and blocks the main thread ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- **Rendering:** DOM/SVG grids beat Canvas and Phaser for accessibility and payload, which matters on low-end Android phones.
- **Content delivery:** chunked JSON per category, loaded lazily. SQLite-WASM over OPFS needs COOP/COEP headers and adds complexity it doesn't repay here ([Chrome](https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system)).
- **iOS:** iOS 26 installs any site as a home-screen web app ([heise](https://heise.de/-10749652)). There is still no install prompt, so show a "how to install" hint. Installing also exempts the app from Safari's 7-day storage eviction ([web.dev](https://web.dev/articles/storage-for-the-web)).
- **Distribution:** Play Store via a Bubblewrap TWA costs a one-time $25 [fee UNVERIFIED this session]. New personal accounts must first run a closed test with 12 testers for 14 days ([Play help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)); the BAJA team could fill that. Skip the App Store: $99/yr, and individuals get no fee waiver ([Apple](https://developer.apple.com/support/membership-fee-waiver/)).

### Seeded randomisation
Seed with `seed = xmur3(dateKey + ':' + gameId)`, then build the generator with `rand = sfc32(seed(), seed(), seed(), seed())`. sfc32 passes PractRand and BigCrush; mulberry32 skips about a third of its outputs ([bryc PRNGs](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)).

- **Shared vs per-user seeds:** a global seed for the core puzzles gives Wordle-style comparable, shareable results. Use per-user seeds for review items.
- **Generation loop:** generate, verify with a solver or BFS, score difficulty, and reject-sample until the score lands in the weekday's band (Monday easy, Sunday hard).
- **Pre-baking:** pre-bake heavy generators such as Slitherlink and KenKen for the next N days at build time, so low-end phones never run solvers.
- **Version pinning:** pin the generator version, because any code change reshuffles every future seed.

### The daily lock
A client-only lock cannot be bypass-proof. Treat it as a nudge, not DRM. Original Wordle's client-side schedule already broke across cached copies ([ABC11](https://abc11.com/post/ny-times-buys-wordle-word-of-the-day-game/11571286/)). The mechanics below are design inference:

- **Timer:** count *active* seconds with `performance.now()`, paused when `visibilityState` is hidden. Persist the count to IndexedDB every few seconds and on `pagehide`, so a reload cannot reset it.
- **Locking:** lock at 600–900 s or when the day's content is finished. Unlock at the next local midnight (IST), keyed on `dateKey`.
- **Clock tampering:** keep a high-water mark of the latest time seen; if the clock goes backwards, stay locked. A free Worker returning `Date.now()` closes the clock-change hole when online.
- **Clearing storage:** this also wipes streaks, which is deterrent enough.
- **Interruptions:** allow resuming within the day. Never forfeit the day the way Kawashima does.
- **Never sell extra sessions.**

---

## A 12-minute interleaved session turns the lock into spaced practice

The lock is not just an engagement trick; it enforces distributed practice. Distributed practice beats massed practice across 317 experiments ([Cepeda 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/)). Testing beats restudying at one week, 61% vs 40% recall ([Roediger & Karpicke 2006](https://www.gwern.net/docs/spaced-repetition/2006-roediger.pdf)). Mixing problem types is "vastly superior" to blocking them by type ([Rohrer & Taylor 2007](https://digitalcommons.usf.edu/psy_facpub/1767/)).

| Phase | Content | Time |
|---|---|---|
| Warm-up | 1 easy reflex round, slightly below the user's rating | ~1 min |
| Review | 3–5 due quiz items from earlier cards (spaced ladder: days 1, 3, 7, 16, 35) | ~2 min |
| Core | 3–4 random puzzles, all from different categories, weighted toward weak or stale skills | ~5–6 min |
| Randopedia | 1 new sourced STEM card with a "why it matters" line; first quizzed **tomorrow**, not today | ~1.5 min |
| Boss | 1 harder puzzle; failing is fine | ~1.5 min |
| Wrap-up | Spoiler-free emoji grid (WhatsApp-shareable), streak, tomorrow's teaser, then lock | ~0.5 min |

(Design inference; hard cap 15 minutes, ending the current round gracefully.)

**Adaptation:**
- **Ratings:** one Elo rating per skill (6–8 skills), with predicted success P = 1/(1+e^-(θ−d)). Pick items at P ≈ 0.75–0.8 ([Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)).
- **Cold start:** item difficulties need about 100 users to settle, so hand-tune levels first.
- **Parametric games:** use a 1-up/3-down staircase, which converges at about 79.4% correct ([Levitt](https://metricgate.com/docs/transformed-up-down-staircase-levitt/)).
- **Review scheduling:** SM-2 for the MVP; switch to FSRS (ts-fsrs) once review history exists ([Anki](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm.md)).

**Retention, using Duolingo's evidence:**
- **Low-bar streaks:** letting any single lesson extend a streak raised D14 retention by 3.3% ([Duolingo 2020](https://blog.duolingo.com/improving-the-streak)).
- **Freezes:** up to 2 streak freezes raised DAU without increasing days off ([Duolingo 2022](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
- **Rules for this app:** freezes are earned, never bought; celebrate the 3/7/14-day milestones; also show a "5 of 7 days" view; send no guilt notifications.
- **Motivation:** frame the experience around autonomy, competence and relatedness ([Ryan et al. 2006](https://sciencedaily.com/releases/2006/12/061226134706.htm)).

**Privacy:**
- Use no account and no ads in the MVP, plus cookieless analytics (Umami or GoatCounter) ([Databuddy](https://www.databuddy.cc/blog/best-self-hosted-web-analytics-developers-2026)).
- Track D1/D7/D30 retention, completion rate, per-skill accuracy against the 75–80% target, and share rate.
- India's DPDP rules on children's data (verifiable parental consent for under-18s, no behavioural tracking) take effect **14 May 2027** ([AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)). STEM content will attract minors, so add an age gate before adding accounts.

### Phased build plan (planning estimate at about 8–10 h/week, not benchmarked)
| Phase | Weeks | Deliverables |
|---|---|---|
| MVP | 1–2 | PWA shell on Cloudflare Pages, sfc32 date seed, session state machine, active-time lock in IndexedDB |
| | 3–5 | 5 games: Brake Light (A1), Constellation (M1), Vanishing Walls (Mz1), Make 24 (N1), Knights & Knaves (R1) |
| | 6 | 60–100 sourced STEM cards with 1–2 quiz items each; SM-2 review |
| | 7–8 | Streak with an earnable freeze, share grid, stats page, analytics, privacy notice, 10–20 testers, launch |
| v1 | 9–16 | Per-skill Elo, weighted category picks, 8–12 games (add Catch the Comet, Doomsday Sprint, Matchstick, Theseus, Alternating Colour, Scale Ladder, Isobar Wind), Wikidata question templates, 300+ cards, heatmap, accessibility, Hindi |
| v2 | 16+ | FSRS, LLM card pipeline at scale, pre-baked Tatham-port logic genres, optional accounts with an age gate, friends or class leaderboard on the global seed, Play TWA once retention is proven |

---

## Conclusion

The product's moat is a principle that competitors cannot copy without breaking their revenue model: **the lock is the product, and it is not for sale.** Every incumbent monetises the cap. A free, unpurchasable, honestly framed lock sits on the Wordle side of user sentiment. The spacing and testing literature gives it a real learning rationale, which brain-game marketing cannot claim.

Read this way, the requirements are less heavy than they look. "Very large database" and "randomised levels every day" mostly dissolve into seeded generators with verifiers: mazes, logic grids, Knights & Knaves, matchsticks, arithmetic, Wikidata templates and Isobar Wind are effectively unlimited and need no licence. The genuinely finite, hand-curated work narrows to two places: the Randopedia cards and the riddle and situation-puzzle bank. That is where to spend effort, through a verify-before-ship LLM pipeline. Gaps still open:
- Indian and Play Store competitor scan
- D1 daily row quotas
- Open-Meteo commercial terms
- iOS 26 storage rules from Apple itself
- Whether anonymous analytics counts as personal data under DPDP
