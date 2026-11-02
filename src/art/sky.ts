// Nebula backdrop (pre-rendered once) plus parallax stars, comets and warp,
// drawn every frame at native resolution with whole-pixel positions.
import { RNG } from '../lib/rng'
import { Noise3 } from './noise'
import { RAMP_RGB, bayer, rgbCss, type RGB } from './palette'
import { makeOffscreen } from './pixelCanvas'

export function renderNebula(seed: string, w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeOffscreen(w, h)
  const rng = new RNG(seed + '/nebula')
  const n = new Noise3(rng)
  const hue = new Noise3(rng.fork('hue'))
  const z = rng.range(0, 100)
  const s = 1 / rng.range(70, 110)
  const img = ctx.createImageData(w, h)
  const d = img.data
  const warm: RGB[] = [RAMP_RGB.void[1], RAMP_RGB.void[2], RAMP_RGB.violet[0], RAMP_RGB.violet[1], RAMP_RGB.magenta[1], RAMP_RGB.magenta[2]]
  const cool: RGB[] = [RAMP_RGB.void[1], RAMP_RGB.void[2], RAMP_RGB.indigo[0], RAMP_RGB.teal[1], RAMP_RGB.teal[2], RAMP_RGB.teal[3]]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Domain warp gives the wispy look.
      const wx = n.fbm(x * s, y * s, z, 3) * 2.2
      const wy = n.fbm(x * s + 5.2, y * s + 1.3, z, 3) * 2.2
      let v = n.fbm(x * s + wx, y * s + wy, z + 3, 5)
      v = Math.max(0, (v - 0.42) / 0.5)
      v = v * v
      const mix = hue.fbm(x * s * 0.6, y * s * 0.6, z, 2)
      const ramp = mix > 0.5 ? warm : cool
      const fv = Math.min(0.999, v) * (ramp.length - 1)
      let i = Math.floor(fv)
      if (fv - i > bayer(x, y)) i++
      const c = ramp[Math.min(ramp.length - 1, i)]
      const o = (y * w + x) * 4
      d[o] = c[0]
      d[o + 1] = c[1]
      d[o + 2] = c[2]
      d[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

interface Star {
  x: number
  y: number
  layer: number
  size: number
  phase: number
  color: string
}

interface Comet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const STAR_COLORS = [RAMP_RGB.star[2], RAMP_RGB.star[3], RAMP_RGB.star[4], RAMP_RGB.cyan[1], RAMP_RGB.amber[4]].map(rgbCss)
const DIM = rgbCss(RAMP_RGB.star[0])
const HALO = rgbCss(RAMP_RGB.indigo[2])
const COMET_HEAD = rgbCss(RAMP_RGB.cyan[2])
const COMET_TAIL = [RAMP_RGB.cyan[1], RAMP_RGB.cyan[0], RAMP_RGB.teal[3], RAMP_RGB.teal[2]].map(rgbCss)

export class Sky {
  private stars: Star[] = []
  private comet: Comet = { x: 0, y: 0, vx: 0, vy: 0, life: 0 }
  private nebula: HTMLCanvasElement | null = null
  private rng: RNG
  private nextComet = 6
  warp = 0

  constructor(
    private seed: string,
    public w: number,
    public h: number,
  ) {
    this.rng = new RNG(seed + '/sky')
    this.build()
  }

  resize(w: number, h: number): void {
    this.w = w
    this.h = h
    this.build()
  }

  private build(): void {
    const r = new RNG(this.seed + '/stars')
    this.nebula = renderNebula(this.seed, this.w, this.h)
    const count = Math.floor((this.w * this.h) / 260)
    this.stars = []
    for (let i = 0; i < count; i++) {
      const layer = r.weighted([6, 3, 1])
      this.stars.push({
        x: r.range(0, this.w),
        y: r.range(0, this.h),
        layer,
        size: layer === 2 && r.bool(0.4) ? 3 : layer === 2 ? 2 : 1,
        phase: r.range(0, Math.PI * 2),
        color: layer === 0 ? DIM : r.pick(STAR_COLORS),
      })
    }
  }

  update(dt: number): void {
    const speed = [1.2, 2.6, 5][0]
    for (const s of this.stars) {
      const v = (s.layer + 1) * speed * (1 + this.warp * 40)
      s.y += v * dt
      if (s.y >= this.h) {
        s.y -= this.h
        s.x = this.rng.range(0, this.w)
      }
    }
    const c = this.comet
    if (c.life > 0) {
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.life -= dt
    } else {
      this.nextComet -= dt
      if (this.nextComet <= 0) {
        this.nextComet = this.rng.range(9, 20)
        const fromLeft = this.rng.bool()
        c.x = fromLeft ? -10 : this.w + 10
        c.y = this.rng.range(0, this.h * 0.5)
        c.vx = (fromLeft ? 1 : -1) * this.rng.range(60, 110)
        c.vy = this.rng.range(15, 40)
        c.life = (this.w + 40) / Math.abs(c.vx)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number, reduced = false): void {
    if (this.nebula) ctx.drawImage(this.nebula, 0, 0)
    else {
      ctx.fillStyle = rgbCss(RAMP_RGB.void[1])
      ctx.fillRect(0, 0, this.w, this.h)
    }
    for (const s of this.stars) {
      const x = Math.round(s.x)
      const y = Math.round(s.y)
      const tw = reduced ? 1 : 0.5 + 0.5 * Math.sin(t * (1.5 + s.layer) + s.phase)
      if (this.warp > 0.05) {
        const len = Math.round(1 + this.warp * (s.layer + 1) * 10)
        ctx.fillStyle = s.color
        ctx.fillRect(x, y - len, 1, len)
        continue
      }
      if (s.size === 3) {
        ctx.fillStyle = HALO
        ctx.fillRect(x - 2, y, 5, 1)
        ctx.fillRect(x, y - 2, 1, 5)
        ctx.fillStyle = s.color
        ctx.fillRect(x - 1, y, 3, 1)
        ctx.fillRect(x, y - 1, 1, 3)
        if (tw > 0.6) {
          ctx.fillStyle = STAR_COLORS[2]
          ctx.fillRect(x, y, 1, 1)
        }
      } else if (s.size === 2) {
        ctx.fillStyle = tw > 0.4 ? s.color : DIM
        ctx.fillRect(x, y, 1, 1)
        if (tw > 0.75) {
          ctx.fillRect(x + 1, y, 1, 1)
          ctx.fillRect(x, y + 1, 1, 1)
        }
      } else if (tw > 0.25) {
        ctx.fillStyle = s.color
        ctx.fillRect(x, y, 1, 1)
      }
    }
    const c = this.comet
    if (c.life > 0 && !reduced) {
      const len = 14
      const nx = -c.vx / Math.hypot(c.vx, c.vy)
      const ny = -c.vy / Math.hypot(c.vx, c.vy)
      for (let i = len; i > 0; i--) {
        ctx.fillStyle = COMET_TAIL[Math.min(COMET_TAIL.length - 1, Math.floor((i / len) * COMET_TAIL.length))]
        if (i > 8 && (i & 1)) continue
        ctx.fillRect(Math.round(c.x + nx * i), Math.round(c.y + ny * i), 1, 1)
      }
      ctx.fillStyle = COMET_HEAD
      ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y), 2, 2)
    }
  }
}
