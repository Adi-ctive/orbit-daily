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
        theme_color: '#0b0820',
        background_color: '#0b0820',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/manifest.json', 'data/*-0.json'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
        // The first install controls the open page at once, so it works offline without a reload.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'orbit-data' },
          },
        ],
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
