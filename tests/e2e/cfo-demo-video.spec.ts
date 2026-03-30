/**
 * Demonstração para CFO: balões explicativos alinhados ao slide «Como o sistema atua na prática».
 * Gravar: npm run demo:video:cfo
 * Saída: docs/demo/rfy-cfo-demo.webm (via script)
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Balão fixo no ecrã (legível em 1280×720 gravado pelo Playwright). */
async function showBalloon(page: Page, pointLabel: string, body: string, durationMs = 9000) {
  await page.evaluate(
    ({ label, text }) => {
      const id = 'rfy-cfo-balloon';
      document.getElementById(id)?.remove();
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.setAttribute('role', 'status');
      wrap.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'left:50%',
        'transform:translateX(-50%)',
        'max-width:min(92vw,760px)',
        'z-index:2147483647',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:15px',
        'line-height:1.5',
        'background:linear-gradient(160deg,#1e293b 0%,#0f172a 100%)',
        'color:#f1f5f9',
        'padding:18px 22px',
        'border-radius:16px',
        'box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 0 1px rgba(99,102,241,.25)',
        'border:1px solid rgba(129,140,248,.35)',
      ].join(';');
      const kicker = document.createElement('div');
      kicker.textContent = label;
      kicker.style.cssText =
        'font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#a5b4fc;margin-bottom:10px;';
      const p = document.createElement('div');
      p.textContent = text;
      p.style.cssText = 'color:#e2e8f0;';
      wrap.appendChild(kicker);
      wrap.appendChild(p);
      document.body.appendChild(wrap);
    },
    { label: pointLabel, text: body }
  );
  await pause(durationMs);
  await page.evaluate(() => document.getElementById('rfy-cfo-balloon')?.remove());
}

async function slowScroll(page: Page, totalPx: number, stepPx = 120, delayMs = 320) {
  let scrolled = 0;
  while (scrolled < totalPx) {
    const step = Math.min(stepPx, totalPx - scrolled);
    await page.mouse.wheel(0, step);
    scrolled += step;
    await pause(delayMs);
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Demo CFO (balões + vídeo)', () => {
  test('percurso executivo com mensagens do slide', async ({ page }) => {
    test.setTimeout(900_000);

    // Abertura
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await showBalloon(
      page,
      'RFY · Apresentação CFO',
      'Demonstração focada em como o sistema atua na prática: consolidação, contexto de decisão, leitura gerencial e evidência.',
      7000
    );

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(800);
    await Promise.all([
      page.waitForURL(/\/app\/dashboard/, { timeout: 120_000 }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
    await pause(2000);

    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    // 1 — Torre / visão geral (consolidação + leitura)
    await showBalloon(
      page,
      '1 · Consolidação',
      'Consolida dados hoje dispersos em diferentes áreas, planilhas e sistemas.',
      9500
    );
    await scrollToOverview(page);
    await pause(2500);

    await showBalloon(
      page,
      '2 · Contexto de decisão',
      'Cruza sinais qualitativos e quantitativos para dar mais contexto às decisões.',
      9500
    );
    await slowScroll(page, 600, 100, 300);

    await showBalloon(
      page,
      '3 · Leitura gerencial',
      'Organiza leitura gerencial dos indicadores prioritários para diretoria, controller e lideranças.',
      9500
    );
    await slowScroll(page, 500, 90, 280);

    // Relatórios executivos
    await page.getByRole('link', { name: 'Relatórios' }).first().click();
    await expect(page).toHaveURL(/\/app\/reports/);
    await pause(2000);
    await showBalloon(
      page,
      '3 · Leitura gerencial (relatórios)',
      'Relatórios executivos consolidam a narrativa para diretoria e controladoria.',
      8500
    );
    await slowScroll(page, 400, 80, 280);

    // 4 — PAIP e rituais
    await page.getByRole('link', { name: 'PAIP' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/paip/);
    await pause(2000);
    await showBalloon(
      page,
      '4 · Prioridades e ciclos',
      'Acompanha prioridades, ocorrências, rituais, decisões e evolução dos ciclos.',
      9500
    );
    await slowScroll(page, 900, 90, 300);

    await page.getByRole('link', { name: 'Rituais' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/rituais/);
    await pause(2000);
    await showBalloon(
      page,
      '4 · Rituais',
      'Rituais e decisões estruturam o acompanhamento ao longo do tempo.',
      8000
    );
    await slowScroll(page, 700, 90, 300);

    // 5 — SUPHO (evidência)
    await page.getByRole('link', { name: 'Diagnóstico' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/diagnostico/);
    await pause(2000);
    await showBalloon(
      page,
      '5 · Evidência',
      'Ajuda a transformar percepção em evidência, reduzindo o peso do achismo na gestão.',
      9500
    );
    await slowScroll(page, 1000, 100, 300);

    await page.getByRole('link', { name: 'Painel de Maturidade' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/maturidade/);
    await pause(2000);
    await showBalloon(
      page,
      '5 · Diagnóstico organizacional',
      'SUPHO / ITSMO traduzem maturidade e contexto qualitativo em indicadores comparáveis.',
      8500
    );
    await slowScroll(page, 800, 90, 300);

    // 6 — Camada executiva (não só RH)
    await page.getByRole('link', { name: 'Pessoas' }).first().click();
    await expect(page).toHaveURL(/\/app\/pessoas/);
    await pause(2000);
    await showBalloon(
      page,
      '6 · Camada executiva integrada',
      'Serve como camada de leitura executiva integrada, e não como ferramenta restrita a RH ou a uma área isolada.',
      10000
    );
    await slowScroll(page, 500, 80, 280);

    await page.getByRole('link', { name: 'Integrações' }).first().click();
    await expect(page).toHaveURL(/\/app\/integracoes/);
    await pause(2000);
    await showBalloon(
      page,
      '1 · Dados e sistemas',
      'Integrações conectam CRM e dados operacionais à mesma visão da torre de controle.',
      8500
    );
    await slowScroll(page, 500, 80, 280);

    // Uso operacional (rodapé do slide)
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(2000);
    await showBalloon(
      page,
      'Uso operacional previsto',
      'Gestores, supervisores e lideranças utilizam o sistema no dia a dia. Colaboradores participam sobretudo através de links de diagnóstico nos ciclos planejados.',
      12000
    );

    await scrollToOverview(page);
    await pause(4000);
  });
});

async function scrollToOverview(page: Page) {
  const ov = page.locator('#overview');
  if ((await ov.count()) > 0) {
    await ov.first().scrollIntoViewIfNeeded().catch(() => {});
    await pause(3200);
    return;
  }
  await slowScroll(page, 500, 100, 300);
}
