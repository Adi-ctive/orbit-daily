<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audio } from '../audio/bus'
  import { ensureItem } from '../content/loader'
  import type { ContentItem } from '../content/types'
  import { CATEGORY_LABEL, catalogEntry } from '../games/catalog'
  import { loadGame } from '../games/registry'
  import { generateVerified, type GameFx, type GameInstance, type RoundResult } from '../games/types'
  import { formatCountdown } from '../lib/clock'
  import { haptic } from '../lib/haptics'
  import { RNG } from '../lib/rng'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import Mascot from '../ui/Mascot.svelte'
  import Burst from '../ui/Burst.svelte'
  import OrbitProgress from '../ui/OrbitProgress.svelte'
  import { SESSION_TARGET_MIN } from '../config'

  type Stage = 'intro' | 'loading' | 'play' | 'feedback' | 'warp'
  let stage = $state<Stage>('intro')
  let host: HTMLDivElement | undefined = $state()
  let instance: GameInstance | null = null
  let result = $state<RoundResult | null>(null)
  let title = $state('')
  let howTo = $state('')
  let shake = $state(0)
  let busy = false

  const round = $derived(app.currentRound)
  const day = $derived(app.day)
  const phaseLabel: Record<string, string> = {
    warmup: 'Warm-up',
    review: 'Review',
    core: 'Core',
    card: 'Star Chart',
    boss: 'Boss',
  }

  $effect(() => {
    const r = round
    if (!r) return
    void loadGame(r.gameId).then((m) => {
      title = m.title
      howTo = m.howTo
    })
  })

  $effect(() => {
    audio.scene('focus')
  })

  // Combo: three or more correct answers in a row upgrade the chime and buzz.
  let combo = $state(0)
  let burst = $state(0)
  const fx: GameFx = {
    sfx: (n, c) => {
      if (n === 'correct') {
        combo++
        if (combo >= 3) {
          audio.sfx('combo', combo)
          haptic('combo')
          if (combo % 3 === 0) burst++
          return
        }
      } else if (n === 'wrong') combo = 0
      audio.sfx(n, c)
    },
    haptic: (n) => haptic(n),
    shake: (px) => {
      if (app.reducedMotion) return
      shake = Math.min(2, px)
      setTimeout(() => (shake = 0), 120)
    },
    duck: (on) => audio.duck(on),
  }

  async function start() {
    const r = round
    if (!r || busy || !host) return
    busy = true
    stage = 'loading'
    try {
      audio.unlock()
      const m = await loadGame(r.gameId)
      let items: ContentItem[] | undefined
      if (r.items?.length) {
        items = (await Promise.all(r.items.map((id) => ensureItem(id)))).filter((x): x is ContentItem => !!x)
      }
      const rng = new RNG(r.seed)
      const level = generateVerified(m, rng, r.difficulty)
      await app.beginRound()
      // Game modules own this element and render into it directly.
      // eslint-disable-next-line svelte/no-dom-manipulating
      host.replaceChildren()
      stage = 'play'
      audio.sfx('start')
      instance = m.mount({
        host,
        level,
        difficulty: r.difficulty,
        rng: rng.fork('runtime'),
        fx,
        reducedMotion: app.reducedMotion,
        boss: r.phase === 'boss',
        items,
        finish: (res) => void onFinish(res),
      })
    } catch (e) {
      console.error(e)
      app.crashed = String(e)
    } finally {
      busy = false
    }
  }

  let finishing = false
  async function onFinish(res: RoundResult) {
    const r = round
    if (!r || finishing) return
    finishing = true
    try {
      audio.duck(false)
      instance?.destroy()
      instance = null
      result = res
      const good = res.score >= 0.6
      fx.sfx(good ? 'correct' : 'wrong')
      fx.haptic(good ? 'correct' : 'wrong')
      // Persist first, then show the feedback.
      await app.completeRound(
        { gameId: r.gameId, phase: r.phase, category: r.category, score: res.score, correct: res.correct, total: res.total, ms: 0 },
        res.reviews ?? [],
        res.learned,
      )
      stage = 'feedback'
      if (good) burst++
    } finally {
      finishing = false
    }
  }

  function next() {
    haptic('tap')
    result = null
    app.advance()
    if (app.screen !== 'session') return
    if (app.reducedMotion) {
      stage = 'intro'
      return
    }
    stage = 'warp'
    setTimeout(() => (stage = 'intro'), 650)
  }

  function onVisibility() {
    if (!instance) return
    if (document.visibilityState === 'hidden') instance.pause?.()
    else instance.resume?.()
  }

  // Dev panel "skip round": finish the current round through the normal path.
  function onDevSkip() {
    if (stage === 'intro' || stage === 'play') void onFinish({ score: 0.8, correct: 4, total: 5, answer: 'Skipped (dev)', explanation: 'Dev-mode skip.' })
  }

  document.addEventListener('visibilitychange', onVisibility)
  addEventListener('orbit:dev-skip', onDevSkip)
  onDestroy(() => {
    removeEventListener('orbit:dev-skip', onDevSkip)
    document.removeEventListener('visibilitychange', onVisibility)
    instance?.destroy()
    audio.duck(false)
  })

  const stars = (s: number) => (s >= 0.9 ? 3 : s >= 0.6 ? 2 : s >= 0.3 ? 1 : 0)
</script>

<section class="screen session" style:transform={shake ? `translate(${shake}px, ${-shake}px)` : undefined}>
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back to mission control" disabled={stage === 'play'} onclick={() => (app.screen = 'home')}>
      <Icon name="back" />
    </button>
    {#if day}
      <OrbitProgress total={day.plan.length} index={day.index} />
      {#if combo >= 3}<span class="label combo" aria-live="polite">×{combo}</span>{/if}
      <span class="label timer" aria-label="Active mission time">{formatCountdown(day.activeMs).slice(3)} / {SESSION_TARGET_MIN}m</span>
    {/if}
  </header>

  {#if round && (stage === 'intro' || stage === 'loading')}
    <div class="intro">
      <p class="label phase">{phaseLabel[round.phase]} · {catalogEntry(round.gameId) ? CATEGORY_LABEL[catalogEntry(round.gameId)!.category] : phaseLabel[round.phase]}</p>
      <h2>{title}</h2>
      <Mascot mood="idle" size={72} />
      <p class="panel how">{howTo}</p>
      <button class="btn primary go" data-testid="round-start" disabled={stage === 'loading'} onclick={start}>
        {stage === 'loading' ? 'Preparing…' : 'Start'}
      </button>
    </div>
  {/if}

  <div class="game" class:hidden={stage !== 'play'} bind:this={host}></div>

  {#if stage === 'feedback' && result}
    <div class="feedback" data-testid="feedback">
      <Mascot mood={result.score >= 0.6 ? 'happy' : 'sad'} size={72} />
      <p class="label stars" aria-label="{stars(result.score)} of 3 stars">
        {'★'.repeat(stars(result.score))}<span class="off">{'★'.repeat(3 - stars(result.score))}</span>
      </p>
      <p class="label">{result.correct} / {result.total}</p>
      <div class="panel answer">
        <p><strong>{result.answer}</strong></p>
        <p>{result.explanation}</p>
      </div>
      <button class="btn primary go" data-testid="round-next" onclick={next}>
        {day?.completed ? 'Debrief' : 'Next'}
      </button>
    </div>
  {/if}

  {#if stage === 'warp'}
    <p class="center label warp" aria-live="polite">Warping…</p>
  {/if}
</section>

<Burst trigger={burst} />

<style>
  .session {
    gap: 8px;
  }
  .combo {
    color: var(--magenta);
    font-size: 0.9rem;
  }
  .timer {
    color: var(--accent-hi);
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .intro,
  .feedback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    margin: auto 0;
  }
  .phase {
    color: var(--cyan-hi);
    margin: 0;
  }
  .how {
    max-width: 30em;
  }
  .go {
    min-width: 160px;
  }
  .game {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .hidden {
    display: none;
  }
  .stars {
    font-size: 2rem;
    color: var(--accent-hi);
    margin: 0;
  }
  .stars .off {
    color: var(--edge);
  }
  .answer {
    text-align: left;
    max-width: 32em;
  }
  .answer p {
    margin: 0.3em 0;
  }
  .warp {
    margin: auto;
    color: var(--cyan-hi);
  }
</style>
