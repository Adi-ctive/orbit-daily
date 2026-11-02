import { defineConfig, devices } from '@playwright/test'

// E2E runs against the e2e build (production build that keeps the dev panel).
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build:e2e && npx vite preview --port 4174 --strictPort --mode e2e',
    port: 4174,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'pixel7', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
})
