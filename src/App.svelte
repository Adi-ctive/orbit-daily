<script lang="ts">
  import { onMount } from 'svelte'
  import { daySeed } from './engine/composer'
  import { dev } from './lib/dev'
  import { app } from './state/app.svelte'
  import Credits from './screens/Credits.svelte'
  import Crash from './screens/Crash.svelte'
  import Debrief from './screens/Debrief.svelte'
  import Home from './screens/Home.svelte'
  import Lock from './screens/Lock.svelte'
  import Session from './screens/Session.svelte'
  import Settings from './screens/Settings.svelte'
  import Stats from './screens/Stats.svelte'
  import DevPanel from './ui/DevPanel.svelte'
  import StarField from './ui/StarField.svelte'

  onMount(() => {
    const onErr = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = 'reason' in e ? String(e.reason) : e.message
      // Benign browser noise should not take the app down.
      if (/ResizeObserver loop/.test(msg)) return
      void app.flush()
      app.crashed = msg
    }
    addEventListener('error', onErr)
    addEventListener('unhandledrejection', onErr)
    void app.boot()
    return () => {
      removeEventListener('error', onErr)
      removeEventListener('unhandledrejection', onErr)
    }
  })
</script>

{#if app.today}
  {#key app.today}
    <StarField seed={daySeed(app.today, dev.seedOverride)} />
  {/key}
{/if}

<svelte:boundary
  onerror={(e) => {
    void app.flush()
    app.crashed = String(e)
  }}
>
  {#if app.crashed}
    <Crash message={app.crashed} />
  {:else if app.screen === 'boot'}
    <section class="screen" aria-busy="true"><p class="muted center" style="margin:auto">Loading…</p></section>
  {:else if app.screen === 'home'}
    <Home />
  {:else if app.screen === 'session'}
    <Session />
  {:else if app.screen === 'debrief'}
    <Debrief />
  {:else if app.screen === 'lock'}
    <Lock />
  {:else if app.screen === 'stats'}
    <Stats />
  {:else if app.screen === 'settings'}
    <Settings />
  {:else if app.screen === 'credits'}
    <Credits />
  {/if}

  {#snippet failed(error)}
    <Crash message={String(error)} />
  {/snippet}
</svelte:boundary>

{#if app.toast}
  <div class="toast panel" role="status">{app.toast}</div>
{/if}

{#if __DEV_PANEL__ && dev.enabled}
  <DevPanel onSkip={() => dispatchEvent(new CustomEvent('orbit:dev-skip'))} onUnlock={() => app.devUnlock()} />
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 50;
    font-size: 0.9rem;
  }
</style>
