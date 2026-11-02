<script lang="ts">
  import { appClock, localDateISO } from '../lib/clock'
  import { dev, setDevDate } from '../lib/dev'

  interface Props {
    onSkip?: () => void
    onUnlock?: () => void
  }
  let { onSkip, onUnlock }: Props = $props()

  let open = $state(false)
  let date = $state(localDateISO(appClock.now()))
  let seed = $state(dev.seedOverride ?? '')

  function apply() {
    setDevDate(date)
    dev.seedOverride = seed.trim() || null
    location.reload()
  }
</script>

<div class="dev">
  <button type="button" aria-label="Toggle dev panel" onclick={() => (open = !open)}>DEV</button>
  {#if open}
    <div class="panel" data-testid="dev-panel">
      <label>Date <input type="date" bind:value={date} /></label>
      <label>Seed <input bind:value={seed} placeholder="default" /></label>
      <button type="button" onclick={apply}>Apply + reload</button>
      <button type="button" data-testid="dev-skip" onclick={() => onSkip?.()}>Skip round</button>
      <button type="button" data-testid="dev-unlock" onclick={() => onUnlock?.()}>Unlock today</button>
    </div>
  {/if}
</div>

<style>
  .dev {
    position: fixed;
    right: 4px;
    bottom: calc(4px + env(safe-area-inset-bottom));
    z-index: 1000;
    font: 12px monospace;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #1a1240;
    border: 2px solid #f5b44a;
    padding: 8px;
    color: #fff;
  }
  button {
    font: inherit;
    background: #2c1e66;
    color: #fff;
    border: 1px solid #f5b44a;
    padding: 4px 8px;
  }
</style>
