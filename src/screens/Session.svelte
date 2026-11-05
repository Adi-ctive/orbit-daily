<script lang="ts">
  import { onDestroy } from 'svelte'
  import { audio } from '../audio/bus'
  import { timeLeftMs } from '../engine/lock'
  import { dev } from '../lib/dev'
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
  let rules = $state<{ goal: string; steps: string[] } | null>(null)
  let busy = false

  const round = $derived(app.currentRound)
  const day = $derived(app.day)
  const phaseLabel: Record<string, string> = { warmup: 'Warm-up', core: 'Core', aptitude: 'Aptitude', explainer: 'Explainer', boss: 'Boss', bonus: 'Bonus' }

  $effect(() => {
    const r = round
    if (!r) return
    void loadGame(r.gameId).then((m) => {
      title = m.title
      howTo = m.howTo
      rules = m.rules ?? null
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
      // A fresh random level on every attempt (dev seeds stay fixed for tests).
      const rng = new RNG(dev.seedOverride ? r.seed : r.seed + '|' + nonce())
      const level = generateVerified(m, rng, r.difficulty, 200, { seen: new Set(app.profile.seenItems ?? []) })
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
        res.seenIds,
      )
      stage = 'feedback'
    } finally {
      finishing = false
    }
  }

  /** One tap from the result screen straight into the next round. */
  function next() {
    haptic('tap')
    result = null
    app.advance()
    if (app.screen !== 'session') return
    stage = 'intro'
    void start()
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

  function nonce(): string {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0].toString(36)
  }

  async function more() {
    haptic('tap')
    result = null
    await app.moreRound()
    stage = 'intro'
  }

  async function finish() {
    haptic('tap')
    result = null
    await app.endMission()
  }
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
        {formatCountdown(timeLeftMs(day)).slice(3)}<span class="muted">&nbsp;left</span>
      </span>
    {/if}
  </header>

  {#if !round && day && day.planDone && !day.completed && stage !== 'feedback'}
    <div class="intro">
      <p class="label">Bonus time</p>
      <h1>{formatCountdown(timeLeftMs(day)).slice(3)} left</h1>
      <p class="how">Your planned rounds are done and today's streak is saved. {app.canMore ? 'Keep playing games you have not played today until the time runs out, or finish now.' : 'You have played every game today. Finish the mission to see your debrief.'}</p>
      <div class="two">
        <button class="btn" data-testid="mission-finish" onclick={finish}>Finish mission</button>
        {#if app.canMore}<button class="btn primary" data-testid="round-more" onclick={more}>Another round</button>{/if}
      </div>
    </div>
  {/if}

  {#if round && stage === 'intro'}
    <div class="intro">
      <p class="label">{phaseLabel[round.phase]}{catalogEntry(round.gameId) ? ' · ' + CATEGORY_LABEL[catalogEntry(round.gameId)!.category] : ''}</p>
      <h1>{title}</h1>
      {#if round.note}<p class="note">{round.note}</p>{/if}
      {#if rules}
        <div class="panel rules">
          <p class="goal">{rules.goal}</p>
          <ol>
            {#each rules.steps as st, i (i)}<li>{st}</li>{/each}
          </ol>
        </div>
      {:else}
        <p class="how">{howTo}</p>
      {/if}
      <button class="btn primary go" data-testid="round-start" onclick={start}>{round.phase === 'explainer' ? 'Read' : 'Start'}</button>
    </div>
  {/if}
  {#if stage === 'loading'}<p class="muted center loading">Loading…</p>{/if}

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
      {#if day && day.planDone && !day.completed}
        <p class="muted">Planned rounds done. {formatCountdown(timeLeftMs(day)).slice(3)} left to keep playing.</p>
        <div class="two">
          <button class="btn" data-testid="mission-finish" onclick={finish}>Finish mission</button>
          {#if app.canMore}<button class="btn primary" data-testid="round-more" onclick={more}>Another round</button>{/if}
        </div>
      {:else if day?.completed}
        <button class="btn primary go" data-testid="round-next" onclick={next}>See debrief</button>
      {:else if round}
        <div class="panel upnext">
          <p class="label">Up next · {phaseLabel[round.phase]}</p>
          <p class="t">{title}</p>
          {#if round.note}<p class="note">{round.note}</p>{/if}
          {#if rules}<p class="muted">{rules.goal}</p>{/if}
        </div>
        <button class="btn primary go" data-testid="round-next" onclick={next}>Start {title || 'next round'}</button>
      {/if}
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
  .note {
    color: var(--warm);
    font-weight: 600;
    margin: 0;
  }
  .two {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 400px;
  }
  .two .btn {
    flex: 1;
  }
  .rules {
    text-align: left;
    max-width: 30em;
    width: 100%;
  }
  .rules .goal {
    font-weight: 650;
    margin: 0 0 6px;
    color: var(--ink-bright);
  }
  .rules ol {
    margin: 0;
    padding-left: 1.2em;
    color: var(--muted);
  }
  .rules li {
    margin: 4px 0;
  }
  .upnext {
    text-align: left;
    max-width: 34em;
    width: 100%;
  }
  .upnext p {
    margin: 2px 0;
  }
  .upnext .t {
    font-weight: 650;
    font-size: 1.05rem;
  }
  .loading {
    margin: auto;
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
