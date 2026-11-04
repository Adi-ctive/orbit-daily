/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte(),
    VitePWA({
      // 'prompt': a new version waits until src/lib/sw.ts sees no session running, then reloads.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'ORBIT: Daily Cosmic Brain Trainer',
        short_name: 'ORBIT',
        description: 'Fifteen minutes. One mission. Every day.',
        theme_color: '#04060c',
        background_color: '#04060c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only the Latin font files go into the offline cache.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/*latin-ext*'],
        navigateFallback: '/index.html',
        // The first install controls the open page at once, so it works offline without a reload.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    // Dev panel ships only in dev and in the e2e build mode.
    __DEV_PANEL__: JSON.stringify(mode !== 'production'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'pipeline/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
}))
