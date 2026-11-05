// Lazy loaders for every round module, so each game is its own chunk.
import type { GameModule, Level } from './types'

type Loader = () => Promise<{ default: GameModule<Level> }>

const loaders: Record<string, Loader> = {
  'thruster-abort': () => import('./thrusterAbort') as Promise<{ default: GameModule<Level> }>,
  'catch-comet': () => import('./catchComet') as Promise<{ default: GameModule<Level> }>,
  'orbit-tracker': () => import('./orbitTracker') as Promise<{ default: GameModule<Level> }>,
  constellation: () => import('./constellation') as Promise<{ default: GameModule<Level> }>,
  'dead-reckoning': () => import('./deadReckoning') as Promise<{ default: GameModule<Level> }>,
  'signal-drift': () => import('./signalDrift') as Promise<{ default: GameModule<Level> }>,
  'fuel-mix': () => import('./fuelMix') as Promise<{ default: GameModule<Level> }>,
  'fermi-line': () => import('./fermiLine') as Promise<{ default: GameModule<Level> }>,
  doomsday: () => import('./doomsday') as Promise<{ default: GameModule<Level> }>,
  aliens: () => import('./aliens') as Promise<{ default: GameModule<Level> }>,
  'vanishing-walls': () => import('./vanishingWalls') as Promise<{ default: GameModule<Level> }>,
  'void-beast': () => import('./voidBeast') as Promise<{ default: GameModule<Level> }>,
  'alt-colour': () => import('./altColour') as Promise<{ default: GameModule<Level> }>,
  'star-sticks': () => import('./starSticks') as Promise<{ default: GameModule<Level> }>,
  'riddle-bank': () => import('./riddleBank') as Promise<{ default: GameModule<Level> }>,
  'isobar-wind': () => import('./isobarWind') as Promise<{ default: GameModule<Level> }>,
  'rule-flip': () => import('./ruleFlip') as Promise<{ default: GameModule<Level> }>,
  'odd-one-out': () => import('./oddOneOut') as Promise<{ default: GameModule<Level> }>,
  'spot-change': () => import('./spotChange') as Promise<{ default: GameModule<Level> }>,
  'running-tally': () => import('./runningTally') as Promise<{ default: GameModule<Level> }>,
  'code-lock': () => import('./codeLock') as Promise<{ default: GameModule<Level> }>,
  'turn-mirror': () => import('./turnMirror') as Promise<{ default: GameModule<Level> }>,
  'ice-drift': () => import('./iceDrift') as Promise<{ default: GameModule<Level> }>,
  aptitude: () => import('./aptitude') as Promise<{ default: GameModule<Level> }>,
  explainer: () => import('./explainer') as Promise<{ default: GameModule<Level> }>,
}

export async function loadGame(id: string): Promise<GameModule<Level>> {
  const l = loaders[id]
  if (!l) throw new Error('Unknown game ' + id)
  try {
    return (await l()).default
  } catch (e) {
    // An update replaced this game's file while the page was open. Progress is saved,
    // so reload into the new version instead of crashing.
    if (typeof location !== 'undefined' && /dynamically imported|Importing a module|Failed to fetch/i.test(String(e))) {
      location.reload()
      return new Promise<never>(() => {})
    }
    throw e
  }
}

export const GAME_IDS = Object.keys(loaders)
