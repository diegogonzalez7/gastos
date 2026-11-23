import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4176/gastos/'
const launchOptions = { executablePath: process.env.CHROMIUM_PATH || undefined }

export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  reporter: 'list',
  use: {
    baseURL, locale: 'es-ES', timezoneId: 'Europe/Madrid',
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, launchOptions } },
    { name: 'móvil', use: { ...devices['Pixel 7'], browserName: 'chromium', launchOptions } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4176 --base /gastos/ --strictPort',
    url: baseURL,
    timeout: 60_000,
  },
})
