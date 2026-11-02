<script lang="ts">
  // Session progress as an orbit path: one node per round, a ship at the current one.
  import { RAMPS } from '../art/palette'

  interface Props {
    total: number
    index: number
  }
  let { total, index }: Props = $props()
  const W = 160
  const H = 22
  let canvas: HTMLCanvasElement

  $effect(() => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    const cx = W / 2
    const cy = H / 2
    const rx = W / 2 - 6
    const ry = H / 2 - 4
    // Dotted ellipse path.
    for (let a = 0; a < 360; a += 4) {
      const t = (a * Math.PI) / 180
      ctx.fillStyle = RAMPS.indigo[1]
      ctx.fillRect(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1)
    }
    const pos = (i: number) => {
      // Nodes go along the front (lower) arc, left to right.
      const t = Math.PI - (i / Math.max(1, total - 1)) * Math.PI
      return [Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry)]
    }
    for (let i = 0; i < total; i++) {
      const [x, y] = pos(i)
      ctx.fillStyle = i < index ? RAMPS.amber[3] : RAMPS.star[0]
      ctx.fillRect(x - 1, y - 1, 3, 3)
      if (i < index) {
        ctx.fillStyle = RAMPS.amber[5]
        ctx.fillRect(x, y, 1, 1)
      }
    }
    if (index < total) {
      const [x, y] = pos(index)
      ctx.fillStyle = RAMPS.cyan[1]
      ctx.fillRect(x - 2, y - 1, 5, 3)
      ctx.fillRect(x - 1, y - 2, 3, 5)
      ctx.fillStyle = RAMPS.star[4]
      ctx.fillRect(x, y, 1, 1)
    }
  })
</script>

<div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index} aria-label="Mission progress">
  <canvas
    bind:this={canvas}
    class="pixel-canvas"
    width={W}
    height={H}
    style="width: 320px; max-width: 62vw; height: auto; aspect-ratio: 160 / 22"
    aria-hidden="true"
  ></canvas>
</div>
