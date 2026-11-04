<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audio } from '../audio/bus'
  import { SESSION_TARGET_MIN } from '../config'
  import { CATEGORY_LABEL, catalogEntry } from '../games/catalog'
  import { loadGame } from '../games/registry'
  import { generateVerified, type GameFx, type GameInstance, type RoundResult } from '../games/types'
  import { formatCountdown } from '../lib/clock'
  import { haptic } from '../lib/haptics'
  import { RNG } from '../lib/rng'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import ProgressBar from '../ui/ProgressBar.svelte'

  type Stage = 'intro' | 'loading' | 'play' | 'feedback'
  let stage = $state<Stage>('intro')
  let host: HTMLDivElement | undefined = $state()
  let instance: GameInstance | null = null
  let result = $state<RoundResult | null>(null)
  let title = $state('')
  let howTo = $state('')
  let busy = false

  const round = $derived(app.currentRound)
  const day = $derived(app.day)
  const phaseLabel: Record<string, string> = { warmup: 'Warm-up', core: 'Core', aptitude: 'Aptitude', explainer: 'Explainer', boss: 'Boss' }

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
  const fx: GameFx = {
    sfx: (n, c) => {
      if (n === 'correct') {
        combo++
        if (combo >= 3) {
          audio.sfx('combo', combo)
          haptic('combo')
          return
        }
      } else if (n === 'wrong') combo = 0
      audio.sfx(n, c)
    },
    haptic: (n) => haptic(n),
    shake: () => {},
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
        items: r.items,
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
      if (r.phase !== 'explainer') {
        const good = res.score >= 0.6
        audio.sfx(good ? 'correct' : 'wrong')
        haptic(good ? 'correct' : 'wrong')
      }
      // Persist first, then show the feedback.
      await app.completeRound(
        { gameId: r.gameId, phase: r.phase, category: r.category, score: res.score, correct: res.correct, total: res.total, ms: 0 },
        res.learned,
      )
      stage = 'feedback'
    } finally {
      finishing = false
    }
  }

  function next() {
    haptic('tap')
    result = null
    app.advance()
    if (app.screen !== 'session') return
    stage = 'intro'
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

  const pct = (s: number) => Math.round(s * 100)
</script>

<section class="screen session">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back to home" disabled={stage === 'play'} onclick={() => (app.screen = 'home')}>
      <Icon name="back" />
    </button>
    {#if day}
      <ProgressBar total={day.plan.length} index={day.index} />
      <span class="timer" aria-label="Active mission time">
        {#if combo >= 3}<span class="combo">×{combo}</span>{/if}
        {formatCountdown(day.activeMs).slice(3)}<span class="muted"> / {SESSION_TARGET_MIN}:00</span>
      </span>
    {/if}
  </header>

  {#if round && (stage === 'intro' || stage === 'loading')}
    <div class="intro">
      <p class="label">{phaseLabel[round.phase]}{catalogEntry(round.gameId) ? ' · ' + CATEGORY_LABEL[catalogEntry(round.gameId)!.category] : ''}</p>
      <h1>{title}</h1>
      <p class="how">{howTo}</p>
      <button class="btn primary go" data-testid="round-start" disabled={stage === 'loading'} onclick={start}>
        {stage === 'loading' ? 'Loading…' : round.phase === 'explainer' ? 'Read' : 'Start'}
      </button>
    </div>
  {/if}

  <div class="game" class:hidden={stage !== 'play'} bind:this={host}></div>

  {#if stage === 'feedback' && result}
    <div class="feedback" data-testid="feedback">
      {#if result.total > 0 && !result.learned}
        <p class="score" class:good={result.score >= 0.6}>{pct(result.score)}<span>%</span></p>
        <p class="label">{result.correct} of {result.total}</p>
      {:else}
        <p class="label">Saved to your logbook</p>
      {/if}
      <div class="panel answer">
        <p class="a">{result.answer}</p>
        {#if result.explanation}<p class="muted">{result.explanation}</p>{/if}
      </div>
      <button class="btn primary go" data-testid="round-next" onclick={next}>{day?.completed ? 'See debrief' : 'Next round'}</button>
    </div>
  {/if}
</section>

<style>
  .session {
    gap: 12px;
  }
  .timer {
    font-weight: 600;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .combo {
    color: var(--warm);
    margin-right: 8px;
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
  .intro h1 {
    margin: 0;
  }
  .how {
    max-width: 30em;
    color: var(--muted);
    margin: 0 0 8px;
  }
  .go {
    min-width: 200px;
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
  .score {
    font-size: 3.4rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    margin: 0;
    line-height: 1;
    color: var(--bad);
    font-variant-numeric: tabular-nums;
  }
  .score.good {
    color: var(--good);
  }
  .score span {
    font-size: 1.4rem;
    margin-left: 2px;
  }
  .answer {
    text-align: left;
    max-width: 34em;
    width: 100%;
  }
  .answer p {
    margin: 0.3em 0;
  }
  .a {
    font-weight: 600;
  }
</style>
