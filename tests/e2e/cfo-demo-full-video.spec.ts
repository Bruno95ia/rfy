/**
 * Demonstração CFO «completa e rápida»: tour slide 7 (compacto) + Conhecimento + SUPHO ao vivo.
 * Gravar: npm run demo:video:cfo-full
 */
import path from 'path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Balões mais curtos para vídeo total menor; texto mantém os pontos do slide. */
async function showBalloon(page: Page, pointLabel: string, body: string, durationMs = 4200) {
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

async function fastScroll(page: Page, totalPx: number, stepPx = 180, delayMs = 85) {
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
    await pause(900);
    return;
  }
  await fastScroll(page, 400);
}

const FIXTURE_KNOWLEDGE = path.join(process.cwd(), 'tests/e2e/fixtures/cfo-demo-org-context.md');

test.describe.configure({ mode: 'serial' });

test.describe('Demo CFO completo (rápido)', () => {
  test('slide 7 + conhecimento + diagnóstico ao vivo', async ({ page }) => {
    test.setTimeout(1_200_000);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await showBalloon(
      page,
      'RFY · CFO',
      'Visão executiva (slide 7) e, em seguida, documentos no Conhecimento com síntese e resultado SUPHO calculado ao vivo.',
      3800
    );

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(350);
    await Promise.all([
      page.waitForURL(/\/app\/dashboard/, { timeout: 120_000 }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
    await pause(600);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await showBalloon(
      page,
      '1–3 · Consolidação, contexto e leitura',
      'Consolida dados dispersos; cruza sinais qualitativos e quantitativos; prioriza indicadores para diretoria e controladoria.',
      4500
    );
    await scrollToOverview(page);
    await fastScroll(page, 450);

    await showBalloon(
      page,
      '3 · Relatórios',
      'Relatórios executivos consolidam a narrativa para diretoria e controladoria.',
      3800
    );
    await page.getByRole('link', { name: 'Relatórios' }).first().click();
    await expect(page).toHaveURL(/\/app\/reports/);
    await pause(500);
    await fastScroll(page, 320);

    await showBalloon(
      page,
      '4 · PAIP e rituais',
      'Prioridades, ocorrências, rituais e evolução dos ciclos — acompanhamento contínuo.',
      4000
    );
    await page.getByRole('link', { name: 'PAIP' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/paip/);
    await pause(400);
    await fastScroll(page, 380);
    await page.getByRole('link', { name: 'Rituais' }).first().click();
    await expect(page).toHaveURL(/\/app\/supho\/rituais/);
    await pause(400);
    await fastScroll(page, 320);

    // —— Conhecimento (upload real) ——
    await page.goto('/app/settings/conhecimento', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Repositório Conhecimento/i })).toBeVisible({
      timeout: 30_000,
    });
    const bloqueio = page.getByText(/Apenas proprietários, administradores ou gestores podem enviar/);
    const semPermissao = await bloqueio.isVisible().catch(() => false);
    test.skip(semPermissao, 'Conta demo sem permissão no Conhecimento.');

    await showBalloon(
      page,
      'Conhecimento',
      'Documentos da organização alimentam o diagnóstico (texto extraído de PDF, Word, Markdown, etc.).',
      3600
    );
    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles(FIXTURE_KNOWLEDGE);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Arquivo enviado').first()).toBeVisible({ timeout: 90_000 });
    await pause(600);

    // —— SUPHO ao vivo ——
    await page.goto('/app/supho/diagnostico', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Diagnóstico SUPHO/i })).toBeVisible({ timeout: 30_000 });
    await showBalloon(
      page,
      '5 · Evidência',
      'Questionário SUPHO transforma percepção em evidência; uploads entram na síntese e no cálculo.',
      4000
    );

    const campaignName = `CFO ${Date.now()}`;
    await page.getByPlaceholder('Nome da nova campanha').fill(campaignName);
    await page
      .locator('div.flex.gap-2')
      .filter({ has: page.getByPlaceholder('Nome da nova campanha') })
      .getByRole('button', { name: 'Nova' })
      .click();
    await expect(page.getByRole('button', { name: new RegExp(campaignName) })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: new RegExp(campaignName) }).click();
    await pause(400);

    const answerSelects = page.locator('select');
    await expect(answerSelects.first()).toBeVisible();
    const n = await answerSelects.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i += 1) {
      await answerSelects.nth(i).selectOption('4');
    }
    await page.getByRole('button', { name: 'Adicionar respondente' }).click();
    await expect(page.getByText(/1 respondente\(s\)/i)).toBeVisible({ timeout: 60_000 });
    await pause(500);

    await showBalloon(
      page,
      'Síntese dos uploads',
      '«Utilizar uploads» agrega o repositório Conhecimento nesta campanha (Gemini se houver chave no servidor).',
      3500
    );
    await page.getByRole('button', { name: 'Utilizar uploads' }).click();
    await expect(page.getByText('Repositório aplicado à campanha').first()).toBeVisible({
      timeout: 240_000,
    });
    await pause(800);

    await showBalloon(
      page,
      'ITSMO · cálculo',
      'Calcular resultado: IC, IH, IP e ITSMO com contexto dos documentos e da síntese.',
      3500
    );
    await page.getByRole('button', { name: 'Calcular resultado' }).click();
    await expect(page).toHaveURL(/\/app\/supho\/maturidade/, { timeout: 120_000 });
    await pause(700);
    await expect(
      page.getByText(/Painel de Maturidade|ITSMO|Nível/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await showBalloon(
      page,
      '5–6 · Maturidade e camada executiva',
      'SUPHO/ITSMO em indicadores comparáveis; leitura integrada para diretoria — não só RH.',
      4200
    );
    await fastScroll(page, 500);

    await page.getByRole('link', { name: 'Pessoas' }).first().click();
    await expect(page).toHaveURL(/\/app\/pessoas/);
    await pause(400);
    await showBalloon(page, '6 · Pessoas', 'Visão de pessoas e papéis na mesma torre de leitura.', 3200);
    await fastScroll(page, 280);

    await page.getByRole('link', { name: 'Integrações' }).first().click();
    await expect(page).toHaveURL(/\/app\/integracoes/);
    await pause(400);
    await showBalloon(
      page,
      'Dados e sistemas',
      'Integrações ligam CRM e operação à mesma visão consolidada.',
      3500
    );
    await fastScroll(page, 260);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await pause(500);
    await showBalloon(
      page,
      'Uso operacional',
      'Gestores e lideranças no dia a dia; colaboradores entram sobretudo por links de diagnóstico nos ciclos planejados.',
      5000
    );
    await scrollToOverview(page);
    await pause(1200);
  });
});
