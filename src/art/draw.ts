// Vector drawing primitives for the game canvases.
type Ctx = CanvasRenderingContext2D

/** Radii can briefly be zero or negative while a canvas is still being sized. */
const ok = (...v: number[]) => v.every((x) => Number.isFinite(x))

export function alpha(color: string, a: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const n = parseInt(color.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
  }
  return color
}

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  if (!ok(cx, cy, r) || r <= 0) return
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2)
  ctx.fill()
}

/** Lit sphere: a radial gradient from a highlight toward the dark limb. */
export function ball(ctx: Ctx, cx: number, cy: number, r: number, dark: string, mid: string, light: string, shine: string): void {
  if (!ok(cx, cy, r) || r <= 0) return
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r)
  g.addColorStop(0, shine)
  g.addColorStop(0.25, light)
  g.addColorStop(0.65, mid)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2)
  ctx.fill()
}

export function ring(ctx: Ctx, cx: number, cy: number, r: number, color: string, dotted = false, width = 1): void {
  if (!ok(cx, cy, r) || r <= 0) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(dotted ? [1.5, 3] : [])
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

/** Soft glow from radius r0 fading out over `width`. */
export function halo(ctx: Ctx, cx: number, cy: number, r0: number, width: number, color: string): void {
  if (!ok(cx, cy, r0, width)) return
  r0 = Math.max(0, r0)
  width = Math.max(0.1, width)
  const g = ctx.createRadialGradient(cx, cy, Math.max(0, r0 * 0.6), cx, cy, r0 + width)
  g.addColorStop(0, alpha(color, 0.55))
  g.addColorStop(1, alpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r0 + width, 0, Math.PI * 2)
  ctx.fill()
}

export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, dash = 0, width = 1): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(dash ? [dash, dash * 1.4] : [])
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.setLineDash([])
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export function frame(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, r = 3): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r)
  ctx.stroke()
}

/** Four-point sparkle. */
export function starShape(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  const k = r * 0.22
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + k, cy - k, cx + r, cy)
  ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r)
  ctx.quadraticCurveTo(cx - k, cy + k, cx - r, cy)
  ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r)
  ctx.fill()
}

/** Arrow pointing along `a` (radians, 0 = right). */
export function arrow(ctx: Ctx, cx: number, cy: number, a: number, len: number, color: string, width = 1.4): void {
  const hx = cx + Math.cos(a) * len
  const hy = cy + Math.sin(a) * len
  line(ctx, cx - Math.cos(a) * len, cy - Math.sin(a) * len, hx, hy, color, 0, width)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(hx + Math.cos(a) * len * 0.15, hy + Math.sin(a) * len * 0.15)
  ctx.lineTo(hx - Math.cos(a - 0.5) * len * 0.5, hy - Math.sin(a - 0.5) * len * 0.5)
  ctx.lineTo(hx - Math.cos(a + 0.5) * len * 0.5, hy - Math.sin(a + 0.5) * len * 0.5)
  ctx.fill()
}

export function polygon(ctx: Ctx, pts: [number, number][], color: string | CanvasGradient): void {
  ctx.fillStyle = color
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fill()
}
