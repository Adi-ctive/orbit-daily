<script lang="ts">
  import { audio } from '../audio/bus'
  import { streakLength } from '../engine/lock'
  import { CATEGORY_LABEL, catalogEntry, type Category } from '../games/catalog'
  import { haptic } from '../lib/haptics'
  import { copyShare, shareText } from '../lib/share'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import Mascot from '../ui/Mascot.svelte'

  const day = $derived(app.day)
  const streak = $derived(streakLength(app.profile, app.today))

  const skills = $derived.by(() => {
    const m: Record<string, number[]> = {}
    for (const r of day?.results ?? []) {
      const e = catalogEntry(r.gameId)
      const key = e ? CATEGORY_LABEL[e.category as Category] : r.phase === 'review' ? 'Review' : 'Star Chart'
      m[key] = [...(m[key] ?? []), r.score]
    }
    return Object.entries(m).map(([k, v]) => ({ k, s: v.reduce((a, b) => a + b, 0) / v.length }))
  })
  const avg = $derived(skills.length ? skills.reduce((a, b) => a + b.s, 0) / skills.length : 0)
  const stars = (s: number) => (s >= 0.9 ? 3 : s >= 0.6 ? 2 : s >= 0.3 ? 1 : 0)
  let copied = $state('')

  async function share() {
    if (!day) return
    haptic('tap')
    const r = await copyShare(shareText(day, streak))
    copied = r === 'copied' ? 'Copied to clipboard.' : r === 'shared' ? 'Shared.' : 'Could not copy. Long-press to select.'
  }

  async function done() {
    haptic('lock')
    audio.sfx('lock')
    await app.finishDebrief()
  }

  $effect(() => {
    audio.scene('results')
    audio.sfx('levelup')
  })
</script>

<section class="screen debrief">
  <h1 class="center">Mission debrief</h1>
  <div class="center">
    <Mascot mood={avg >= 0.6 ? 'cheer' : 'idle'} size={96} />
  </div>
  {#if day?.capped}
    <p class="center muted">Time cap reached, so the mission ended after that round.</p>
  {/if}
  <ul class="panel skills" aria-label="Results by skill">
    {#each skills as s (s.k)}
      <li>
        <span class="label">{s.k}</span>
        <span class="stars" aria-label="{stars(s.s)} of 3 stars">{'★'.repeat(stars(s.s))}<span class="off">{'★'.repeat(3 - stars(s.s))}</span></span>
      </li>
    {/each}
  </ul>
  <p class="center label streak">Streak: {streak} day{streak === 1 ? '' : 's'}{app.profile.freezes ? ` · ${app.profile.freezes} freeze${app.profile.freezes > 1 ? 's' : ''}` : ''}</p>
  <div class="center actions">
    <button class="btn" onclick={share} data-testid="share"><Icon name="share" /> Share result</button>
    <button class="btn primary" onclick={done} data-testid="debrief-done">Finish mission</button>
  </div>
  <p class="center muted" aria-live="polite">{copied}</p>
</section>

<style>
  .debrief {
    gap: 10px;
  }
  .skills {
    list-style: none;
    margin: 4px;
    display: grid;
    gap: 6px;
  }
  .skills li {
    display: flex;
    justify-content: space-between;
  }
  .stars {
    color: var(--accent-hi);
    letter-spacing: 2px;
  }
  .off {
    color: var(--edge);
  }
  .streak {
    color: var(--accent-hi);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .actions .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
