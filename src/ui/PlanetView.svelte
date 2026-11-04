<script lang="ts">
  import { onMount } from 'svelte'
  import { createPlanet, drawFallbackPlanet, lookFromSeed } from '../art/planetGL'
  import { app } from '../state/app.svelte'

  interface Props {
    seed: string
    size?: number
    sleeping?: boolean
    label?: string
  }
  let { seed, size = 240, sleeping = false, label = "Today's planet" }: Props = $props()

  let canvas: HTMLCanvasElement

  onMount(() => {
    const look = lookFromSeed(seed)
    let p: Awaited<ReturnType<typeof createPlanet>> = null
    let gone = false
    let raf = 0
    let last = 0
    let ro: ResizeObserver | null = null
    const t0 = performance.now()
    // The planet turns slowly, so about 20 redraws a second is plenty and saves battery.
    const frame = (now: number) => {
      if (p && now - last > 48 && document.visibilityState === 'visible') {
        last = now
        p.draw((now - t0) / 1000 + 4)
      }
      raf = requestAnimationFrame(frame)
    }
    // Build the shader after first paint, so it never delays the page appearing.
    const startT = window.setTimeout(async () => {
      p = await createPlanet(canvas, look, sleeping ? 1 : 0)
      if (gone) {
        p?.destroy()
        return
      }
      if (!p) {
        drawFallbackPlanet(canvas, look)
        return
      }
      p.draw(4)
      ro = new ResizeObserver(() => {
        p?.resize()
        p?.draw(4)
      })
      ro.observe(canvas)
      if (!app.reducedMotion) raf = requestAnimationFrame(frame)
    }, 600)
    return () => {
      gone = true
      clearTimeout(startT)
      cancelAnimationFrame(raf)
      ro?.disconnect()
      p?.destroy()
    }
  })
</script>

<div class="planet" role="img" aria-label={label}>
  <canvas bind:this={canvas} style:width="min({size}px, 64vw)" style:height="min({size}px, 64vw)" aria-hidden="true"></canvas>
</div>

<style>
  .planet {
    display: grid;
    place-items: center;
    padding: 8px 0;
  }
</style>
