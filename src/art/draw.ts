// Pixel drawing primitives. Every coordinate is snapped to whole pixels.
import { bayer } from './palette'

type Ctx = CanvasRenderingContext2D

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8))
    ctx.fillRect(x0 - w, y0 + y, w * 2 + 1, 1)
  }
}

/** Shaded sphere: base, a lit cap toward the top-left, and a highlight pixel. */
export function ball(ctx: Ctx, cx: number, cy: number, r: number, dark: string, mid: string, light: string, shine: string): void {
  disc(ctx, cx, cy, r, dark)
  disc(ctx, cx - Math.max(1, r * 0.2), cy - Math.max(1, r * 0.2), Math.max(1, Math.round(r * 0.75)), mid)
  disc(ctx, cx - r * 0.35, cy - r * 0.35, Math.max(0, Math.round(r * 0.35)), light)
  ctx.fillStyle = shine
  ctx.fillRect(Math.round(cx - r * 0.45), Math.round(cy - r * 0.45), 1, 1)
}

export function ring(ctx: Ctx, cx: number, cy: number, r: number, color: string, dotted = false): void {
  ctx.fillStyle = color
  const steps = Math.max(12, Math.round(r * 7))
  for (let i = 0; i < steps; i++) {
    if (dotted && i % 3) continue
    const a = (i / steps) * Math.PI * 2
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1)
  }
}

/** Pixel-art glow: dithered rings fading outward, never a blur. */
export function halo(ctx: Ctx, cx: number, cy: number, r0: number, width: number, color: string): void {
  ctx.fillStyle = color
  const R = r0 + width
  for (let y = -R; y <= R; y++)
    for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y)
      if (d < r0 || d > R) continue
      const t = 1 - (d - r0) / width
      const px = Math.round(cx) + x
      const py = Math.round(cy) + y
      if (t > bayer(px, py)) ctx.fillRect(px, py, 1, 1)
    }
}

export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, dash = 0): void {
  ctx.fillStyle = color
  x0 = Math.round(x0)
  y0 = Math.round(y0)
  x1 = Math.round(x1)
  y1 = Math.round(y1)
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let k = 0
  for (;;) {
    if (!dash || Math.floor(k / dash) % 2 === 0) ctx.fillRect(x0, y0, 1, 1)
    k++
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

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

export function frame(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  rect(ctx, x, y, w, 1, color)
  rect(ctx, x, y + h - 1, w, 1, color)
  rect(ctx, x, y, 1, h, color)
  rect(ctx, x + w - 1, y, 1, h, color)
}

/** A small five-point star sprite. */
export function starShape(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color
  const x = Math.round(cx)
  const y = Math.round(cy)
  ctx.fillRect(x - r, y, r * 2 + 1, 1)
  ctx.fillRect(x, y - r, 1, r * 2 + 1)
  if (r > 1) {
    ctx.fillRect(x - 1, y - 1, 3, 3)
  }
}

/** Arrow pointing in direction `a` (radians, 0 = right). */
export function arrow(ctx: Ctx, cx: number, cy: number, a: number, len: number, color: string): void {
  const hx = cx + Math.cos(a) * len
  const hy = cy + Math.sin(a) * len
  line(ctx, cx - Math.cos(a) * len, cy - Math.sin(a) * len, hx, hy, color)
  for (const s of [-1, 1]) line(ctx, hx, hy, hx - Math.cos(a + s * 0.6) * len * 0.5, hy - Math.sin(a + s * 0.6) * len * 0.5, color)
}
