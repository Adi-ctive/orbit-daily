// Static game metadata. No game code is imported here, so the composer stays pure
// and each game module can be lazy-loaded.

export type Category = 'reflex' | 'memory' | 'math' | 'logic' | 'maze' | 'riddle' | 'stem'

export const CATEGORIES: readonly Category[] = ['reflex', 'memory', 'math', 'logic', 'maze', 'riddle', 'stem']

export const CATEGORY_LABEL: Record<Category, string> = {
  reflex: 'Reflex',
  memory: 'Memory',
  math: 'Math',
  logic: 'Logic',
  maze: 'Maze',
  riddle: 'Riddle',
  stem: 'Science',
}

export interface CatalogEntry {
  id: string
  category: Category
  title: string
  /** Can be used as the boss puzzle. */
  boss?: boolean
}

export const CATALOG: readonly CatalogEntry[] = [
  { id: 'thruster-abort', category: 'reflex', title: 'Thruster Abort' },
  { id: 'catch-comet', category: 'reflex', title: 'Catch the Comet' },
  { id: 'orbit-tracker', category: 'reflex', title: 'Orbit Tracker' },
  { id: 'constellation', category: 'memory', title: 'Constellation Recall' },
  { id: 'dead-reckoning', category: 'memory', title: 'Dead Reckoning' },
  { id: 'signal-drift', category: 'memory', title: 'Signal Drift' },
  { id: 'fuel-mix', category: 'math', title: 'Fuel Mix' },
  { id: 'fermi-line', category: 'math', title: 'Fermi Line' },
  { id: 'doomsday', category: 'math', title: 'Doomsday Sprint' },
  { id: 'aliens', category: 'logic', title: 'Truthful & Lying Aliens', boss: true },
  { id: 'vanishing-walls', category: 'maze', title: 'Vanishing Walls', boss: true },
  { id: 'void-beast', category: 'maze', title: 'Escape the Void Beast', boss: true },
  { id: 'alt-colour', category: 'maze', title: 'Pulsar Path', boss: true },
  { id: 'star-sticks', category: 'riddle', title: 'Star-Stick Equations' },
  { id: 'riddle-bank', category: 'riddle', title: 'Signal from Deep Space' },
  { id: 'isobar-wind', category: 'stem', title: 'Isobar Wind Reader' },
]

export const SYSTEM_ROUNDS = { review: 'review', card: 'star-chart' } as const

export function catalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((g) => g.id === id)
}
