<script lang="ts">
  import { onMount } from 'svelte'
  import { PixelCanvas } from '../art/pixelCanvas'
  import { Sky } from '../art/sky'
  import { Loop } from '../games/kit'
  import { app } from '../state/app.svelte'

  interface Props {
    seed: string
  }
  let { seed }: Props = $props()

  let host: HTMLDivElement
  let sky: Sky | null = null
  let warpT = 0

  onMount(() => {
    const pc = new PixelCanvas(host, {
      minW: 320,
      minH: 480,
      onResize: (w, h) => sky?.resize(w, h),
    })
    sky = new Sky(seed, pc.w, pc.h)
    let drawnStatic = false
    const loop = new Loop((dt, t) => {
      if (!sky) return
      if (document.visibilityState !== 'visible') return
      if (app.reducedMotion) {
        if (!drawnStatic) {
          sky.warp = 0
          sky.draw(pc.ctx, 0, true)
          drawnStatic = true
        }
        return
      }
      drawnStatic = false
      if (warpT > 0) {
        warpT = Math.max(0, warpT - dt)
        const p = 1 - warpT / 0.9
        sky.warp = Math.sin(p * Math.PI)
      } else sky.warp = 0
      sky.update(dt)
      sky.draw(pc.ctx, t)
    })
    return () => {
      loop.stop()
      pc.destroy()
    }
  })

  let lastPulse = 0
  $effect(() => {
    const p = app.warpPulse
    if (p !== lastPulse) {
      lastPulse = p
      warpT = 0.9
    }
  })
</script>

<div class="sky" bind:this={host} aria-hidden="true"></div>

<style>
  .sky {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: grid;
    place-items: center;
    background: var(--bg);
    overflow: hidden;
  }
</style>
