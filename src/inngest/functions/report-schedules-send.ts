/**
 * Job agendado: envia relatórios executivos por email conforme report_schedules.
 * Cron a cada hora; processa schedules com next_run_at <= now().
 */
import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { getExecutiveData, buildExecutiveCsv } from '@/lib/reports/executive-data';
import { computeNextRunAt } from '@/lib/reports/next-run';
import { sendReportEmail } from '@/lib/email/send';

type ScheduleRow = {
  id: string;
  org_id: string;
  name: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  hour_utc: number;
  minute_utc: number;
  timezone: string;
  recipients: string;
  format: string;
  is_active: boolean;
  next_run_at: string | null;
};

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const reportSchedulesSend = inngest.createFunction(
  {
    id: 'report-schedules-send',
    retries: 1,
  },
  { cron: '0 * * * *' },
  async () => {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: allSchedules } = await admin
      .from('report_schedules')
      .select('id, org_id, name, frequency, day_of_week, day_of_month, hour_utc, minute_utc, timezone, recipients, format, is_active, next_run_at')
      .eq('is_active', true);

    const schedules = (allSchedules ?? []).filter(
      (s) => s.next_run_at == null || s.next_run_at <= now
    );

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const row of schedules ?? []) {
      const s = row as unknown as ScheduleRow;
      let nextRun = s.next_run_at;

      if (!nextRun) {
        nextRun = computeNextRunAt(
          s.frequency as 'daily' | 'weekly' | 'monthly',
          s.day_of_week,
          s.day_of_month,
          s.hour_utc ?? 12,
          s.minute_utc ?? 0,
          s.timezone ?? 'America/Sao_Paulo'
        );
        await admin
          .from('report_schedules')
          .update({ next_run_at: nextRun, updated_at: new Date().toISOString() })
          .eq('id', s.id);
        results.push({ id: s.id, ok: true });
        continue;
      }

      const execData = await getExecutiveData(admin, s.org_id);
      const subject = `[RFY] ${s.name} — ${execData.generated_at ? new Date(execData.generated_at).toLocaleDateString('pt-BR') : 'Relatório'}`;
      const dashboardUrl = `${APP_BASE}/app/dashboard`;
      const html =
        `<p>Segue seu relatório executivo RFY.</p>` +
        `<p>RFY Index: ${execData.rfy_index_pct != null ? execData.rfy_index_pct.toFixed(1) : '—'}% | ` +
        `Receita confiável (30d): R$ ${execData.receita_confiavel_30d.toLocaleString('pt-BR')}</p>` +
        `<p><a href="${dashboardUrl}">Abrir dashboard</a></p>` +
        `<p>— RFY Revenue Engine</p>`;

      const recipients = s.recipients.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
      let sendOk = true;
      let lastError: string | undefined;

      for (const to of recipients) {
        if (!to) continue;
        const opts =
          s.format === 'csv'
            ? { csvContent: buildExecutiveCsv(execData), csvFilename: 'relatorio-executivo.csv' }
            : undefined;
        const result = await sendReportEmail(to, subject, html, opts);
        if (!result.ok) {
          sendOk = false;
          lastError = result.error;
        }
      }

      const nextRunAt = computeNextRunAt(
        s.frequency as 'daily' | 'weekly' | 'monthly',
        s.day_of_week,
        s.day_of_month,
        s.hour_utc ?? 12,
        s.minute_utc ?? 0,
        s.timezone ?? 'America/Sao_Paulo'
      );

      await admin
        .from('report_schedules')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRunAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', s.id);

      await admin.from('org_audit_logs').insert({
        org_id: s.org_id,
        action: sendOk ? 'report_schedule.sent' : 'report_schedule.send_failed',
        entity_type: 'report_schedules',
        entity_id: s.id,
        metadata_json: {
          schedule_name: s.name,
          recipients_count: recipients.length,
          error: lastError,
        },
      });

      results.push({ id: s.id, ok: sendOk, error: lastError });
    }

    return { processed: results.length, results };
  }
);
