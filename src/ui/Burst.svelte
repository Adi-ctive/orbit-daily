<script lang="ts">
  // A pooled pixel-particle burst. Re-fires whenever `trigger` changes.
  import { onMount } from 'svelte'
  import { RAMPS } from '../art/palette'
  import { RNG } from '../lib/rng'
  import { app } from '../state/app.svelte'

  interface Props {
    trigger: number
  }
  let { trigger }: Props = $props()

  const W = 96
  const H = 96
  const N = 48
  const COLORS = [RAMPS.amber[5], RAMPS.amber[4], RAMPS.cyan[1], RAMPS.magenta[4], RAMPS.star[4]]
  // Fixed pool, reused every burst: no allocation while animating.
  const px = new Float32Array(N)
  const py = new Float32Array(N)
  const vx = new Float32Array(N)
  const vy = new Float32Array(N)
  const life = new Float32Array(N)
  const col = new Uint8Array(N)
  let canvas: HTMLCanvasElement
  let raf = 0
  let rng = new RNG('burst')

  function fire() {
    if (app.reducedMotion || !canvas) return
    rng = rng.fork(String(trigger))
    for (let i = 0; i < N; i++) {
      const a = rng.range(0, Math.PI * 2)
      const s = rng.range(25, 70)
      px[i] = W / 2
      py[i] = H / 2
      vx[i] = Math.cos(a) * s
      vy[i] = Math.sin(a) * s - 20
      life[i] = rng.range(0.5, 0.9)
      col[i] = rng.int(0, COLORS.length - 1)
    }
    cancelAnimationFrame(raf)
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const g = canvas.getContext('2d')!
      g.clearRect(0, 0, W, H)
      let alive = 0
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue
        alive++
        life[i] -= dt
        vy[i] += 60 * dt
        px[i] += vx[i] * dt
        py[i] += vy[i] * dt
        g.fillStyle = COLORS[col[i]]
        const sz = life[i] > 0.4 ? 2 : 1
        g.fillRect(Math.round(px[i]), Math.round(py[i]), sz, sz)
      }
      if (alive) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  let seen = 0
  $effect(() => {
    if (trigger !== seen) {
      seen = trigger
      fire()
    }
  })
  onMount(() => () => cancelAnimationFrame(raf))
</script>

<canvas bind:this={canvas} class="pixel-canvas burst" width={W} height={H} aria-hidden="true"></canvas>

<style>
  .burst {
    position: fixed;
    left: 50%;
    top: 34%;
    width: 288px;
    height: 288px;
    margin-left: -144px;
    margin-top: -144px;
    pointer-events: none;
    z-index: 30;
  }
</style>
