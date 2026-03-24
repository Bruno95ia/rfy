/**
 * Gravação lenta e completa: login demo, CSV de demonstração, espera pelo relatório,
 * torre de controle (secções com resultados), relatórios executivos, previsão, IA (benchmark + intervenções),
 * copiloto por conta, SUPHO, pessoas, integrações e mockup.
 *
 * Gerar: npm run demo:video
 * Saída: docs/demo/rfy-demo.webm
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FIXTURE_OPP = path.join(process.cwd(), 'tests/e2e/fixtures/demo-oportunidades.csv');
const FIXTURE_ACT = path.join(process.cwd(), 'tests/e2e/fixtures/demo-atividades.csv');

/** Rolagem gradual para o vídeo acompanhar o conteúdo */
async function slowScroll(page: Page, totalPx: number, stepPx = 100, delayMs = 280) {
  let scrolled = 0;
  while (scrolled < totalPx) {
    const step = Math.min(stepPx, totalPx - scrolled);
    await page.mouse.wheel(0, step);
    scrolled += step;
    await pause(delayMs);
  }
}

async function scrollToSelector(page: Page, sel: string, holdMs = 3200) {
  const loc = page.locator(sel).first();
  try {
    await loc.scrollIntoViewIfNeeded({ timeout: 12_000 });
  } catch {
    return;
  }
  await pause(holdMs);
}

/**
 * Aguarda o pipeline após o pacote demo (Inngest pode demorar).
 * Sucesso: relatório com KPIs OU dashboard com torre completa (#overview).
 */
async function waitForReportReady(page: Page, maxMs = 300_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await page.goto('/app/reports', { waitUntil: 'domcontentloaded' });
    const empty = await page.getByText('Nenhum relatório gerado ainda').isVisible().catch(() => false);
    if (!empty) {
      await expect(page.getByText('Pipeline aberto', { exact: true })).toBeVisible({ timeout: 30_000 });
      return true;
    }
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    if (await page.locator('#overview').isVisible().catch(() => false)) {
      return true;
    }
    await pause(5000);
  }
  return false;
}

test.describe.configure({ mode: 'serial' });

test.describe('Demo RFY (vídeo completo, lento)', () => {
  test('percurso completo com resultados de análise', async ({ page }) => {
    test.setTimeout(1_200_000);

    // --- Login demo ---
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await pause(2800);

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(900);
    await Promise.all([
      page.waitForURL(/\/app\/dashboard/, { timeout: 120_000 }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
    await pause(3500);

    // --- Primeira passagem no dashboard (vazio ou já com dados) ---
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    const emptyWorkspace = await page
      .getByText('Seu workspace está pronto', { exact: false })
      .isVisible()
      .catch(() => false);
    if (emptyWorkspace) {
      await pause(3500);
      await slowScroll(page, 700, 100, 280);
    } else {
      await scrollToSelector(page, '#overview', 4000);
      await scrollToSelector(page, '#decisions', 3200);
      await scrollToSelector(page, '#alerts', 2800);
      await slowScroll(page, 900, 90, 320);
    }

    // --- Uploads: pacote demo ---
    await page.getByRole('link', { name: 'Uploads' }).first().click();
    await expect(page).toHaveURL(/\/app\/uploads/);
    await expect(page.getByRole('heading', { name: 'Uploads', exact: true })).toBeVisible();
    await pause(2800);

    await page.locator('label:has-text("CSV de Oportunidades") input[type="file"]').setInputFiles(FIXTURE_OPP);
    await page.locator('label:has-text("CSV de Atividades") input[type="file"]').setInputFiles(FIXTURE_ACT);
    await pause(2200);

    await page.getByRole('button', { name: 'Processar demonstração completa' }).click();
    await expect(page.getByText('Demonstração enviada', { exact: true }).first()).toBeVisible({
      timeout: 120_000,
    });
    await pause(4500);

    // --- Esperar relatório e histórico de uploads ---
    const reportReady = await waitForReportReady(page);

    await page.getByRole('link', { name: 'Uploads' }).first().click();
    await expect(page).toHaveURL(/\/app\/uploads/);
    await page.getByRole('heading', { name: 'Histórico de uploads' }).scrollIntoViewIfNeeded();
    await pause(4500);
    await slowScroll(page, 500, 80, 300);

    // --- Dashboard: resultados por secção ---
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(4000);

    const dashboardSections = [
      '#overview',
      '#decisions',
      '#alerts',
      '#posicionamento',
      '#intervencoes',
      '#receita-declarada-vs-confiavel',
      '#deal-intelligence',
      '#supho',
      '#painel-executivo',
      '#bottleneck-vendedores',
      '#unit-economics-icp',
      '#status-ia',
      '#inteligencia-ia',
      '#advanced',
    ];
    for (const id of dashboardSections) {
      const exists = await page.locator(id).count();
      if (exists > 0) {
        await scrollToSelector(page, id, 3800);
      }
    }
    await slowScroll(page, 700, 100, 300);

    // --- Relatórios: resumo, ranking, evidências, pilares ---
    await page.getByRole('link', { name: 'Relatórios' }).first().click();
    await expect(page).toHaveURL(/\/app\/reports/);
    if (reportReady) {
      await expect(page.getByText('Pipeline aberto', { exact: true })).toBeVisible({ timeout: 30_000 });
      await pause(3500);

      for (const name of ['Resumo executivo', 'Ranking de fricções', 'Evidências', 'Pilares e impacto']) {
        await page.getByRole('link', { name, exact: true }).click();
        await pause(4200);
      }
      await page.goto('/app/reports#ranking-friccoes', { waitUntil: 'domcontentloaded' });
      await pause(2000);
      await slowScroll(page, 2800, 100, 300);
    } else {
      await pause(4000);
      await slowScroll(page, 500, 80, 280);
    }

    // --- Previsão (resultado JSON ou mensagem de serviço) ---
    await page.getByRole('link', { name: 'Previsão' }).first().click();
    await expect(page).toHaveURL(/\/app\/forecast/);
    await expect(page.getByRole('heading', { name: 'Previsão de fechamento' })).toBeVisible();
    await pause(3500);

    await page.getByRole('button', { name: 'Calcular previsão' }).click();
    await expect(
      page.locator('pre').first().or(page.getByText('Serviço de IA indisponível', { exact: true }))
    ).toBeVisible({ timeout: 60_000 });
    await pause(5000);
    await slowScroll(page, 500, 80, 280);

    // --- Inteligência IA: benchmark + intervenções (quando o serviço responde) ---
    await page.getByRole('link', { name: 'Inteligência IA' }).first().click();
    await expect(page).toHaveURL(/\/app\/ai/);
    await pause(4000);

    const benchmarkBtn = page.getByRole('button', { name: 'Executar benchmark' });
    if (await benchmarkBtn.isEnabled()) {
      await benchmarkBtn.click();
      await expect(page.locator('pre').first()).toBeVisible({ timeout: 90_000 });
      await pause(5000);
      await slowScroll(page, 400, 80, 280);
    } else {
      await scrollToSelector(page, '[role="status"]', 5000);
    }

    const intvBtn = page.getByRole('button', { name: 'Carregar intervenções' });
    if (await intvBtn.isEnabled()) {
      await intvBtn.click();
      await expect(page.locator('pre').last()).toBeVisible({ timeout: 90_000 });
      await pause(5000);
      await slowScroll(page, 600, 80, 280);
    }

    await slowScroll(page, 500, 80, 280);

    // --- Copiloto: conta com dados do CSV ---
    await page.getByRole('link', { name: 'Copiloto de contas' }).first().click();
    await expect(page).toHaveURL(/\/app\/copilot-contas/);
    await pause(3500);

    const accountSelect = page.locator('#account');
    if ((await accountSelect.count()) > 0 && (await accountSelect.locator('option').count()) > 1) {
      const firstValue = await accountSelect.locator('option').nth(1).getAttribute('value');
      if (firstValue) await accountSelect.selectOption(firstValue);
      await pause(2000);
    } else {
      await page.getByPlaceholder('Nome da empresa (se não estiver na lista)').fill('Atlas Energia');
      await pause(1500);
    }

    await page.getByRole('button', { name: 'Gerar próximos passos' }).click();
    await page
      .waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]');
          return btn != null && !btn.textContent?.includes('Gerando');
        },
        { timeout: 120_000 }
      )
      .catch(() => {});
    await pause(4000);
    await slowScroll(page, 1200, 90, 300);

    // --- SUPHO ---
    await page.getByRole('link', { name: 'Diagnóstico' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/diagnostico/);
    await expect(page.getByRole('heading', { name: 'Diagnóstico SUPHO' })).toBeVisible();
    await pause(3500);
    await slowScroll(page, 1400, 100, 300);

    await page.getByRole('link', { name: 'Painel de Maturidade' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/maturidade/);
    await pause(4000);
    await slowScroll(page, 1600, 100, 300);

    await page.getByRole('link', { name: 'PAIP' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/paip/);
    await pause(4000);
    await slowScroll(page, 1200, 100, 300);

    await page.getByRole('link', { name: 'Rituais' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/rituais/);
    await pause(4000);
    await slowScroll(page, 1200, 100, 300);

    await page.getByRole('link', { name: 'Certificação' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/certificacao/);
    await pause(4000);
    await slowScroll(page, 1200, 100, 300);

    // --- Pessoas ---
    await page.getByRole('link', { name: 'Pessoas' }).first().click();
    await expect(page).toHaveURL(/\/app\/pessoas/);
    await pause(3500);
    await slowScroll(page, 800, 90, 300);

    // --- Integrações ---
    await page.getByRole('link', { name: 'Integrações' }).first().click();
    await expect(page).toHaveURL(/\/app\/integracoes/);
    await pause(4000);
    await slowScroll(page, 900, 90, 300);

    // --- Configurações (visão geral, sem reset) ---
    await page.getByRole('link', { name: 'Configurações' }).first().click();
    await expect(page).toHaveURL(/\/app\/settings/);
    await pause(3500);
    await slowScroll(page, 1000, 90, 300);

    // --- Mockup ---
    await page.goto('/mockup-rfy-ui-v2', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/RFY|Mockup|Torre/i);
    await pause(5000);
    await slowScroll(page, 600, 80, 320);

    // --- Fecho: dashboard ---
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(3500);
    await scrollToSelector(page, '#overview', 5000);
    await slowScroll(page, 500, 90, 300);
  });
});
