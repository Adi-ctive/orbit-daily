<script lang="ts">
  import { audio } from '../audio/bus'
  import { haptic } from '../lib/haptics'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'

  const s = $derived(app.profile.settings)
  let confirmReset = $state(false)

  function toggle(key: 'music' | 'sfx' | 'haptics' | 'highContrast') {
    audio.unlock()
    void app.updateSettings({ [key]: !s[key] })
    audio.sfx('tap')
    if (key === 'haptics' && !s.haptics) haptic('tap')
  }
</script>

<section class="screen settings">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back" onclick={() => app.close()}><Icon name="back" /></button>
    <h1>Settings</h1>
    <span></span>
  </header>

  <div class="panel rows">
    <div class="row">
      <span class="label">Music</span>
      <button class="btn" role="switch" aria-checked={s.music} aria-label="Music" onclick={() => toggle('music')}>{s.music ? 'On' : 'Off'}</button>
    </div>
    <label class="row">
      <span class="label">Music volume</span>
      <input type="range" min="0" max="1" step="0.05" value={s.musicVolume} oninput={(e) => app.updateSettings({ musicVolume: Number(e.currentTarget.value) })} />
    </label>
    <div class="row">
      <span class="label">Sound effects</span>
      <button class="btn" role="switch" aria-checked={s.sfx} aria-label="Sound effects" onclick={() => toggle('sfx')}>{s.sfx ? 'On' : 'Off'}</button>
    </div>
    <label class="row">
      <span class="label">Effects volume</span>
      <input type="range" min="0" max="1" step="0.05" value={s.sfxVolume} oninput={(e) => app.updateSettings({ sfxVolume: Number(e.currentTarget.value) })} />
    </label>
    <div class="row">
      <span class="label">Haptics</span>
      <button class="btn" role="switch" aria-checked={s.haptics} aria-label="Haptics" onclick={() => toggle('haptics')}>{s.haptics ? 'On' : 'Off'}</button>
    </div>
    <label class="row">
      <span class="label">Reduced motion</span>
      <select value={s.reducedMotion} onchange={(e) => app.updateSettings({ reducedMotion: e.currentTarget.value as 'system' | 'on' | 'off' })}>
        <option value="system">Follow device</option>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    </label>
    <div class="row">
      <span class="label">High contrast</span>
      <button class="btn" role="switch" aria-checked={s.highContrast} aria-label="High contrast" onclick={() => toggle('highContrast')}>{s.highContrast ? 'On' : 'Off'}</button>
    </div>
    <label class="row">
      <span class="label">Text size</span>
      <select value={String(s.textScale)} onchange={(e) => app.updateSettings({ textScale: Number(e.currentTarget.value) })}>
        <option value="0.9">Small</option>
        <option value="1">Normal</option>
        <option value="1.15">Large</option>
        <option value="1.3">Extra large</option>
      </select>
    </label>
  </div>

  <div class="panel rows">
    <button class="btn" onclick={() => app.open('credits')}>Credits and licences</button>
    {#if !confirmReset}
      <button class="btn" onclick={() => (confirmReset = true)}>Reset all data…</button>
    {:else}
      <p>This deletes your streak, ratings, logbook and today's progress. It cannot be undone.</p>
      <div class="row">
        <button class="btn" onclick={() => (confirmReset = false)}>Cancel</button>
        <button class="btn danger" onclick={() => app.resetAll()}>Delete everything</button>
      </div>
    {/if}
  </div>
  <p class="muted small center">ORBIT is a daily challenge for focus and curiosity. It makes no claims about improving memory, IQ or health.</p>
</section>

<style>
  .settings {
    gap: 10px;
  }
  .rows {
    display: grid;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 48px;
  }
  select,
  input[type='range'] {
    min-height: 40px;
    background: var(--surface-hi);
    border: 1px solid var(--border-hi);
    border-radius: 10px;
    padding: 0 8px;
    accent-color: var(--accent);
    max-width: 55%;
  }
  .danger {
    background: rgb(255 122 107 / 0.25);
    border-color: var(--bad);
  }
  .small {
    font-size: 0.85rem;
  }
</style>
