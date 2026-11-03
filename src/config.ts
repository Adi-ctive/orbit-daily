// Core tunables. The daily lock and session shape read from here only.

export const APP_VERSION = 'v1'
export const SEED_PREFIX = 'orbit-v1|'

export const SESSION_TARGET_MIN = 15
export const SESSION_HARD_CAP_MIN = 20
export const SESSION_HARD_CAP_MS = SESSION_HARD_CAP_MIN * 60_000

/** Day rolls over at local midnight in the device time zone. */
export const DAY_ROLLOVER = 'local-midnight' as const

/** How often active time is flushed to IndexedDB while a round runs. */
export const ACTIVE_TIME_FLUSH_MS = 3_000

export const REVIEW_ITEMS_MIN = 3
export const REVIEW_ITEMS_MAX = 5
export const CORE_ROUNDS = 4
export const NO_REPEAT_DAYS = 2

/** Elo target band for adaptive difficulty. */
export const TARGET_SUCCESS = 0.775
export const ELO_K = 24
export const DEFAULT_RATING = 1000

export const SITE_URL = 'https://orbit-daily-12s.pages.dev'
export const TAGLINE = 'Fifteen minutes. One mission. Every day.'
