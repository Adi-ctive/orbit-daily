<script lang="ts">
  import { onMount } from 'svelte'
  import { planetAsync } from '../art/artClient'
  import { drawPlanetFrame, planetSheetSize, planetSpecFromSeed, renderMoon, type PlanetSprite } from '../art/planet'
  import { PixelCanvas } from '../art/pixelCanvas'
  import { Loop } from '../games/kit'
  import { RNG } from '../lib/rng'
  import { app } from '../state/app.svelte'

  interface Props {
    seed: string
    radius?: number
    sleeping?: boolean
    label?: string
  }
  let { seed, radius = 34, sleeping = false, label = "Today's planet" }: Props = $props()

  let host: HTMLDivElement

  onMount(() => {
    const spec = planetSpecFromSeed(seed, radius)
    let sprite: PlanetSprite | null = null
    void planetAsync(spec, 48).then((s) => (sprite = s))
    const size = planetSheetSize(spec) + 40
    const pc = new PixelCanvas(host, { minW: size, minH: size, fixed: true })
    const moons = Array.from({ length: spec.moons }, (_, i) => {
      const r = new RNG(seed + '/moon' + i)
      return {
        img: renderMoon(seed + i, r.int(3, 5)),
        dist: radius + 10 + i * 9,
        speed: r.range(0.25, 0.5) * (i % 2 ? -1 : 1),
        phase: r.range(0, 6.28),
        tilt: r.range(0.25, 0.45),
      }
    })
    const c = size / 2
    const loop = new Loop((_dt, t) => {
      if (document.visibilityState !== 'visible') return
      const ctx = pc.ctx
      ctx.clearRect(0, 0, size, size)
      const tt = app.reducedMotion ? 0 : t
      const frame = (tt * (sleeping ? 2 : 5)) | 0
      // Moons behind the planet first.
      for (const m of moons) {
        const a = m.phase + tt * m.speed
        if (Math.sin(a) < 0) ctx.drawImage(m.img, Math.round(c + Math.cos(a) * m.dist - m.img.width / 2), Math.round(c + Math.sin(a) * m.dist * m.tilt - m.img.height / 2))
      }
      ctx.globalAlpha = sleeping ? 0.7 : 1
      if (sprite) drawPlanetFrame(ctx, sprite, frame, c, c)
      ctx.globalAlpha = 1
      for (const m of moons) {
        const a = m.phase + tt * m.speed
        if (Math.sin(a) >= 0) ctx.drawImage(m.img, Math.round(c + Math.cos(a) * m.dist - m.img.width / 2), Math.round(c + Math.sin(a) * m.dist * m.tilt - m.img.height / 2))
      }
    })
    return () => {
      loop.stop()
      pc.destroy()
    }
  })
</script>

<div class="planet" bind:this={host} role="img" aria-label={label}></div>

<style>
  .planet {
    width: 100%;
    height: clamp(180px, 34dvh, 320px);
    display: grid;
    place-items: center;
  }
</style>
