<script lang="ts">
  import { TAGLINE } from '../config'
  import { streakLength } from '../engine/lock'
  import { daySeed } from '../engine/composer'
  import { audio } from '../audio/bus'
  import { haptic } from '../lib/haptics'
  import { dev } from '../lib/dev'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import PlanetView from '../ui/PlanetView.svelte'
  import Streak from '../ui/Streak.svelte'

  const streak = $derived(streakLength(app.profile, app.today))
  const resuming = $derived(!!app.day && app.day.date === app.today && !app.day.completed && app.day.index > 0)
  const standalone = typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches
  let showHint = $state(!standalone && !app.profile.installHintSeen)
  const dateLabel = $derived(
    app.today ? new Date(app.today + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '',
  )

  function launch() {
    haptic('tap')
    void app.launch()
  }

  async function dismissHint() {
    showHint = false
    app.profile.installHintSeen = true
    await app.saveProfile()
  }

  $effect(() => {
    audio.scene('menu')
  })
</script>

<section class="screen home">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Stats and logbook" onclick={() => app.open('stats')}><Icon name="chart" /></button>
    <span class="brand">ORBIT</span>
    <button class="btn ghost icon-btn" aria-label="Settings" onclick={() => app.open('settings')}><Icon name="gear" /></button>
  </header>

  <div class="hero">
    {#key app.today}
      <PlanetView seed={daySeed(app.today, dev.seedOverride)} size={260} />
    {/key}
    <p class="label">{dateLabel}</p>
    <h1>{resuming ? 'Mission in progress' : "Today's mission"}</h1>
    <p class="muted sub">
      {resuming ? `Round ${app.day!.index + 1} of ${app.day!.plan.length}. Pick up where you left off.` : TAGLINE}
    </p>
  </div>

  <Streak count={streak} today={app.today} done={app.profile.completedDates} frozen={app.profile.frozenDates} />

  <div class="launch">
    <button class="btn primary big" data-testid="launch" disabled={app.launching} onclick={launch}>
      <Icon name="play" size={18} />
      <span>{resuming ? 'Resume mission' : "Launch today's mission"}</span>
    </button>
    {#if app.rewound}
      <p class="muted small">Your device clock moved backwards, so ORBIT stays on the latest day it has seen.</p>
    {/if}
  </div>

  {#if showHint}
    <div class="panel hint" role="note">
      <p>Install: in Chrome tap ⋮ then <strong>Add to Home screen</strong>. On iPhone, Share then <strong>Add to Home Screen</strong>.</p>
      <button class="btn ghost" onclick={dismissHint}>Got it</button>
    </div>
  {/if}
</section>

<style>
  .home {
    gap: 18px;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.32em;
    font-size: 0.85rem;
    color: var(--ink);
  }
  .hero {
    text-align: center;
    margin-top: 4px;
  }
  .hero h1 {
    margin: 2px 0 6px;
  }
  .sub {
    margin: 0 auto;
    max-width: 26em;
  }
  .launch {
    margin-top: auto;
    text-align: center;
  }
  .big {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 360px;
    min-height: 58px;
    font-size: 1.02rem;
  }
  .small {
    font-size: 0.85rem;
  }
  .hint {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
    padding: 12px 14px;
  }
  .hint p {
    margin: 0;
    flex: 1;
    color: var(--muted);
  }
</style>
