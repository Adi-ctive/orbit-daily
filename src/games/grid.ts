// Shared grid helpers for the maze games: wall bitmasks, generation, BFS,
// and a D-pad / swipe / keyboard input helper.
import type { RNG } from '../lib/rng'
import { button, el } from './kit'

export const N = 1
export const E = 2
export const S = 4
export const W = 8
export const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S, name: 'up' },
  { bit: E, dx: 1, dy: 0, opp: W, name: 'right' },
  { bit: S, dx: 0, dy: 1, opp: N, name: 'down' },
  { bit: W, dx: -1, dy: 0, opp: E, name: 'left' },
] as const

/** Every cell starts with all four walls. Recursive backtracker carves a perfect maze. */
export function backtracker(rng: RNG, w: number, h: number): number[] {
  const cells = new Array(w * h).fill(N | E | S | W)
  const seen = new Uint8Array(w * h)
  const stack = [0]
  seen[0] = 1
  while (stack.length) {
    const c = stack[stack.length - 1]
    const x = c % w
    const y = Math.floor(c / w)
    const opts = DIRS.filter((d) => {
      const nx = x + d.dx
      const ny = y + d.dy
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx]
    })
    if (!opts.length) {
      stack.pop()
      continue
    }
    const d = rng.pick(opts)
    const n = (y + d.dy) * w + (x + d.dx)
    cells[c] &= ~d.bit
    cells[n] &= ~d.opp
    seen[n] = 1
    stack.push(n)
  }
  return cells
}

export function canMove(cells: number[], w: number, h: number, c: number, d: (typeof DIRS)[number]): boolean {
  const x = (c % w) + d.dx
  const y = Math.floor(c / w) + d.dy
  return x >= 0 && y >= 0 && x < w && y < h && !(cells[c] & d.bit)
}

/** Shortest path length in moves, or -1. */
export function bfs(cells: number[], w: number, h: number, from: number, to: number): number {
  const dist = new Int32Array(w * h).fill(-1)
  dist[from] = 0
  const q = [from]
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    if (c === to) return dist[c]
    for (const d of DIRS) {
      if (!canMove(cells, w, h, c, d)) continue
      const n = c + d.dx + d.dy * w
      if (dist[n] < 0) {
        dist[n] = dist[c] + 1
        q.push(n)
      }
    }
  }
  return -1
}

/** Walls must agree on both sides. */
export function wallsConsistent(cells: number[], w: number, h: number): boolean {
  for (let c = 0; c < cells.length; c++)
    for (const d of DIRS) {
      const x = (c % w) + d.dx
      const y = Math.floor(c / w) + d.dy
      if (x < 0 || y < 0 || x >= w || y >= h) {
        if (!(cells[c] & d.bit)) return false
        continue
      }
      const n = y * w + x
      if (!!(cells[c] & d.bit) !== !!(cells[n] & d.opp)) return false
    }
  return true
}

/** On-screen D-pad plus arrow keys and swipe on `swipeEl`. Returns a cleanup function. */
export function directionInput(controls: HTMLElement, swipeEl: HTMLElement, onDir: (i: number) => void, extra: HTMLElement[] = []): () => void {
  const pad = el('div', { class: 'dpad' })
  const labels = ['▲', '▶', '▼', '◀']
  const btns = DIRS.map((d, i) => {
    const b = button(labels[i], () => onDir(i), 'dpad-' + d.name)
    b.setAttribute('aria-label', 'Move ' + d.name)
    return b
  })
  pad.append(el('span'), btns[0], el('span'), btns[3], el('span', { class: 'dpad-mid' }), btns[1], el('span'), btns[2], el('span'))
  controls.append(pad, ...extra)
  const keys: Record<string, number> = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 }
  const onKey = (e: KeyboardEvent) => {
    if (e.code in keys) {
      e.preventDefault()
      onDir(keys[e.code])
    }
  }
  addEventListener('keydown', onKey)
  let sx = 0
  let sy = 0
  let down = false
  const pd = (e: PointerEvent) => {
    down = true
    sx = e.clientX
    sy = e.clientY
  }
  const pu = (e: PointerEvent) => {
    if (!down) return
    down = false
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0)
  }
  swipeEl.addEventListener('pointerdown', pd)
  swipeEl.addEventListener('pointerup', pu)
  return () => {
    removeEventListener('keydown', onKey)
    swipeEl.removeEventListener('pointerdown', pd)
    swipeEl.removeEventListener('pointerup', pu)
  }
}
