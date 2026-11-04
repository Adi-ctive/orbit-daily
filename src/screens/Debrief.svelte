<script lang="ts">
  import { audio } from '../audio/bus'
  import { streakLength } from '../engine/lock'
  import { CATEGORY_LABEL, catalogEntry, type Category } from '../games/catalog'
  import { haptic } from '../lib/haptics'
  import { copyShare, shareText } from '../lib/share'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'

  const day = $derived(app.day)
  const streak = $derived(streakLength(app.profile, app.today))

  const skills = $derived.by(() => {
    const m: Record<string, number[]> = {}
    for (const r of day?.results ?? []) {
      if (r.category === 'explainer') continue
      const key = CATEGORY_LABEL[r.category as Category]
      m[key] = [...(m[key] ?? []), r.score]
    }
    return Object.entries(m).map(([k, v]) => ({ k, s: v.reduce((a, b) => a + b, 0) / v.length }))
  })
  const avg = $derived(skills.length ? skills.reduce((a, b) => a + b.s, 0) / skills.length : 0)
  const read = $derived(day?.results.find((r) => r.phase === 'explainer'))
  // Where points were lost, weakest first. The weakest returns tomorrow as a rematch.
  const lost = $derived(
    (day?.results ?? [])
      .filter((r) => r.score < 0.7 && (catalogEntry(r.gameId) || r.gameId === 'aptitude'))
      .sort((a, b) => a.score - b.score)
      .map((r) => ({ title: catalogEntry(r.gameId)?.title ?? 'Aptitude Sprint', s: r.score, game: catalogEntry(r.gameId) ? r.gameId : '' })),
  )
  const rounds = $derived((day?.results ?? []).filter((r) => r.phase !== 'explainer').length)
  let copied = $state('')

  async function share() {
    if (!day) return
    haptic('tap')
    const r = await copyShare(shareText(day, streak))
    copied = r === 'copied' ? 'Copied to clipboard.' : r === 'shared' ? 'Shared.' : 'Could not copy.'
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
  <header class="topbar"><span class="label">Debrief</span></header>
  <div class="head">
    <p class="big">{Math.round(avg * 100)}<span>%</span></p>
    <p class="muted">{day?.capped ? 'Time cap reached, so the mission ended after that round.' : 'Mission complete.'}</p>
  </div>
  <ul class="panel skills" aria-label="Results by skill">
    {#each skills as s (s.k)}
      <li>
        <span>{s.k}</span>
        <span class="bar"><span style:width="{Math.round(s.s * 100)}%" class:good={s.s >= 0.6}></span></span>
        <span class="num">{Math.round(s.s * 100)}%</span>
      </li>
    {/each}
  </ul>
  {#if lost.length}
    <div class="panel lost">
      <p class="label">Where you lost points</p>
      {#each lost as l, i (i)}
        <p class="row"><span>{l.title}</span><span class="num">{Math.round(l.s * 100)}%</span></p>
      {/each}
      {#if lost.find((l) => l.game)}<p class="muted small">{lost.find((l) => l.game)!.title} comes back tomorrow as a rematch with a new level.</p>{/if}
    </div>
  {/if}
  <p class="muted center">{rounds} rounds played{read ? ' · explainer saved to your logbook' : ''}.</p>
  <p class="center streak"><Icon name="flame" size={18} /> {streak} day streak{app.profile.freezes ? ` · ${app.profile.freezes} freeze${app.profile.freezes > 1 ? 's' : ''}` : ''}</p>
  <div class="actions">
    <button class="btn" onclick={share} data-testid="share"><Icon name="share" size={18} /> Share</button>
    <button class="btn primary" onclick={done} data-testid="debrief-done">Finish</button>
  </div>
  <p class="center muted" aria-live="polite">{copied}</p>
</section>

<style>
  .debrief {
    gap: 16px;
  }
  .head {
    text-align: center;
  }
  .big {
    font-size: 4rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1;
    margin: 8px 0 6px;
    font-variant-numeric: tabular-nums;
  }
  .big span {
    font-size: 1.6rem;
  }
  .skills {
    list-style: none;
    margin: 0;
    display: grid;
    gap: 12px;
  }
  .skills li {
    display: grid;
    grid-template-columns: 6.5em 1fr 3em;
    align-items: center;
    gap: 12px;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--surface-hi);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--bad);
    border-radius: 3px;
  }
  .bar span.good {
    background: var(--accent);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .lost .row {
    display: flex;
    justify-content: space-between;
    margin: 6px 0 0;
  }
  .lost .small {
    font-size: 0.85rem;
    margin: 10px 0 0;
  }
  .streak {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    color: var(--warm);
    font-weight: 600;
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: auto;
  }
  .actions .btn {
    flex: 1;
    max-width: 200px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
</style>
