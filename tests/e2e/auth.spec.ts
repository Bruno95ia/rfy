import { test, expect } from '@playwright/test';

test.describe('Fluxo de autenticação', () => {
  test('login renderiza corretamente e botão de demo preenche credenciais', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();

    await expect(page.getByLabel('Email')).toHaveValue('admin@demo.rfy.local');
    await expect(page.getByLabel('Senha')).toHaveValue('Adminrv');
  });

  test('signup permite navegar de volta para login', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Criar conta no RFY' })).toBeVisible();

    const loginLink = page.getByRole('link', { name: 'Entrar' });
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
