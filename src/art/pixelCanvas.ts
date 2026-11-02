// A canvas drawn at low native resolution and scaled up by a whole number of
// device pixels, so art pixels stay perfectly square and sharp.

export interface PixelCanvasOptions {
  /** Smallest native size we want. The scale is the largest integer that keeps at least this. */
  minW: number
  minH: number
  /** Keep the native size exactly minW × minH and letterbox the rest. */
  fixed?: boolean
  onResize?: (w: number, h: number) => void
}

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  w = 1
  h = 1
  scale = 1
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
    const dpr = window.devicePixelRatio || 1
    const rect = this.host.getBoundingClientRect()
    const devW = Math.max(1, Math.floor(rect.width * dpr))
    const devH = Math.max(1, Math.floor(rect.height * dpr))
    const scale = Math.max(1, Math.floor(Math.min(devW / this.opts.minW, devH / this.opts.minH)))
    const w = this.opts.fixed ? this.opts.minW : Math.floor(devW / scale)
    const h = this.opts.fixed ? this.opts.minH : Math.floor(devH / scale)
    if (w === this.w && h === this.h && scale === this.scale) return
    this.w = w
    this.h = h
    this.scale = scale
    this.canvas.width = w
    this.canvas.height = h
    this.canvas.style.width = `${(w * scale) / dpr}px`
    this.canvas.style.height = `${(h * scale) / dpr}px`
    this.ctx.imageSmoothingEnabled = false
    this.opts.onResize?.(w, h)
  }

  /** Client (CSS px) coords to native pixel coords. */
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
  ctx.imageSmoothingEnabled = false
  return { canvas, ctx }
}

/** Snap a float to a whole pixel at draw time. */
export const px = (v: number): number => Math.round(v)
