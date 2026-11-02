<script lang="ts">
  // Dev-only sprite sheet preview at /dev/sprites.
  import { onMount } from 'svelte'
  import { drawIllustration } from '../art/illustrations'
  import { PALETTE_HEX } from '../art/palette'
  import { drawPlanetFrame, planetSpecFromSeed, renderPlanet, type PlanetKind } from '../art/planet'
  import { renderNebula } from '../art/sky'
  import { ICONS, type IconName } from '../art/sprites/icons'
  import { mascotFrame, type Mood } from '../art/sprites/mascot'
  import { drawIndexed, drawStringSprite } from '../art/sprites/sprite'

  const moods: Mood[] = ['idle', 'blink', 'happy', 'sad', 'cheer', 'sleep']
  const kinds: PlanetKind[] = ['terran', 'gas', 'ice', 'lava', 'desert']
  const cats = ['astronomy', 'meteorology', 'earth', 'geography', 'physics', 'biology', 'math']
  let root: HTMLDivElement

  onMount(() => {
    const add = (title: string, c: HTMLCanvasElement, scale = 3) => {
      c.className = 'pixel-canvas'
      c.style.width = c.width * scale + 'px'
      c.style.height = c.height * scale + 'px'
      const fig = document.createElement('figure')
      fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: title }))
      // The preview grid is built imperatively on purpose; Svelte never renders into it.
      // eslint-disable-next-line svelte/no-dom-manipulating
      root.append(fig)
    }
    const mk = (w: number, h: number) => Object.assign(document.createElement('canvas'), { width: w, height: h })

    for (const n of Object.keys(ICONS) as IconName[]) {
      const c = mk(12, 12)
      drawStringSprite(c.getContext('2d')!, ICONS[n], 0, 0)
      add(n, c, 4)
    }
    for (const m of moods)
      for (const f of [0, 1]) {
        const c = mk(48, 48)
        drawIndexed(c.getContext('2d')!, mascotFrame(m, f), 0, 0)
        add(`pip ${m} ${f}`, c, 3)
      }
    for (let i = 0; i < 12; i++) {
      let spec = planetSpecFromSeed('preview' + i, 40)
      spec = { ...spec, kind: kinds[i % kinds.length] }
      const p = renderPlanet(spec, 1)
      const c = mk(p.size, p.size)
      drawPlanetFrame(c.getContext('2d')!, p, 0, p.size / 2, p.size / 2)
      add(`${spec.kind}${spec.ring ? ' ring' : ''}`, c, 2)
    }
    add('nebula', renderNebula('preview', 180, 120), 2)
    for (const cat of cats) {
      const c = mk(120, 64)
      drawIllustration(c.getContext('2d')!, cat, 'prev-' + cat, 120, 64)
      add(cat, c, 2)
    }
  })
</script>

<main>
  <h1>Sprites</h1>
  <div class="pal">
    {#each PALETTE_HEX as c (c)}<span style:background={c} title={c}></span>{/each}
  </div>
  <div class="grid" bind:this={root}></div>
</main>

<style>
  main {
    padding: 16px;
    background: #0b0820;
    min-height: 100vh;
    user-select: text;
  }
  .pal {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .pal span {
    width: 24px;
    height: 24px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
  }
  .grid :global(figure) {
    margin: 0;
    font: 11px monospace;
    color: #a99fc4;
  }
</style>
