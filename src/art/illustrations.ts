// Procedural pixel illustrations for Star Chart cards, matched to the topic.
import { RNG } from '../lib/rng'
import { Noise3 } from './noise'
import { RAMP_RGB, bayer, rgbCss, type RGB } from './palette'
import { drawPlanetFrame, planetSpecFromSeed, renderPlanet } from './planet'

type Ctx = CanvasRenderingContext2D

function px(ctx: Ctx, x: number, y: number, c: RGB): void {
  ctx.fillStyle = rgbCss(c)
  ctx.fillRect(x, y, 1, 1)
}

function sky(ctx: Ctx, w: number, h: number, top: RGB[], rng: RNG): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (y / h) * (top.length - 1)
      let i = Math.floor(v)
      if (v - i > bayer(x, y)) i++
      px(ctx, x, y, top[Math.min(top.length - 1, i)])
    }
  for (let i = 0; i < 18; i++) px(ctx, rng.int(0, w - 1), rng.int(0, Math.floor(h * 0.5)), RAMP_RGB.star[2])
}

function clouds(ctx: Ctx, w: number, h: number, rng: RNG): void {
  sky(ctx, w, h, [RAMP_RGB.indigo[2], RAMP_RGB.indigo[3], RAMP_RGB.indigo[4], RAMP_RGB.cyan[1]], rng)
  const n = new Noise3(rng)
  const tones = [RAMP_RGB.star[0], RAMP_RGB.star[1], RAMP_RGB.star[2], RAMP_RGB.star[3], RAMP_RGB.star[4]]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const base = 0.62 - Math.abs(y / h - 0.45) * 1.1
      const v = n.fbm(x / 22, y / 12, 3, 4) + base - 0.5
      if (v < 0.45) continue
      const lit = Math.min(0.999, (v - 0.45) * 3 + (1 - y / h) * 0.3)
      const f = lit * (tones.length - 1)
      let i = Math.floor(f)
      if (f - i > bayer(x, y)) i++
      px(ctx, x, y, tones[Math.min(tones.length - 1, i)])
    }
}

function strata(ctx: Ctx, w: number, h: number, rng: RNG): void {
  sky(ctx, w, h, [RAMP_RGB.void[2], RAMP_RGB.violet[1], RAMP_RGB.magenta[2], RAMP_RGB.amber[3]], rng)
  const n = new Noise3(rng)
  const layers = [RAMP_RGB.amber[2], RAMP_RGB.earth[1], RAMP_RGB.amber[1], RAMP_RGB.earth[0], RAMP_RGB.lava[1], RAMP_RGB.amber[0]]
  for (let x = 0; x < w; x++) {
    const top = Math.floor(h * 0.35 + n.fbm(x / 30, 1, 1, 3) * h * 0.25)
    for (let y = top; y < h; y++) {
      const warp = n.fbm(x / 40, y / 40, 5, 2) * 10
      const band = Math.floor((y + warp) / 7) % layers.length
      const c = layers[band]
      const edgeLit = y - top < 2
      px(ctx, x, y, edgeLit ? RAMP_RGB.amber[4] : bayer(x, y) < 0.12 ? RAMP_RGB.void[2] : c)
    }
  }
}

function island(ctx: Ctx, w: number, h: number, rng: RNG): void {
  const n = new Noise3(rng)
  const sea = [RAMP_RGB.indigo[0], RAMP_RGB.indigo[1], RAMP_RGB.teal[1]]
  const land = [RAMP_RGB.green[0], RAMP_RGB.green[1], RAMP_RGB.green[2], RAMP_RGB.green[3], RAMP_RGB.amber[4]]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2)
      const dy = (y - h / 2) / (h / 2)
      const v = n.fbm(x / 26, y / 26, 9, 5) - Math.hypot(dx, dy) * 0.42
      if (v < 0.3) {
        const s = v > 0.27 ? 2 : (x + y) % 7 === 0 && v < 0.15 ? 1 : 0
        px(ctx, x, y, sea[s])
        continue
      }
      const f = Math.min(0.999, (v - 0.3) * 3) * (land.length - 1)
      let i = Math.floor(f)
      if (f - i > bayer(x, y)) i++
      px(ctx, x, y, v < 0.32 ? RAMP_RGB.amber[4] : land[Math.min(land.length - 1, i)])
    }
}

function atom(ctx: Ctx, w: number, h: number, rng: RNG): void {
  sky(ctx, w, h, [RAMP_RGB.void[1], RAMP_RGB.void[2], RAMP_RGB.void[3]], rng)
  const cx = w / 2
  const cy = h / 2
  const rings = 3
  for (let r = 0; r < rings; r++) {
    const a = (r * Math.PI) / rings + rng.range(-0.1, 0.1)
    for (let t = 0; t < Math.PI * 2; t += 0.01) {
      const ex = Math.cos(t) * w * 0.38
      const ey = Math.sin(t) * h * 0.13
      const x = Math.round(cx + ex * Math.cos(a) - ey * Math.sin(a))
      const y = Math.round(cy + ex * Math.sin(a) + ey * Math.cos(a))
      px(ctx, x, y, RAMP_RGB.cyan[0])
    }
    const t = rng.range(0, 6.28)
    const ex = Math.cos(t) * w * 0.38
    const ey = Math.sin(t) * h * 0.13
    const x = Math.round(cx + ex * Math.cos(a) - ey * Math.sin(a))
    const y = Math.round(cy + ex * Math.sin(a) + ey * Math.cos(a))
    ctx.fillStyle = rgbCss(RAMP_RGB.cyan[2])
    ctx.fillRect(x - 1, y - 1, 3, 3)
  }
  for (let i = 0; i < 7; i++) {
    const x = Math.round(cx + rng.range(-4, 4))
    const y = Math.round(cy + rng.range(-4, 4))
    ctx.fillStyle = rgbCss(i % 2 ? RAMP_RGB.magenta[3] : RAMP_RGB.amber[3])
    ctx.fillRect(x - 2, y - 2, 4, 4)
    ctx.fillStyle = rgbCss(RAMP_RGB.star[4])
    ctx.fillRect(x - 1, y - 2, 1, 1)
  }
}

function cell(ctx: Ctx, w: number, h: number, rng: RNG): void {
  ctx.fillStyle = rgbCss(RAMP_RGB.teal[0])
  ctx.fillRect(0, 0, w, h)
  const n = new Noise3(rng)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w * 0.42)
      const dy = (y - h / 2) / (h * 0.4)
      const d = Math.hypot(dx, dy) + (n.fbm(x / 14, y / 14, 2, 2) - 0.5) * 0.25
      if (d > 1) continue
      let c: RGB = d > 0.93 ? RAMP_RGB.green[3] : RAMP_RGB.teal[2]
      if (d < 0.93 && bayer(x, y) < 0.25 && d > 0.5) c = RAMP_RGB.teal[3]
      const nd = Math.hypot(dx + 0.15, dy + 0.1)
      if (nd < 0.3) c = nd > 0.25 ? RAMP_RGB.violet[4] : RAMP_RGB.violet[2]
      px(ctx, x, y, c)
    }
}

function planetScene(ctx: Ctx, w: number, h: number, seed: string, rng: RNG): void {
  sky(ctx, w, h, [RAMP_RGB.void[0], RAMP_RGB.void[1], RAMP_RGB.void[2]], rng)
  const r = Math.floor(Math.min(w, h) * 0.32)
  const p = renderPlanet(planetSpecFromSeed(seed, r), 1)
  drawPlanetFrame(ctx, p, 0, w / 2, h / 2)
}

function grid(ctx: Ctx, w: number, h: number, rng: RNG): void {
  sky(ctx, w, h, [RAMP_RGB.void[1], RAMP_RGB.void[2]], rng)
  ctx.fillStyle = rgbCss(RAMP_RGB.indigo[1])
  for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 1, h)
  for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 1)
  ctx.fillStyle = rgbCss(RAMP_RGB.amber[3])
  for (let x = 0; x < w; x++) ctx.fillRect(x, Math.round(h / 2 - Math.sin(x / 9) * h * 0.3), 1, 1)
}

export function drawIllustration(ctx: Ctx, category: string, seed: string, w: number, h: number): void {
  const rng = new RNG(seed + '/illus')
  switch (category) {
    case 'astronomy':
      return planetScene(ctx, w, h, seed, rng)
    case 'meteorology':
      return clouds(ctx, w, h, rng)
    case 'earth':
      return strata(ctx, w, h, rng)
    case 'geography':
      return island(ctx, w, h, rng)
    case 'physics':
    case 'chemistry':
      return atom(ctx, w, h, rng)
    case 'biology':
      return cell(ctx, w, h, rng)
    default:
      return grid(ctx, w, h, rng)
  }
}
