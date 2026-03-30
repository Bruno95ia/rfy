/**
 * Demonstração CFO «completa»: upload em Conhecimento → campanha SUPHO → síntese «Utilizar uploads» → cálculo ao vivo.
 * Gravar: npm run demo:video:cfo-live
 * Requer: conta demo (owner/admin/gestor), app e DB com perguntas SUPHO; opcional GOOGLE_AI_API_KEY para síntese Gemini.
 */
import path from 'path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FIXTURE_KNOWLEDGE = path.join(
  process.cwd(),
  'tests/e2e/fixtures/cfo-demo-org-context.md'
);

async function showBalloon(page: Page, pointLabel: string, body: string, durationMs = 8000) {
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

test.describe.configure({ mode: 'serial' });

test.describe('Demo CFO ao vivo (Conhecimento + SUPHO)', () => {
  test('documentos no repositório, síntese e resultado calculado', async ({ page }) => {
    test.setTimeout(1_200_000);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrar no RFY' })).toBeVisible();
    await showBalloon(
      page,
      'RFY · Demo ao vivo',
      'Subimos documentos ao Conhecimento, sintetizamos para a campanha e calculamos o diagnóstico — fluxo completo.',
      6500
    );

    await page.getByRole('button', { name: 'Usar credenciais demo' }).click();
    await pause(400);
    await Promise.all([
      page.waitForURL(/\/app\/dashboard/, { timeout: 120_000 }),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ]);
    await pause(1500);

    // --- Conhecimento: upload real ---
    await page.goto('/app/settings/conhecimento', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Repositório Conhecimento/i })).toBeVisible({
      timeout: 30_000,
    });

    const bloqueio = page.getByText(/Apenas proprietários, administradores ou gestores podem enviar/);
    const semPermissao = await bloqueio.isVisible().catch(() => false);
    test.skip(semPermissao, 'Conta demo sem papel de edição no repositório Conhecimento.');

    await showBalloon(
      page,
      'Repositório Conhecimento',
      'Enviamos um documento Markdown com contexto organizacional (políticas, dados, cultura) para alimentar o diagnóstico.',
      7500
    );

    const fileInput = page.locator('input[name="file"]');
    await expect(fileInput).toBeVisible();
    await fileInput.setInputFiles(FIXTURE_KNOWLEDGE);

    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Arquivo enviado').first()).toBeVisible({ timeout: 90_000 });
    await pause(2000);

    // --- Diagnóstico: campanha + respondente ---
    await page.goto('/app/supho/diagnostico', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Diagnóstico SUPHO/i })).toBeVisible({ timeout: 30_000 });

    const campaignName = `CFO ao vivo ${Date.now()}`;
    await page.getByPlaceholder('Nome da nova campanha').fill(campaignName);
    await page
      .locator('div.flex.gap-2')
      .filter({ has: page.getByPlaceholder('Nome da nova campanha') })
      .getByRole('button', { name: 'Nova' })
      .click();
    await expect(page.getByRole('button', { name: new RegExp(campaignName) })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: new RegExp(campaignName) }).click();
    await pause(800);

    const answerSelects = page.locator('select');
    await expect(answerSelects.first()).toBeVisible();
    const totalQuestions = await answerSelects.count();
    expect(totalQuestions).toBeGreaterThan(0);

    for (let i = 0; i < totalQuestions; i += 1) {
      await answerSelects.nth(i).selectOption('4');
    }

    await showBalloon(
      page,
      'Respostas SUPHO',
      'Registamos respostas Likert para permitir o cálculo de IC, IH, IP e ITSMO.',
      6500
    );

    await page.getByRole('button', { name: 'Adicionar respondente' }).click();
    await expect(page.getByText(/1 respondente\(s\)/i)).toBeVisible({ timeout: 60_000 });
    await pause(1500);

    // --- Síntese dos documentos do Conhecimento na campanha ---
    await showBalloon(
      page,
      'Síntese «Utilizar uploads»',
      'Agregamos os ficheiros da organização e desta campanha e geramos a síntese (Gemini se configurado no servidor).',
      8000
    );

    await page.getByRole('button', { name: 'Utilizar uploads' }).click();
    await expect(page.getByText('Repositório aplicado à campanha').first()).toBeVisible({
      timeout: 240_000,
    });
    await pause(2500);

    // --- Cálculo e painel ---
    await showBalloon(
      page,
      'Calcular resultado',
      'O motor consolida questionário, síntese de uploads e documentos no contexto do relatório executivo.',
      7000
    );

    await page.getByRole('button', { name: 'Calcular resultado' }).click();
    await expect(page).toHaveURL(/\/app\/supho\/maturidade/, { timeout: 120_000 });
    await pause(2000);

    await expect(
      page.getByText(/Painel de Maturidade|ITSMO|Nível/i).first()
    ).toBeVisible({ timeout: 30_000 });

    await showBalloon(
      page,
      'Resultado ao vivo',
      'Indicadores e narrativa refletem o ciclo completo: dados no Conhecimento, respostas SUPHO e síntese aplicada à campanha.',
      10000
    );
    await pause(3000);
  });
});
