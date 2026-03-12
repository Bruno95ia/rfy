import { test, expect } from '@playwright/test';

/**
 * E2E mínimo: login (conta demo) → dashboard carrega → navegação para SUPHO.
 * Garante que o fluxo crítico não quebra.
 */
test.describe('Fluxo login → dashboard → SUPHO', () => {
  test('login com demo, dashboard carrega e SUPHO está acessível', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /admin@demo\.rfy\.local/ })).toBeVisible();
    await page.getByRole('button', { name: /admin@demo\.rfy\.local/ }).click();
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/);
    await page.waitForLoadState('networkidle');

    const dashboardContent = page.getByRole('main').or(page.locator('[id="overview"]')).first();
    await expect(dashboardContent).toBeVisible({ timeout: 15000 });

    const hasRfyOrEmpty =
      (await page.getByText(/RFY Index|Seu workspace está pronto|Visão geral/i).count()) > 0;
    expect(hasRfyOrEmpty).toBe(true);

    await page.goto('/app/supho/maturidade');
    await page.waitForLoadState('networkidle');

    const suphoContent =
      page.getByText(/Maturidade|SUPHO|diagnóstico|Iniciar diagnóstico|Painel/i).first();
    await expect(suphoContent).toBeVisible({ timeout: 10000 });
  });
});
