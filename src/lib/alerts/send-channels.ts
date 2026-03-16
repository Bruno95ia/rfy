/**
 * Envio de alertas para canais configurados (email, Slack, webhook).
 * Chamado após avaliação de regras quando um alerta é disparado.
 */
import type { AdminDbClientType } from '@/lib/supabase/admin';
import { sendAlertEmail } from '@/lib/email/send';
import { withRetry } from '@/lib/retry';

export type AlertPayload = {
  titulo: string;
  mensagem: string;
  severidade: string;
  tipo: string;
  payload: Record<string, unknown>;
  generated_at: string | null;
};

type ChannelRow = {
  id: string;
  channel_type: string;
  target: string;
  config_json: Record<string, unknown>;
  is_active: boolean;
};

export async function sendAlertToChannels(
  admin: AdminDbClientType,
  channelIds: string[],
  payload: AlertPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (channelIds.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  const { data: channels } = await admin
    .from('alert_channels')
    .select('id, channel_type, target, config_json, is_active')
    .in('id', channelIds)
    .eq('is_active', true);

  const list = (channels ?? []) as ChannelRow[];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  const subject = `[RFY] ${payload.severidade.toUpperCase()}: ${payload.titulo}`;
  const bodyText = `${payload.titulo}\n\n${payload.mensagem}\n\nSeveridade: ${payload.severidade}\nTipo: ${payload.tipo}`;
  const webhookBody = {
    event: 'alert.triggered',
    severity: payload.severidade,
    title: payload.titulo,
    message: payload.mensagem,
    type: payload.tipo,
    payload: payload.payload,
    generated_at: payload.generated_at,
  };

  for (const ch of list) {
    if (!ch.is_active) continue;

    try {
      if (ch.channel_type === 'email') {
        const to = (ch.target || '').trim();
        if (!to) {
          errors.push(`Canal ${ch.id}: email vazio`);
          failed += 1;
          continue;
        }
        const result = await sendAlertEmail(to, subject, bodyText);
        if (result.ok) sent += 1;
        else {
          failed += 1;
          errors.push(`Email ${to}: ${result.error ?? 'erro'}`);
        }
        continue;
      }

      if (ch.channel_type === 'slack') {
        const url = (ch.target || (ch.config_json?.webhook_url as string) || '').trim();
        if (!url) {
          errors.push(`Canal ${ch.id}: Slack webhook URL vazia`);
          failed += 1;
          continue;
        }
        const slackPayload = {
          text: `*${payload.titulo}*\n${payload.mensagem}`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${payload.titulo}*` },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: payload.mensagem },
            },
          ],
        };
        const res = await withRetry(
          () =>
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(slackPayload),
            }),
          { maxAttempts: 2, baseMs: 500 }
        );
        if (res.ok) sent += 1;
        else {
          failed += 1;
          errors.push(`Slack ${url.slice(0, 30)}...: ${res.status}`);
        }
        continue;
      }

      if (ch.channel_type === 'webhook') {
        const url = (ch.target || '').trim();
        if (!url) {
          errors.push(`Canal ${ch.id}: webhook URL vazia`);
          failed += 1;
          continue;
        }
        const res = await withRetry(
          () =>
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookBody),
            }),
          { maxAttempts: 2, baseMs: 500 }
        );
        if (res.ok) sent += 1;
        else {
          failed += 1;
          errors.push(`Webhook ${url.slice(0, 30)}...: ${res.status}`);
        }
        continue;
      }

      if (ch.channel_type === 'whatsapp') {
        errors.push(`Canal ${ch.id}: WhatsApp não implementado`);
        failed += 1;
      }
    } catch (e) {
      failed += 1;
      errors.push(`Canal ${ch.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sent, failed, errors };
}
