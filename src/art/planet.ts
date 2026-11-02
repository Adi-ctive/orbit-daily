// Procedural pixel planets: noise terrain or gas bands, sphere shading, rim
// light, dithered terminator, atmosphere halo, optional rings. Pre-rendered
// into a strip of rotation frames.
import { RNG } from '../lib/rng'
import { Noise3 } from './noise'
import { RAMP_RGB, bayer, type RGB } from './palette'
import { makeOffscreen } from './pixelCanvas'

export type PlanetKind = 'terran' | 'gas' | 'ice' | 'lava' | 'desert'

export interface PlanetSpec {
  kind: PlanetKind
  radius: number
  ring: boolean
  ringTilt: number
  axialTilt: number
  moons: number
  light: [number, number, number]
  seed: string
  bandFreq: number
}

export function planetSpecFromSeed(seed: string, radius: number): PlanetSpec {
  const r = new RNG(seed + '/planet')
  const kind = r.pick<PlanetKind>(['terran', 'gas', 'ice', 'lava', 'desert', 'gas', 'terran'])
  const lx = r.range(-0.8, -0.4)
  const ly = r.range(-0.7, -0.3)
  const lz = Math.sqrt(Math.max(0.05, 1 - lx * lx - ly * ly))
  return {
    kind,
    radius,
    ring: kind === 'gas' ? r.bool(0.75) : r.bool(0.2),
    ringTilt: r.range(0.22, 0.42),
    axialTilt: r.range(-0.35, 0.35),
    moons: r.int(0, 2),
    light: [lx, ly, lz],
    seed,
    bandFreq: r.range(5, 11),
  }
}

/** Colour ramps per planet kind: [low, mid, high] terrain ramps, darkest first. */
function rampsFor(kind: PlanetKind): { ramps: RGB[][]; atmo: RGB; rim: RGB } {
  const R = RAMP_RGB
  switch (kind) {
    case 'terran':
      return { ramps: [R.indigo, R.teal, R.green], atmo: R.cyan[1], rim: R.cyan[2] }
    case 'gas':
      return { ramps: [R.amber.slice(0, 5), R.magenta, R.violet], atmo: R.amber[4], rim: R.amber[5] }
    case 'ice':
      return { ramps: [R.indigo, [...R.indigo.slice(2), ...R.cyan], R.star], atmo: R.cyan[2], rim: R.star[4] }
    case 'lava':
      return { ramps: [R.void.slice(1), R.lava, R.amber.slice(2)], atmo: R.lava[3], rim: R.amber[4] }
    case 'desert':
      return { ramps: [R.earth.concat(R.amber.slice(1, 3)), R.amber.slice(1), R.amber.slice(2)], atmo: R.amber[4], rim: R.amber[5] }
  }
}

export interface PlanetSprite {
  sheet: HTMLCanvasElement
  frames: number
  size: number
  spec: PlanetSpec
}

/** Renders `frames` rotation frames side by side. Size includes halo and rings. */
export function renderPlanet(spec: PlanetSpec, frames = 32): PlanetSprite {
  const R = spec.radius
  const pad = spec.ring ? Math.ceil(R * 0.9) : 4
  const size = Math.ceil(R * 2 + pad * 2)
  const { canvas, ctx } = makeOffscreen(size * frames, size)
  const noise = new Noise3(new RNG(spec.seed + '/terrain'))
  const { ramps, atmo, rim } = rampsFor(spec.kind)
  const [lx, ly, lz] = spec.light
  const c = size / 2
  const img = ctx.createImageData(size * frames, size)
  const d = img.data
  const cosT = Math.cos(spec.axialTilt)
  const sinT = Math.sin(spec.axialTilt)

  const put = (x: number, y: number, col: RGB) => {
    if (x < 0 || y < 0 || y >= size) return
    const o = (y * size * frames + x) * 4
    d[o] = col[0]
    d[o + 1] = col[1]
    d[o + 2] = col[2]
    d[o + 3] = 255
  }

  for (let f = 0; f < frames; f++) {
    const rot = (f / frames) * Math.PI * 2
    const ox = f * size

    // Ring back half (drawn first so the planet covers it).
    if (spec.ring) drawRing(put, ox, c, R, spec.ringTilt, true, ramps, lx)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - c) / R
        const dy = (y + 0.5 - c) / R
        const d2 = dx * dx + dy * dy
        if (d2 > 1) {
          // Atmosphere halo: two dithered rings of glow outside the disk.
          const e = Math.sqrt(d2)
          const lit = -(dx * lx + dy * ly) / e
          if (e < 1 + 2.2 / R && lit > -0.2 && bayer(x, y) < 0.5 + lit * 0.4) put(ox + x, y, atmo)
          continue
        }
        const nz = Math.sqrt(1 - d2)
        // Tilt the axis, then rotate around it.
        const tx = dx * cosT - dy * sinT
        const ty = dx * sinT + dy * cosT
        const lon = Math.atan2(tx, nz) + rot
        const lat = Math.asin(Math.max(-1, Math.min(1, ty)))
        const cl = Math.cos(lat)
        const sx = cl * Math.sin(lon)
        const sy = Math.sin(lat)
        const sz = cl * Math.cos(lon)

        let h: number
        if (spec.kind === 'gas') {
          const warp = noise.fbm(sx * 2, sy * 2, sz * 2, 3) - 0.5
          h = 0.5 + 0.5 * Math.sin(sy * spec.bandFreq + warp * 3.2)
        } else {
          h = noise.fbm(sx * 1.6 + 7, sy * 1.6, sz * 1.6, 5)
        }

        // Lighting with a soft wrap so the terminator has width to dither across.
        const ndl = dx * lx + dy * ly + nz * lz
        let light = Math.max(0, Math.min(1, (ndl + 0.25) / 1.15))
        light = light * light * (3 - 2 * light)

        const band = h < 0.48 ? 0 : h < 0.6 ? 1 : 2
        const ramp = ramps[band]
        const v = Math.max(0, Math.min(0.999, light * 0.85 + (h - 0.5) * 0.25 + 0.05))
        const steps = ramp.length
        const fv = v * (steps - 1)
        let idx = Math.floor(fv)
        if (fv - idx > bayer(x, y)) idx++
        idx = Math.min(steps - 1, idx)
        // Deep night side falls to the darkest void tone.
        let col = light < 0.06 && bayer(x, y) > light * 10 ? RAMP_RGB.void[1] : ramp[idx]
        // Rim light on the lit limb.
        if (d2 > 0.84 && ndl > 0.2) col = rim
        // Lava glows on the night side.
        if (spec.kind === 'lava' && light < 0.3 && h > 0.62) col = RAMP_RGB.lava[3]
        // Ice caps.
        if ((spec.kind === 'terran' || spec.kind === 'desert') && Math.abs(sy) > 0.86) {
          col = light > 0.25 ? RAMP_RGB.star[3] : RAMP_RGB.star[0]
        }
        put(ox + x, y, col)
      }
    }

    if (spec.ring) drawRing(put, ox, c, R, spec.ringTilt, false, ramps, lx)
  }
  ctx.putImageData(img, 0, 0)
  return { sheet: canvas, frames, size, spec }
}

function drawRing(
  put: (x: number, y: number, c: RGB) => void,
  ox: number,
  c: number,
  R: number,
  tilt: number,
  back: boolean,
  ramps: RGB[][],
  lx: number,
): void {
  const inner = R * 1.25
  const outer = R * 1.85
  const ramp = ramps[2]
  const n = Math.ceil(outer * 2 + 2)
  for (let y = -n; y <= n; y++) {
    for (let x = -n; x <= n; x++) {
      const ex = x + 0.5
      const ey = (y + 0.5) / tilt
      const rr = Math.sqrt(ex * ex + ey * ey)
      if (rr < inner || rr > outer) continue
      const isBack = y < 0
      if (isBack !== back) continue
      // Hide the part of the front ring that is not in front of the disk: none, it's in front.
      // Hide the back ring where the disk covers it (handled by draw order).
      const t = (rr - inner) / (outer - inner)
      if (t > 0.55 && t < 0.62) continue // Cassini gap
      const shade = 0.55 + 0.35 * Math.sin(t * 19) - (x * lx > 0 ? 0 : 0.15)
      const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(shade * ramp.length + bayer(x, y) - 0.5)))
      put(ox + Math.floor(c + x), Math.floor(c + y), ramp[idx])
    }
  }
}

/** A tiny shaded moon sprite. */
export function renderMoon(seed: string, r: number): HTMLCanvasElement {
  const size = r * 2 + 2
  const { canvas, ctx } = makeOffscreen(size, size)
  const img = ctx.createImageData(size, size)
  const rng = new RNG(seed + '/moon')
  const ramp = rng.pick([RAMP_RGB.star, RAMP_RGB.indigo, RAMP_RGB.earth.concat(RAMP_RGB.amber.slice(2, 4))])
  const n = new Noise3(rng)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - size / 2) / r
      const dy = (y + 0.5 - size / 2) / r
      const d2 = dx * dx + dy * dy
      if (d2 > 1) continue
      const nz = Math.sqrt(1 - d2)
      const l = Math.max(0, (-0.6 * dx - 0.5 * dy + 0.6 * nz + 0.2) / 1.2)
      const v = l * 0.9 + (n.fbm(dx * 3, dy * 3, nz * 3, 2) - 0.5) * 0.3
      const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length + bayer(x, y) - 0.5)))
      const col = l < 0.08 ? RAMP_RGB.void[2] : ramp[idx]
      const o = (y * size + x) * 4
      img.data[o] = col[0]
      img.data[o + 1] = col[1]
      img.data[o + 2] = col[2]
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export function drawPlanetFrame(ctx: CanvasRenderingContext2D, p: PlanetSprite, frame: number, x: number, y: number): void {
  const f = ((Math.floor(frame) % p.frames) + p.frames) % p.frames
  ctx.drawImage(p.sheet, f * p.size, 0, p.size, p.size, Math.round(x - p.size / 2), Math.round(y - p.size / 2), p.size, p.size)
}
