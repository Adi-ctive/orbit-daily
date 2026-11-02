<script lang="ts">
  import { onMount } from 'svelte'
  import { RAMPS } from '../art/palette'
  import { ensureItem } from '../content/loader'
  import type { ContentItem } from '../content/types'
  import { streakLength } from '../engine/lock'
  import { CATEGORIES, CATEGORY_LABEL } from '../games/catalog'
  import { RNG } from '../lib/rng'
  import { app } from '../state/app.svelte'
  import Icon from '../ui/Icon.svelte'
  import PixelChart from '../ui/PixelChart.svelte'

  const COLORS = [RAMPS.cyan[0], RAMPS.amber[3], RAMPS.magenta[3], RAMPS.green[3], RAMPS.violet[4], RAMPS.teal[4], RAMPS.lava[3]]
  const history = $derived(app.profile.ratingHistory)
  const streak = $derived(streakLength(app.profile, app.today))
  let open = $state<ContentItem | null>(null)
  let mapCanvas: HTMLCanvasElement
  const MW = 160
  const MH = 90

  const catList = $derived([...new Set(app.profile.logbook.map((l) => l.category))].sort())

  function starPos(id: string, cat: string): [number, number] {
    const i = Math.max(0, catList.indexOf(cat))
    const n = Math.max(1, catList.length)
    const cx = ((i + 0.5) / n) * MW
    const r = new RNG(id)
    return [Math.round(cx + r.range(-MW / n / 2.5, MW / n / 2.5)), Math.round(r.range(10, MH - 10))]
  }

  function drawMap() {
    if (!mapCanvas) return
    const ctx = mapCanvas.getContext('2d')!
    ctx.fillStyle = RAMPS.void[1]
    ctx.fillRect(0, 0, MW, MH)
    const bg = new RNG('logbook-sky')
    ctx.fillStyle = RAMPS.void[3]
    for (let i = 0; i < 120; i++) ctx.fillRect(bg.int(0, MW), bg.int(0, MH), 1, 1)
    for (const l of app.profile.logbook) {
      const [x, y] = starPos(l.id, l.category)
      ctx.fillStyle = COLORS[catList.indexOf(l.category) % COLORS.length]
      ctx.fillRect(x - 1, y, 3, 1)
      ctx.fillRect(x, y - 1, 1, 3)
      ctx.fillStyle = RAMPS.star[4]
      ctx.fillRect(x, y, 1, 1)
    }
  }

  onMount(drawMap)

  async function show(id: string) {
    open = (await ensureItem(id)) ?? null
  }
</script>

<section class="screen stats">
  <header class="topbar">
    <button class="btn ghost icon-btn" aria-label="Back" onclick={() => app.close()}><Icon name="back" /></button>
    <h1>Logbook</h1>
    <span></span>
  </header>

  <div class="panel summary">
    <span class="label">Missions: {app.profile.completedDates.length}</span>
    <span class="label">Streak: {streak}</span>
    <span class="label">Cards: {app.profile.logbook.length}</span>
  </div>

  <h2>Skill ratings</h2>
  <div class="charts">
    {#each CATEGORIES as c, i (c)}
      <PixelChart label={CATEGORY_LABEL[c]} values={[...history.map((h) => h.ratings[c]), ...(history.length ? [] : [app.profile.ratings[c]])]} color={COLORS[i]} />
    {/each}
  </div>

  <h2>Star map</h2>
  <div role="img" aria-label="Star map of {app.profile.logbook.length} learned cards"><canvas bind:this={mapCanvas} class="pixel-canvas map" width={MW} height={MH} aria-hidden="true"></canvas></div>
  {#if app.profile.logbook.length === 0}
    <p class="muted">Cards you learn in Star Chart rounds appear here as stars.</p>
  {/if}
  <ul class="cards">
    {#each [...app.profile.logbook].reverse() as l (l.id)}
      <li><button class="btn ghost card-btn" onclick={() => show(l.id)}><span class="label">{l.date}</span> {l.title}</button></li>
    {/each}
  </ul>

  {#if open}
    <div class="panel reader" role="dialog" aria-label={open.title}>
      <h3>{open.title}</h3>
      <p>{open.body}</p>
      <p class="muted small">
        Source: <a href={open.source.url} target="_blank" rel="noopener">{open.source.name}: {open.title}</a> ({open.license})
      </p>
      <button class="btn" onclick={() => (open = null)}>Close</button>
    </div>
  {/if}
</section>

<style>
  .stats {
    gap: 8px;
  }
  .summary {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 6px;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .map {
    width: 100%;
    height: auto;
    aspect-ratio: 160 / 90;
  }
  .cards {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .card-btn {
    text-align: left;
    width: 100%;
    color: var(--ink);
    font-family: var(--body-font);
  }
  .reader {
    position: fixed;
    inset: auto 8px calc(8px + env(safe-area-inset-bottom)) 8px;
    max-height: 70dvh;
    overflow: auto;
    z-index: 20;
    user-select: text;
  }
  .small {
    font-size: 0.85rem;
  }
  a {
    color: var(--cyan-hi);
  }
</style>
