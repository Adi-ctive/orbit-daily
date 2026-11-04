import { mount } from 'svelte'
import '@fontsource-variable/inter/index.css'
import './app.css'
import { initDev } from './lib/dev'
import { requestPersistence } from './lib/storage'
import { registerSW } from './lib/sw'

initDev(location.search)
void requestPersistence()

const target = document.getElementById('app')!

async function start() {
  if (__DEV_PANEL__ && location.pathname === '/dev/og') {
    const { default: OgBanner } = await import('./dev/OgBanner.svelte')
    mount(OgBanner, { target })
    return
  }
  if (__DEV_PANEL__ && location.pathname === '/dev/game') {
    const { default: GamePreview } = await import('./dev/GamePreview.svelte')
    mount(GamePreview, { target })
    return
  }
  const { default: App } = await import('./App.svelte')
  mount(App, { target })
  registerSW()
}

void start()
