// A game canvas with a small logical coordinate space (at least minW × minH units)
// drawn at full device resolution with smoothing, so shapes and text stay sharp.

export interface PixelCanvasOptions {
  /** Smallest logical size. One logical unit is scaled to fill the box. */
  minW: number
  minH: number
  /** Keep the logical size exactly minW × minH. */
  fixed?: boolean
  onResize?: (w: number, h: number) => void
}

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  w = 1
  h = 1
  /** CSS pixels per logical unit. */
  scale = 1
  /** Device pixels per logical unit (for offscreen renders). */
  res = 1
  private ro: ResizeObserver | null = null

  constructor(
    private host: HTMLElement,
    private opts: PixelCanvasOptions,
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'pixel-canvas'
    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    host.appendChild(this.canvas)
    this.resize()
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize())
      this.ro.observe(host)
    }
  }

  resize(): void {
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    const rect = this.host.getBoundingClientRect()
    const cssW = Math.max(1, rect.width)
    const cssH = Math.max(1, rect.height)
    const scale = Math.max(0.5, Math.min(cssW / this.opts.minW, cssH / this.opts.minH))
    const w = this.opts.fixed ? this.opts.minW : Math.floor(cssW / scale)
    const h = this.opts.fixed ? this.opts.minH : Math.floor(cssH / scale)
    if (w === this.w && h === this.h && Math.abs(scale - this.scale) < 1e-3) return
    this.w = w
    this.h = h
    this.scale = scale
    this.res = scale * dpr
    this.canvas.width = Math.round(w * this.res)
    this.canvas.height = Math.round(h * this.res)
    this.canvas.style.width = `${w * scale}px`
    this.canvas.style.height = `${h * scale}px`
    this.ctx.setTransform(this.res, 0, 0, this.res, 0, 0)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.opts.onResize?.(w, h)
  }

  /** Client (CSS px) coords to logical coords. */
  toNative(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.h,
    }
  }

  destroy(): void {
    this.ro?.disconnect()
    this.canvas.remove()
  }
}

export function makeOffscreen(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx }
}

export const px = (v: number): number => v
