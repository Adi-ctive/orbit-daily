// Indexed sprites written as string maps. '.' is transparent; other chars map
// to palette colours through the sprite's key.
import { makeOffscreen } from '../pixelCanvas'

export interface StringSprite {
  w: number
  h: number
  rows: readonly string[]
  key: Readonly<Record<string, string>>
}

export function spriteFromRows(rows: readonly string[], key: Record<string, string>): StringSprite {
  return { w: rows[0]?.length ?? 0, h: rows.length, rows, key }
}

export function drawStringSprite(ctx: CanvasRenderingContext2D, s: StringSprite, x: number, y: number, scale = 1): void {
  for (let r = 0; r < s.h; r++) {
    const row = s.rows[r]
    for (let c = 0; c < s.w; c++) {
      const ch = row[c]
      if (ch === '.' || ch === undefined) continue
      const col = s.key[ch]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale)
    }
  }
}

const urlCache = new Map<StringSprite, string>()

/** Data URL at native size, for DOM <img> with image-rendering: pixelated. */
export function spriteDataUrl(s: StringSprite): string {
  const hit = urlCache.get(s)
  if (hit) return hit
  const { canvas, ctx } = makeOffscreen(s.w, s.h)
  drawStringSprite(ctx, s, 0, 0)
  const url = canvas.toDataURL('image/png')
  urlCache.set(s, url)
  return url
}

/** Indexed buffer sprite (generated in code). 0 is transparent. */
export interface IndexedSprite {
  w: number
  h: number
  data: Uint8Array
  colors: readonly string[]
}

export function drawIndexed(ctx: CanvasRenderingContext2D, s: IndexedSprite, x: number, y: number): void {
  for (let i = 0; i < s.data.length; i++) {
    const v = s.data[i]
    if (!v) continue
    ctx.fillStyle = s.colors[v]
    ctx.fillRect(x + (i % s.w), y + Math.floor(i / s.w), 1, 1)
  }
}

/** Wrap filled pixels in a coloured (never pure black) outline. */
export function outline(s: IndexedSprite, colorIndex: number): IndexedSprite {
  const out = new Uint8Array(s.data)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (s.data[y * s.w + x]) continue
      const n =
        (x > 0 && s.data[y * s.w + x - 1]) ||
        (x < s.w - 1 && s.data[y * s.w + x + 1]) ||
        (y > 0 && s.data[(y - 1) * s.w + x]) ||
        (y < s.h - 1 && s.data[(y + 1) * s.w + x])
      if (n) out[y * s.w + x] = colorIndex
    }
  return { ...s, data: out }
}
