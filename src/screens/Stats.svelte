<script lang="ts">
  import type { Explainer } from '../content/explainers'
  import { streakLength } from '../engine/lock'
  import { CATEGORIES, CATEGORY_LABEL } from '../games/catalog'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import Sparkline from '../ui/Sparkline.svelte'

  const history = $derived(app.profile.ratingHistory)
  const streak = $derived(streakLength(app.profile, app.today))
  let open = $state<Explainer | null>(null)

  async function show(id: string) {
    const { getExplainer } = await import('../content/explainers')
    open = getExplainer(id) ?? null
  }
</script>

<section class="screen stats">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back" onclick={() => app.close()}><Icon name="back" /></button>
    <h2>Logbook</h2>
    <span style="width:44px"></span>
  </header>

  <div class="summary">
    <div class="panel"><span class="label">Missions</span><b>{app.profile.completedDates.length}</b></div>
    <div class="panel"><span class="label">Streak</span><b>{streak}</b></div>
    <div class="panel"><span class="label">Read</span><b>{app.profile.logbook.length}</b></div>
  </div>

  <h3>Skill ratings</h3>
  <div class="charts">
    {#each CATEGORIES as c (c)}
      <Sparkline label={CATEGORY_LABEL[c]} values={history.length ? history.map((h) => h.ratings[c]) : [app.profile.ratings[c]]} />
    {/each}
  </div>

  <h3>Explainers you've read</h3>
  {#if app.profile.logbook.length === 0}
    <p class="muted">Each mission ends with one explainer. They collect here so you can reread them.</p>
  {/if}
  <ul class="list">
    {#each [...app.profile.logbook].reverse() as l (l.id)}
      <li>
        <button class="row" onclick={() => show(l.id)}>
          <span class="label">{l.category}</span>
          <span class="t">{l.title}</span>
        </button>
      </li>
    {/each}
  </ul>

  {#if open}
    <div class="reader" role="dialog" aria-label={open.title}>
      <div class="panel inner">
        <p class="label">{open.category}</p>
        <h2>{open.title}</h2>
        {#each open.paras as p, i (i)}<p>{p}</p>{/each}
        <p class="take">{open.takeaway}</p>
        <button class="btn" onclick={() => (open = null)}>Close</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .stats {
    gap: 12px;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .summary .panel {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }
  .summary b {
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
  }
  h3 {
    margin: 10px 0 0;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .row {
    width: 100%;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .t {
    font-weight: 500;
  }
  .reader {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgb(4 6 12 / 0.7);
    display: grid;
    place-items: end center;
    padding: 12px;
  }
  .inner {
    max-width: 600px;
    width: 100%;
    max-height: 85dvh;
    overflow: auto;
    background: #0b1020;
    user-select: text;
    line-height: 1.65;
  }
  .take {
    border-left: 2px solid var(--accent);
    padding-left: 12px;
    font-weight: 500;
  }
</style>
