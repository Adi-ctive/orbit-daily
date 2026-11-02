<script lang="ts">
  // The streak drawn as a constellation that gains one star per day.
  import { onMount } from 'svelte'
  import { RAMPS } from '../art/palette'
  import { RNG } from '../lib/rng'

  interface Props {
    count: number
  }
  let { count }: Props = $props()
  const W = 120
  const H = 36
  let canvas: HTMLCanvasElement

  function draw() {
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    const r = new RNG('streak-constellation')
    const n = Math.min(count, 30)
    const pts: [number, number][] = []
    for (let i = 0; i < Math.max(n, 1); i++) {
      const x = 6 + ((i * 37) % 108) + r.int(-2, 2)
      const y = 6 + r.int(0, 24)
      pts.push([x, y])
    }
    // Lines between consecutive stars (Bresenham, dotted).
    ctx.fillStyle = RAMPS.indigo[2]
    for (let i = 1; i < n; i++) line(ctx, pts[i - 1], pts[i])
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[i]
      const last = i === n - 1
      ctx.fillStyle = last ? RAMPS.amber[4] : RAMPS.star[3]
      ctx.fillRect(x - 1, y, 3, 1)
      ctx.fillRect(x, y - 1, 1, 3)
      if (last) {
        ctx.fillStyle = RAMPS.amber[2]
        ctx.fillRect(x - 2, y, 1, 1)
        ctx.fillRect(x + 2, y, 1, 1)
        ctx.fillRect(x, y - 2, 1, 1)
        ctx.fillRect(x, y + 2, 1, 1)
      }
    }
    if (n === 0) {
      ctx.fillStyle = RAMPS.star[0]
      ctx.fillRect(pts[0][0], pts[0][1], 1, 1)
    }
  }

  function line(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number]) {
    let [x0, y0] = a
    const [x1, y1] = b
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let k = 0
    for (;;) {
      if (k++ % 2 === 0) ctx.fillRect(x0, y0, 1, 1)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  onMount(draw)
  $effect(() => {
    void count
    if (canvas) draw()
  })
</script>

<div class="wrap">
  <span role="img" aria-label="Streak constellation, {count} stars"><canvas bind:this={canvas} class="pixel-canvas" width={W} height={H} aria-hidden="true"></canvas></span>
  <span class="label">{count} day{count === 1 ? '' : 's'}</span>
</div>

<style>
  .wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  canvas {
    width: 240px;
    height: 72px;
    max-width: 60vw;
    height: auto;
    aspect-ratio: 120 / 36;
  }
  .label {
    color: var(--accent-hi);
  }
</style>
