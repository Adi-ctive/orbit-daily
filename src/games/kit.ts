// Small helpers shared by game modules: DOM building, a pausable loop, stages.
import { PixelCanvas } from '../art/pixelCanvas'

type Attrs = Record<string, string | number | boolean | EventListener | undefined>

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener)
    else if (k === 'class') e.className = String(v)
    else if (k === 'text') e.textContent = String(v)
    else e.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) if (c != null) e.append(c)
  return e
}

/** A pausable requestAnimationFrame loop. dt is in seconds and clamped. */
export class Loop {
  private raf = 0
  private last = 0
  private paused = false
  private stopped = false
  time = 0

  constructor(private step: (dt: number, t: number) => void) {
    this.raf = requestAnimationFrame(this.frame)
  }

  private frame = (ts: number): void => {
    if (this.stopped) return
    const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0
    this.last = ts
    if (!this.paused) {
      this.time += dt
      this.step(dt, this.time)
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    this.last = 0
  }

  stop(): void {
    this.stopped = true
    cancelAnimationFrame(this.raf)
  }
}

/** A timer driven by the game loop, so it pauses with the game. */
export class GameTimer {
  private items: { at: number; fn: () => void }[] = []
  now = 0

  after(sec: number, fn: () => void): void {
    this.items.push({ at: this.now + sec, fn })
  }

  tick(dt: number): void {
    this.now += dt
    const due = this.items.filter((i) => i.at <= this.now)
    if (!due.length) return
    this.items = this.items.filter((i) => i.at > this.now)
    for (const d of due) d.fn()
  }

  clear(): void {
    this.items = []
  }
}

export interface Stage {
  root: HTMLDivElement
  hud: HTMLDivElement
  canvasBox: HTMLDivElement
  controls: HTMLDivElement
  pc: PixelCanvas
  destroy(): void
}

/** Standard layout: HUD line, pixel canvas, then a controls row. */
export function makeStage(host: HTMLElement, minW = 200, minH = 220): Stage {
  const hud = el('div', { class: 'g-hud', 'aria-live': 'polite' })
  const canvasBox = el('div', { class: 'g-canvas' })
  const controls = el('div', { class: 'g-controls' })
  const root = el('div', { class: 'g-stage' }, hud, canvasBox, controls)
  host.append(root)
  const pc = new PixelCanvas(canvasBox, { minW, minH })
  return {
    root,
    hud,
    canvasBox,
    controls,
    pc,
    destroy() {
      pc.destroy()
      root.remove()
    },
  }
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'g-btn ' + cls, text: label })
  let lock = false
  b.addEventListener('click', () => {
    // Guard against double taps.
    if (lock || b.disabled) return
    lock = true
    setTimeout(() => (lock = false), 180)
    onClick()
  })
  return b
}

export function pct(n: number): string {
  return Math.round(n * 100) + '%'
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Map difficulty 0..1 onto an integer range. */
export function dInt(d: number, lo: number, hi: number): number {
  return Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, d)))
}
