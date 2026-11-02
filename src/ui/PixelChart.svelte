<script lang="ts">
  // A small pixel line chart for one skill rating over time.
  import { RAMPS } from '../art/palette'
  import { drawText } from '../art/pixelFont'

  interface Props {
    values: number[]
    label: string
    color?: string
  }
  let { values, label, color = RAMPS.cyan[0] }: Props = $props()
  const W = 120
  const H = 40
  let canvas: HTMLCanvasElement

  $effect(() => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = RAMPS.void[2]
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = RAMPS.void[3]
    for (let y = 8; y < H; y += 8) for (let x = 0; x < W; x += 2) ctx.fillRect(x, y, 1, 1)
    const v = values.slice(-W + 4)
    if (v.length) {
      const lo = Math.min(...v) - 20
      const hi = Math.max(...v) + 20
      const step = v.length > 1 ? (W - 4) / (v.length - 1) : 0
      let prev: [number, number] | null = null
      ctx.fillStyle = color
      for (let i = 0; i < v.length; i++) {
        const val = v[i]
        const x = Math.round(2 + i * step)
        const y = Math.round(H - 3 - ((val - lo) / (hi - lo)) * (H - 12))
        if (prev) {
          const [px, py] = prev
          const n = Math.max(Math.abs(x - px), Math.abs(y - py), 1)
          for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(px + ((x - px) * k) / n), Math.round(py + ((y - py) * k) / n), 1, 1)
        }
        prev = [x, y]
      }
      if (prev) {
        const [lx, ly] = prev
        ctx.fillStyle = RAMPS.amber[4]
        ctx.fillRect(lx - 1, ly - 1, 3, 3)
      }
    }
    drawText(ctx, label, 2, 2, RAMPS.star[2])
    if (values.length) drawText(ctx, String(values[values.length - 1]), W - 2, 2, RAMPS.amber[4], 1, 'right')
  })
</script>

<div role="img" aria-label="{label} rating {values.at(-1) ?? 'no data'}">
  <canvas bind:this={canvas} class="pixel-canvas" width={W} height={H} style="width: 100%; height: auto; aspect-ratio: 120 / 40" aria-hidden="true"></canvas>
</div>
