import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /demo-rfy-video\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'demo-video',
      testMatch: /demo-rfy-video\.spec\.ts/,
      timeout: 1_200_000,
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        viewport: { width: 1280, height: 720 },
        /** Gravação mais lenta para narrar e acompanhar resultados no ecrã */
        launchOptions: { slowMo: 220 },
      },
    },
  ],
  // Reutiliza servidor já em :3000 (evita "port already in use" em CI ou host com app ativa).
  // Para forçar um servidor novo: pare o processo na porta ou use outra URL com E2E_BASE_URL.
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

