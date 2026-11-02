<script lang="ts">
  import { TAGLINE } from '../config'
  import { streakLength } from '../engine/lock'
  import { daySeed } from '../engine/composer'
  import { audio } from '../audio/bus'
  import { haptic } from '../lib/haptics'
  import { dev } from '../lib/dev'
  import { app } from '../state/app.svelte'
  import Constellation from '../ui/Constellation.svelte'
  import Icon from '../ui/Icon.svelte'
  import Mascot from '../ui/Mascot.svelte'
  import PlanetView from '../ui/PlanetView.svelte'

  const streak = $derived(streakLength(app.profile, app.today))
  const resuming = $derived(!!app.day && app.day.date === app.today && !app.day.completed && app.day.index > 0)
  const standalone = typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches
  let showHint = $state(!standalone && !app.profile.installHintSeen)

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
    <h1 class="title">ORBIT</h1>
    <button class="btn ghost icon-btn" aria-label="Settings" onclick={() => app.open('settings')}><Icon name="gear" /></button>
  </header>
  <p class="muted center tag">{TAGLINE}</p>

  {#key app.today}
    <PlanetView seed={daySeed(app.today, dev.seedOverride)} radius={38} />
  {/key}

  <div class="pip">
    <Mascot mood={resuming ? 'happy' : 'idle'} size={72} />
    <p class="say panel">
      {#if resuming}
        Welcome back. Your mission is waiting at round {app.day!.index + 1}.
      {:else if streak > 0}
        Day {streak + (app.profile.completedDates.includes(app.today) ? 0 : 1)} in orbit. New sky, new puzzles.
      {:else}
        Hi, I'm Pip. One mission a day, about fifteen minutes.
      {/if}
    </p>
  </div>

  <div class="center">
    <Constellation count={streak} />
  </div>

  <div class="launch">
    <button class="btn primary big" data-testid="launch" disabled={app.launching} onclick={launch}>
      <Icon name="play" />
      <span>{resuming ? 'Resume mission' : "Launch today's mission"}</span>
    </button>
    {#if app.rewound}
      <p class="muted small">Your device clock moved backwards, so the sky stays on the latest day seen.</p>
    {/if}
  </div>

  {#if showHint}
    <div class="panel hint" role="note">
      <p><strong class="label">Install:</strong> in Chrome tap ⋮ then <em>Add to Home screen</em>. On iPhone use Share then <em>Add to Home Screen</em>.</p>
      <button class="btn ghost" onclick={dismissHint}>Got it</button>
    </div>
  {/if}
</section>

<style>
  .home {
    gap: 10px;
  }
  .title {
    margin: 0;
    color: var(--accent-hi);
    text-shadow: 2px 2px 0 var(--accent-lo);
  }
  .tag {
    margin: 0;
    font-family: var(--label-font);
  }
  .pip {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .say {
    flex: 1;
    margin: 0;
    font-size: 0.95rem;
  }
  .launch {
    margin-top: auto;
    text-align: center;
    padding-top: 8px;
  }
  .big {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    padding: 16px 22px;
    min-height: 64px;
  }
  .small {
    font-size: 0.85rem;
  }
  .hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .hint p {
    margin: 0;
    flex: 1;
  }
</style>
