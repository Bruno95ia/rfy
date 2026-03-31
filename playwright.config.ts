import { defineConfig, devices } from '@playwright/test';

/** Gravação 1920×1080; `--disable-dev-shm-usage` evita falhas de Chromium em Linux/servidor com /dev/shm pequeno (Docker, VPS). */
function demoVideoUse(slowMo: number) {
  return {
    ...devices['Desktop Chrome'],
    video: 'on' as const,
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo,
      args: ['--disable-dev-shm-usage'] as string[],
    },
  };
}

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
      testIgnore: /(demo-rfy-video|cfo-demo-video|cfo-demo-live-video|cfo-demo-full-video)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'demo-video',
      testMatch: /demo-rfy-video\.spec\.ts/,
      timeout: 1_200_000,
      use: {
        ...demoVideoUse(220),
      },
    },
    {
      name: 'cfo-video',
      testMatch: /cfo-demo-video\.spec\.ts/,
      timeout: 900_000,
      use: {
        ...demoVideoUse(260),
      },
    },
    {
      name: 'cfo-live-video',
      testMatch: /cfo-demo-live-video\.spec\.ts/,
      timeout: 1_200_000,
      use: {
        ...demoVideoUse(220),
      },
    },
    {
      name: 'cfo-full-video',
      testMatch: /cfo-demo-full-video\.spec\.ts/,
      timeout: 1_200_000,
      use: {
        /** Roteiro longo: slowMo baixo; balões já pausam leitura. */
        ...demoVideoUse(95),
      },
    },
  ],
  // Reutiliza servidor já em :3000 (evita "port already in use" em CI ou host com app ativa).
  // Para forçar um servidor novo: pare o processo na porta ou use outra URL com E2E_BASE_URL.
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    /** Em CI inicia sempre o servidor; localmente reutiliza se já estiver na porta. */
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

