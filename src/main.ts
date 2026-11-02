import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initDev } from './lib/dev'
import { requestPersistence } from './lib/storage'

initDev(location.search)
void requestPersistence()

const app = mount(App, { target: document.getElementById('app')! })

export default app
