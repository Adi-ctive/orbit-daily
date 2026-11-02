<script lang="ts">
  import { audio } from '../audio/bus'
  import { daySeed } from '../engine/composer'
  import { formatCountdown, msUntilMidnight } from '../lib/clock'
  import { dev } from '../lib/dev'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import Mascot from '../ui/Mascot.svelte'
  import PlanetView from '../ui/PlanetView.svelte'

  const left = $derived(formatCountdown(msUntilMidnight(app.nowMs)))

  $effect(() => {
    audio.scene('lock')
  })
</script>

<section class="screen lock" data-testid="lock-screen">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Stats and logbook" onclick={() => app.open('stats')}><Icon name="chart" /></button>
    <Icon name="moon" scale={3} />
    <button class="btn ghost icon-btn" aria-label="Settings" onclick={() => app.open('settings')}><Icon name="gear" /></button>
  </header>
  <PlanetView seed={daySeed(app.today, dev.seedOverride)} radius={30} sleeping label="The planet is asleep" />
  <div class="center">
    <Mascot mood="sleep" size={72} />
  </div>
  <h1 class="center">Mission complete.</h1>
  <p class="center label">Return tomorrow.</p>
  <p class="center count" aria-live="off">
    <span class="muted">Next mission in</span><br />
    <span class="label big" data-testid="countdown">{left}</span>
  </p>
  <div class="center">
    <button class="btn" onclick={() => app.open('stats')}><Icon name="book" /> Logbook</button>
  </div>
</section>

<style>
  .lock {
    gap: 8px;
  }
  h1 {
    color: var(--cyan-hi);
  }
  .count {
    margin: 0;
  }
  .big {
    font-size: 1.8rem;
    color: var(--accent-hi);
    letter-spacing: 0.08em;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
