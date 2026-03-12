/**
 * Envio de email para alertas (Resend API).
 * Se RESEND_API_KEY não estiver definida, apenas loga (no-op).
 * Usa retry com backoff para falhas transitórias.
 */
import { withRetry } from '@/lib/retry';

const RESEND_API = 'https://api.resend.com/emails';
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alertas@rfy.local';
const FROM_NAME = process.env.ALERT_FROM_NAME ?? 'RFY Alertas';

export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn('[alerts] RESEND_API_KEY not set; skipping email to', to);
    return { ok: true };
  }

  try {
    const res = await withRetry(() =>
      fetch(RESEND_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [to],
          subject,
          text: body,
        }),
      }),
      { maxAttempts: 3, baseMs: 1000 }
    );

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}

/** Envio de relatório agendado (HTML + opcional anexo CSV). */
export async function sendReportEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  options?: { csvContent?: string; csvFilename?: string }
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn('[reports] RESEND_API_KEY not set; skipping email to', to);
    return { ok: true };
  }

  const payload: Record<string, unknown> = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html: bodyHtml,
  };
  if (options?.csvContent) {
    payload.attachments = [
      {
        filename: options.csvFilename ?? 'relatorio-executivo.csv',
        content: Buffer.from(options.csvContent, 'utf-8').toString('base64'),
      },
    ];
  }

  try {
    const res = await withRetry(
      () =>
        fetch(RESEND_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }),
      { maxAttempts: 3, baseMs: 1000 }
    );
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}

const INVITE_FROM_NAME = process.env.INVITE_FROM_NAME ?? process.env.ALERT_FROM_NAME ?? 'RFY';
const INVITE_FROM_EMAIL = process.env.INVITE_FROM_EMAIL ?? process.env.ALERT_FROM_EMAIL ?? 'convites@rfy.local';

/**
 * Envia email de convite para organização.
 * @param to - Email do convidado
 * @param orgName - Nome da organização
 * @param inviterName - Nome de quem convidou (ou email)
 * @param acceptUrl - URL completa para aceitar o convite (ex: https://app.exemplo.com/app/invite/accept?token=xxx)
 */
export async function sendInviteEmail(
  to: string,
  orgName: string,
  inviterName: string,
  acceptUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn('[invites] RESEND_API_KEY not set; skipping invite email to', to);
    return { ok: true };
  }

  const subject = `Convite para ${orgName} no RFY`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Convite RFY</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Olá,</p>
  <p><strong>${inviterName}</strong> convidou você para participar da organização <strong>${orgName}</strong> no RFY (Receita Confiável).</p>
  <p style="margin: 24px 0;">
    <a href="${acceptUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Aceitar convite</a>
  </p>
  <p style="font-size: 14px; color: #64748b;">Se você não esperava este convite, pode ignorar este e-mail. O link expira em 7 dias.</p>
  <p style="font-size: 12px; color: #94a3b8;">— RFY</p>
</body>
</html>`;

  const text = `${inviterName} convidou você para ${orgName} no RFY. Aceite em: ${acceptUrl}`;

  try {
    const res = await withRetry(
      () =>
        fetch(RESEND_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${INVITE_FROM_NAME} <${INVITE_FROM_EMAIL}>`,
            to: [to],
            subject,
            html,
            text,
          }),
        }),
      { maxAttempts: 3, baseMs: 1000 }
    );
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}
