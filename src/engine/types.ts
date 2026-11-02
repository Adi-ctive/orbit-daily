import type { Category } from '../games/catalog'
import type { Ratings } from './ratings'
import type { SrsState } from './srs'

export type Phase = 'warmup' | 'review' | 'core' | 'card' | 'boss'

export interface RoundSpec {
  phase: Phase
  /** Game id, or 'review' / 'star-chart' for system rounds. */
  gameId: string
  category: Category | 'review' | 'card'
  difficulty: number
  /** Level seed. Shared by everyone on the same date for the same game. */
  seed: string
  /** Review rounds: item ids. Card rounds: the card id. */
  items?: string[]
}

export interface RoundRecord {
  gameId: string
  phase: Phase
  category: RoundSpec['category']
  score: number
  correct: number
  total: number
  ms: number
}

export interface DayRecord {
  date: string
  seed: string
  plan: RoundSpec[]
  /** Index of the next round to play. */
  index: number
  results: RoundRecord[]
  activeMs: number
  completed: boolean
  capped: boolean
  startedAt: number
  /** True while a round is mounted. Lets a reload restart that round. */
  inRound: boolean
  /** The debrief was shown and closed. */
  debriefed?: boolean
}

export interface Settings {
  music: boolean
  sfx: boolean
  haptics: boolean
  musicVolume: number
  sfxVolume: number
  reducedMotion: 'system' | 'on' | 'off'
  highContrast: boolean
  textScale: number
}

export interface LogbookEntry {
  id: string
  title: string
  category: string
  date: string
}

export interface Profile {
  version: 1
  highWater: number
  ratings: Ratings
  roundsPlayed: Record<string, number>
  ratingHistory: { date: string; ratings: Ratings }[]
  srs: Record<string, SrsState>
  seenCards: string[]
  logbook: LogbookEntry[]
  completedDates: string[]
  freezes: number
  frozenDates: string[]
  /** Core game ids by date, for the no-repeat rule. */
  coreHistory: Record<string, string[]>
  settings: Settings
  installHintSeen: boolean
}

export function defaultSettings(): Settings {
  return {
    music: true,
    sfx: true,
    haptics: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    reducedMotion: 'system',
    highContrast: false,
    textScale: 1,
  }
}
