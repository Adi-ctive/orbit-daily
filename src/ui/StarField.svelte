<script lang="ts">
  // A calm, static deep-space backdrop: soft gradient, fine stars, a faint
  // galactic band. Drawn once per resize at full resolution.
  import { onMount } from 'svelte'
  import { RNG } from '../lib/rng'

  interface Props {
    seed: string
  }
  let { seed }: Props = $props()
  let canvas: HTMLCanvasElement

  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = innerWidth
    const h = innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const g = canvas.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const bg = g.createRadialGradient(w * 0.5, -h * 0.1, 0, w * 0.5, h * 0.4, Math.max(w, h))
    bg.addColorStop(0, '#0d1630')
    bg.addColorStop(0.55, '#060a16')
    bg.addColorStop(1, '#03040a')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    const r = new RNG(seed + '/starfield')
    // Faint galactic band along a diagonal.
    const band = (x: number, y: number) => {
      const d = Math.abs((y - h * 0.15) - (x * 0.55)) / (h * 0.22)
      return Math.exp(-d * d)
    }
    const n = Math.round((w * h) / 2600)
    for (let i = 0; i < n; i++) {
      const x = r.float() * w
      const y = r.float() * h
      const inBand = band(x, y)
      if (r.float() > 0.35 + inBand * 0.65) continue
      const big = r.float() < 0.03
      const rad = big ? r.range(0.9, 1.4) : r.range(0.25, 0.75)
      const a = big ? r.range(0.7, 1) : r.range(0.2, 0.7)
      const tint = r.float()
      g.fillStyle = tint < 0.15 ? `rgba(255,214,170,${a})` : tint < 0.35 ? `rgba(180,205,255,${a})` : `rgba(255,255,255,${a})`
      g.beginPath()
      g.arc(x, y, rad, 0, Math.PI * 2)
      g.fill()
      if (big) {
        const glow = g.createRadialGradient(x, y, 0, x, y, rad * 6)
        glow.addColorStop(0, `rgba(190,210,255,${a * 0.25})`)
        glow.addColorStop(1, 'rgba(190,210,255,0)')
        g.fillStyle = glow
        g.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12)
      }
    }
    // Dust glow in the band.
    const dust = g.createLinearGradient(0, h * 0.15, w, h * 0.15 + w * 0.55)
    dust.addColorStop(0, 'rgba(120,140,200,0)')
    dust.addColorStop(0.5, 'rgba(120,140,200,0.05)')
    dust.addColorStop(1, 'rgba(120,140,200,0)')
    g.fillStyle = dust
    g.fillRect(0, 0, w, h)
  }

  onMount(() => {
    draw()
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(draw, 120)
    }
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  })
</script>

<canvas bind:this={canvas} class="stars" aria-hidden="true"></canvas>

<style>
  .stars {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none;
  }
</style>
