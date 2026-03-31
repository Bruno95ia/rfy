/**
 * Demonstração CFO: ritmo mais pausado e ênfase nos resultados (Painel de Maturidade / ITSMO).
 * Gravar: npm run demo:video:cfo-results
 */
import path from 'path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function showBalloon(page: Page, pointLabel: string, body: string, durationMs = 6500) {
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
        'max-width:min(92vw,800px)',
        'z-index:2147483647',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:15px',
        'line-height:1.55',
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

/** Scroll mais lento para leitura do ecrã na gravação. */
async function slowScroll(page: Page, totalPx: number, stepPx = 110, delayMs = 155) {
  let scrolled = 0;
  while (scrolled < totalPx) {
    const step = Math.min(stepPx, totalPx - scrolled);
    await page.mouse.wheel(0, step);
    scrolled += step;
    await pause(delayMs);
  }
}

async function scrollToOverview(page: Page) {
  const ov = page.locator('#overview');
  if ((await ov.count()) > 0) {
    await ov.first().scrollIntoViewIfNeeded().catch(() => {});
    await pause(1400);
    return;
  }
  await slowScroll(page, 420);
}

const FIXTURE_KNOWLEDGE = path.join(process.cwd(), 'tests/e2e/fixtures/cfo-demo-org-context.md');

test.describe.configure({ mode: 'serial' });

test.describe('Demo CFO · ênfase em resultados', () => {
  test('fluxo completo com tempo no painel de maturidade', async ({ page }) => {
    test.setTimeout(1_200_000);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await showBalloon(
      page,
      'RFY · Resultados e maturidade',
      'Vamos percorrer a plataforma com ritmo mais pausado e dedicar tempo ao painel de resultados SUPHO/ITSMO após o cálculo.',
      6000
    );

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(500);
    await Promise.all([
      page.waitForURL(/\/app\/dashboard/, { timeout: 120_000 }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
    await pause(1100);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await showBalloon(
      page,
      '1–3 · Visão executiva',
      'Consolidação de dados, contexto para decisões e leitura gerencial dos indicadores prioritários.',
      5800
    );
    await scrollToOverview(page);
    await slowScroll(page, 520);

    await showBalloon(
      page,
      'Relatórios',
      'Relatórios executivos alinham narrativa e números para diretoria e controladoria.',
      5200
    );
    await page.getByRole('link', { name: 'Relatórios' }).first().click();
    await expect(page).toHaveURL(/\/app\/reports/);
    await pause(700);
    await slowScroll(page, 380);

    await showBalloon(
      page,
      '4 · Operação e rituais',
      'PAIP e rituais estruturam prioridades, ocorrências e cadência de decisões.',
      5600
    );
    await page.getByRole('link', { name: 'PAIP' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/paip/);
    await pause(600);
    await slowScroll(page, 420);
    await page.getByRole('link', { name: 'Rituais' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/rituais/);
    await pause(600);
    await slowScroll(page, 360);

    await page.goto('/app/settings/conhecimento', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Repositório Conhecimento/i })).toBeVisible({
      timeout: 30_000,
    });
    const bloqueio = page.getByText(/Apenas proprietários, administradores ou gestores podem enviar/);
    const semPermissao = await bloqueio.isVisible().catch(() => false);
    test.skip(semPermissao, 'Conta demo sem permissão no Conhecimento.');

    await showBalloon(
      page,
      'Conhecimento → diagnóstico',
      'Documentos alimentam o contexto qualitativo; na sequência, entram na síntese e no texto do resultado.',
      5800
    );
    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles(FIXTURE_KNOWLEDGE);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Arquivo enviado').first()).toBeVisible({ timeout: 90_000 });
    await pause(1200);

    await page.goto('/app/supho/diagnostico', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Diagnóstico SUPHO/i })).toBeVisible({ timeout: 30_000 });
    await showBalloon(
      page,
      '5 · Evidência (SUPHO)',
      'Respostas Likert alimentam IC, IH e IP; juntamente com a síntese dos uploads, produzem o ITSMO e o nível.',
      6200
    );

    const campaignName = `CFO resultados ${Date.now()}`;
    await page.getByPlaceholder('Nome da nova campanha').fill(campaignName);
    await page
      .locator('div.flex.gap-2')
      .filter({ has: page.getByPlaceholder('Nome da nova campanha') })
      .getByRole('button', { name: 'Nova' })
      .click();
    await expect(page.getByRole('button', { name: new RegExp(campaignName) })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: new RegExp(campaignName) }).click();
    await pause(600);

    const answerSelects = page.locator('select');
    await expect(answerSelects.first()).toBeVisible();
    const n = await answerSelects.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i += 1) {
      await answerSelects.nth(i).selectOption('4');
    }
    await page.getByRole('button', { name: 'Adicionar respondente' }).click();
    await expect(page.getByText(/1 respondente\(s\)/i)).toBeVisible({ timeout: 60_000 });
    await pause(900);

    await showBalloon(
      page,
      'Síntese para a campanha',
      '«Utilizar uploads» consolida o repositório Conhecimento; essa síntese entra no cálculo e na narrativa do resultado.',
      6200
    );
    await page.getByRole('button', { name: 'Utilizar uploads' }).click();
    await expect(page.getByText('Repositório aplicado à campanha').first()).toBeVisible({
      timeout: 240_000,
    });
    await pause(2200);

    await showBalloon(
      page,
      'Motor de cálculo',
      'Ao calcular, o sistema grava IC, IH, IP, ITSMO, nível, gaps e texto executivo — o que vê a seguir no painel.',
      6500
    );
    await page.getByRole('button', { name: 'Calcular resultado' }).click();
    await expect(page).toHaveURL(/\/app\/supho\/maturidade/, { timeout: 120_000 });
    await pause(2800);

    await expect(
      page.getByText(/Painel de Maturidade|ITSMO|Nível/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // —— Ênfase: resultados ——
    await showBalloon(
      page,
      'Resultados · índices principais',
      'Aqui concentram-se os outputs do diagnóstico: ITSMO composto, pilares IC/IH/IP, nível de maturidade e amostra — leitura única para diretoria.',
      10000
    );
    await slowScroll(page, 720);

    await showBalloon(
      page,
      'Resultados · leitura visual',
      'Radar e cartões traduzem o mesmo conjunto de números: comparação entre pilares e coerência com o relatório executivo.',
      9500
    );
    await slowScroll(page, 780);

    await showBalloon(
      page,
      'Resultados · lacunas e contexto',
      'Gaps e narrativa ligam o quantitativo ao qualitativo — incluindo contributo dos documentos quando integrados no cálculo.',
      10000
    );
    await slowScroll(page, 820);
    await page.locator('main').first().scrollIntoViewIfNeeded().catch(() => {});
    await pause(2500);

    await showBalloon(
      page,
      '6 · Além do painel',
      'Pessoas e integrações completam a torre: mesma organização, dados e papéis numa leitura executiva integrada.',
      6800
    );
    await page.getByRole('link', { name: 'Pessoas' }).first().click();
    await expect(page).toHaveURL(/\/app\/pessoas/);
    await pause(700);
    await slowScroll(page, 260);

    await page.getByRole('link', { name: 'Integrações' }).first().click();
    await expect(page).toHaveURL(/\/app\/integracoes/);
    await pause(700);
    await slowScroll(page, 240);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(800);
    await showBalloon(
      page,
      'Uso operacional',
      'Lideranças usam a ferramenta no dia a dia; colaboradores entram nos ciclos sobretudo pelos links de diagnóstico.',
      7200
    );
    await scrollToOverview(page);
    await pause(2200);
  });
});
