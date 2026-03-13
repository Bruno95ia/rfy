import { test, expect } from '@playwright/test';

test.describe('Fluxo SUPHO interno', () => {
  test('cria campanha, responde diagnóstico e abre painel de maturidade', async ({ page, request, context }) => {
    const email = `supho-e2e-${Date.now()}@example.com`;
    const password = 'Test123456!';
    const signupResponse = await request.post('/api/auth/signup', {
      form: {
        name: 'SUPHO E2E',
        email,
        password,
      },
    });
    expect(signupResponse.ok()).toBeTruthy();

    const setCookie = signupResponse.headers()['set-cookie'] ?? '';
    const sessionMatch = setCookie.match(/rfy_session=([^;]+)/);
    expect(sessionMatch).toBeTruthy();
    await context.addCookies([
      {
        name: 'rfy_session',
        value: sessionMatch![1],
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/app/supho/diagnostico');
    await expect(page.getByRole('heading', { name: /Diagnóstico SUPHO/i })).toBeVisible();

    const campaignName = `Campanha E2E ${Date.now()}`;
    await page.getByPlaceholder('Nome da nova campanha').fill(campaignName);
    await page.getByRole('button', { name: /Nova/i }).click();

    await expect(page.getByRole('button', { name: new RegExp(campaignName) })).toBeVisible();

    const answerSelects = page.locator('select');
    await expect(answerSelects.first()).toBeVisible();
    const totalQuestions = await answerSelects.count();
    expect(totalQuestions).toBeGreaterThan(0);

    for (let i = 0; i < totalQuestions; i += 1) {
      await answerSelects.nth(i).selectOption('4');
    }

    await page.getByRole('button', { name: /Adicionar respondente/i }).click();
    await expect(page.getByText(/1 respondente\(s\)/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Calcular resultado/i }).click();
    await page.waitForLoadState('networkidle');
    if (!/\/app\/supho\/maturidade/.test(page.url())) {
      await page.goto('/app/supho/maturidade');
    }

    const maturityContent = page.getByText(/ITSMO|Nível|Painel de Maturidade/i).first();
    await expect(maturityContent).toBeVisible({ timeout: 15000 });
  });
});
