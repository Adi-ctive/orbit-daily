// Service worker registration with a safe update flow: a new version is applied
// only when no session is running (home, lock or stats), never mid-mission.
import { registerSW as register } from 'virtual:pwa-register'
import { app } from '../state/app.svelte'

export function registerSW(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  let pending: ((reload?: boolean) => Promise<void>) | null = null
  const tryApply = () => {
    if (!pending) return
    if (app.inRound || app.screen === 'session' || app.screen === 'debrief') return
    const go = pending
    pending = null
    void go(true)
  }
  const update = register({
    onNeedRefresh() {
      pending = update
      tryApply()
    },
    onOfflineReady() {
      app.showToast('Ready to fly offline.')
    },
    onRegisteredSW(_url, reg) {
      // Check for updates every hour while open.
      if (reg) setInterval(() => void reg.update().catch(() => {}), 3_600_000)
    },
  })
  setInterval(tryApply, 5000)
}
