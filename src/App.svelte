<script lang="ts">
  import { TAGLINE } from './config'
  import { appClock, localDateISO } from './lib/clock'
  import { dev } from './lib/dev'
  import DevPanel from './ui/DevPanel.svelte'

  const today = localDateISO(appClock.now())
</script>

<main>
  <h1>ORBIT</h1>
  <p>{TAGLINE}</p>
  <p class="date">{today}</p>
</main>

{#if __DEV_PANEL__ && dev.enabled}
  <DevPanel />
{/if}

<style>
  main {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    text-align: center;
    padding: 16px;
  }
  .date {
    opacity: 0.6;
  }
</style>
