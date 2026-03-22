/**
 * Grava um vídeo de demonstração (WebM) do fluxo principal RFY.
 *
 * Gerar: npm run demo:video
 * Saída: test-results/.../video.webm (ver mensagem final do script)
 *
 * Requer app acessível (ex.: npm run dev ou standalone na porta do E2E_BASE_URL).
 */
import { test, expect } from '@playwright/test';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe.configure({ mode: 'serial' });

test.describe('Demo RFY (vídeo)', () => {
  test('percurso: login demo → dashboard → uploads → mockup → integrações', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await pause(1800);

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(600);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 60_000 });
    await pause(2500);

    await page.mouse.wheel(0, 400);
    await pause(1500);

    await page.getByRole('link', { name: 'Uploads' }).first().click();
    await expect(page).toHaveURL(/\/app\/uploads/);
    await pause(2200);

    await page.goto('/mockup-rfy-ui-v2', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/RFY|Mockup|Torre/i);
    await pause(3000);

    await page.goto('/app/integracoes', { waitUntil: 'domcontentloaded' });
    await pause(2200);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(2000);
  });
});
