<script lang="ts">
  import { audio } from '../audio/bus'
  import { daySeed } from '../engine/composer'
  import { formatCountdown, msUntilMidnight } from '../lib/clock'
  import { dev } from '../lib/dev'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import PlanetView from '../ui/PlanetView.svelte'

  const left = $derived(formatCountdown(msUntilMidnight(app.nowMs)))

  $effect(() => {
    audio.scene('lock')
  })
</script>

<section class="screen lock" data-testid="lock-screen">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Stats and logbook" onclick={() => app.open('stats')}><Icon name="chart" /></button>
    <span class="brand">ORBIT</span>
    <button class="btn ghost icon-btn" aria-label="Settings" onclick={() => app.open('settings')}><Icon name="gear" /></button>
  </header>
  <PlanetView seed={daySeed(app.today, dev.seedOverride)} size={220} sleeping label="Today's planet, resting" />
  <div class="center">
    <h1>Mission complete.</h1>
    <p class="muted">Return tomorrow.</p>
  </div>
  <div class="center count">
    <p class="label">Next mission in</p>
    <p class="clock" data-testid="countdown">{left}</p>
  </div>
  <div class="center">
    <button class="btn" onclick={() => app.open('stats')}><Icon name="book" size={18} /> Logbook</button>
  </div>
</section>

<style>
  .lock {
    gap: 14px;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.32em;
    font-size: 0.85rem;
  }
  h1 {
    margin: 0;
  }
  .clock {
    font-size: 2.6rem;
    font-weight: 300;
    letter-spacing: 0.04em;
    margin: 4px 0 0;
    font-variant-numeric: tabular-nums;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
