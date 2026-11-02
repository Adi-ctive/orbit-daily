// Web Worker: heavy procedural art off the main thread.
import { planetPixels, type PlanetSpec } from './planet'
import { nebulaPixels } from './sky'

export type ArtJob = { id: number; kind: 'nebula'; seed: string; w: number; h: number } | { id: number; kind: 'planet'; spec: PlanetSpec; frames: number }

self.onmessage = (e: MessageEvent<ArtJob>) => {
  const job = e.data
  const data = job.kind === 'nebula' ? nebulaPixels(job.seed, job.w, job.h) : planetPixels(job.spec, job.frames)
  ;(self as unknown as Worker).postMessage({ id: job.id, data }, [data.buffer])
}
