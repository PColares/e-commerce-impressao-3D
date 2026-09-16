import { defineConfig, devices } from '@playwright/test'

const WEB_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3333/api'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Baselines de screenshot são sensíveis a fonte/renderização do SO. Os
  // commitados foram gerados no Windows; em outra plataforma, regenere com
  // --update-snapshots ou rode dentro da imagem oficial do Playwright.
  // Tolerância baixa de propósito: com 1% de folga uma mudança bem visível
  // (overlay do devtools, texto requebrando, card mudando de altura) passava
  // como "sem diferença". 200px absorve só ruído de antialiasing.
  expect: {
    toHaveScreenshot: { maxDiffPixels: 200 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  // Exige Postgres/Redis no ar: docker compose -f docker-compose.dev.yml up -d
  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: API_URL,
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter web dev',
      url: WEB_URL,
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Desliga o overlay do vue-devtools, que apareceria nos screenshots.
      env: { PLAYWRIGHT: '1' },
    },
  ],
})
