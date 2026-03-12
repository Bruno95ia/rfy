/**
 * Calcula o próximo horário de execução para report_schedules.
 * Usa hour_utc e minute_utc como horário em UTC.
 */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export function computeNextRunAt(
  frequency: ScheduleFrequency,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hourUtc: number,
  minuteUtc: number,
  _timezone: string
): string {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hourUtc,
    minuteUtc,
    0,
    0
  ));

  if (frequency === 'daily') {
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.toISOString();
  }

  if (frequency === 'weekly') {
    const targetDay = dayOfWeek ?? 1; // 0 = domingo, 1 = segunda, ...
    const currentDay = now.getUTCDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0 && next.getTime() <= now.getTime()) daysAhead = 7;
    next.setUTCDate(now.getUTCDate() + daysAhead);
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 7);
    }
    return next.toISOString();
  }

  if (frequency === 'monthly') {
    const d = dayOfMonth ?? 1;
    next.setUTCDate(Math.min(d, 28));
    next.setUTCMonth(now.getUTCMonth());
    next.setUTCFullYear(now.getUTCFullYear());
    if (next.getTime() <= now.getTime()) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next.toISOString();
  }

  return next.toISOString();
}
