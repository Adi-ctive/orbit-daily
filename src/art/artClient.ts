// Main-thread side of the art worker. Falls back to drawing in place if workers fail.
import type { ArtJob } from './artWorker'
import { planetPixels, spriteFromPixels, type PlanetSpec, type PlanetSprite } from './planet'
import { nebulaPixels, pixelsToCanvas } from './sky'

let worker: Worker | null = null
let broken = false
let nextId = 1
const waiting = new Map<number, (d: Uint8ClampedArray) => void>()

function getWorker(): Worker | null {
  if (broken) return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('./artWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; data: Uint8ClampedArray }>) => {
      waiting.get(e.data.id)?.(e.data.data)
      waiting.delete(e.data.id)
    }
    worker.onerror = () => {
      broken = true
      worker = null
    }
    return worker
  } catch {
    broken = true
    return null
  }
}

type Request = ArtJob extends infer J ? (J extends ArtJob ? Omit<J, 'id'> : never) : never

function run(job: Request, fallback: () => Uint8ClampedArray): Promise<Uint8ClampedArray> {
  const w = getWorker()
  if (!w) return Promise.resolve(fallback())
  const id = nextId++
  return new Promise((resolve) => {
    // If the worker dies or stalls, draw it here instead.
    const t = setTimeout(() => {
      waiting.delete(id)
      resolve(fallback())
    }, 8000)
    waiting.set(id, (d) => {
      clearTimeout(t)
      resolve(d)
    })
    w.postMessage({ ...job, id })
  })
}

export async function nebulaAsync(seed: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const d = await run({ kind: 'nebula', seed, w, h }, () => nebulaPixels(seed, w, h))
  return pixelsToCanvas(d, w, h)
}

export async function planetAsync(spec: PlanetSpec, frames: number): Promise<PlanetSprite> {
  const d = await run({ kind: 'planet', spec, frames }, () => planetPixels(spec, frames))
  return spriteFromPixels(spec, frames, d)
}
