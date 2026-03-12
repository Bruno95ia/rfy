import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateAlertsForOrg } from '@/lib/alerts/evaluate';

type AlertRow = {
  id: string;
  org_id: string;
  tipo: string;
  resolved_at: string | null;
};

function createAdminStub() {
  const alerts: AlertRow[] = [];
  const events: Array<{ id: string; rule_id: string }> = [];

  const admin: Partial<SupabaseClient> = {
    from(table: string) {
      if (table === 'reports') {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit() {
                        return {
                          maybeSingle: async () => ({
                            data: {
                              generated_at: '2026-02-24T10:00:00.000Z',
                              snapshot_json: { pipeline_value_open: 1000, max_days_without_activity: 2 },
                            },
                          }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        } as unknown as ReturnType<SupabaseClient['from']>;
      }

      if (table === 'alert_rules') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return Promise.resolve({
                      data: [
                        {
                          id: 'rule-1',
                          org_id: 'org-1',
                          rule_key: 'rfy_abaixo_do_limiar',
                          severity: 'high',
                          threshold: 80,
                          enabled: true,
                          cooldown_minutes: 0,
                          channel_ids: [],
                        },
                      ],
                    });
                  },
                };
              },
            };
          },
        } as unknown as ReturnType<SupabaseClient['from']>;
      }

      if (table === 'alerts') {
        return {
          select() {
            return {
              eq(_colA: string, orgId: string) {
                return {
                  eq(_colB: string, tipo: string) {
                    return {
                      is() {
                        return {
                          maybeSingle: async () => ({
                            data:
                              alerts.find((a) => a.org_id === orgId && a.tipo === tipo && a.resolved_at == null) ?? null,
                          }),
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert(payload: Record<string, unknown>) {
            alerts.push({
              id: `alert-${alerts.length + 1}`,
              org_id: String(payload.org_id),
              tipo: String(payload.tipo),
              resolved_at: null,
            });
            return Promise.resolve({ data: null });
          },
          update(payload: { resolved_at?: string }) {
            return {
              eq(_col: string, id: string) {
                const current = alerts.find((a) => a.id === id);
                if (current) current.resolved_at = payload.resolved_at ?? null;
                return Promise.resolve({ data: null });
              },
            };
          },
        } as unknown as ReturnType<SupabaseClient['from']>;
      }

      if (table === 'alert_events') {
        return {
          insert(payload: { rule_id: string }) {
            events.push({ id: `ev-${events.length + 1}`, rule_id: payload.rule_id });
            return {
              select() {
                return {
                  single: async () => ({ data: { id: events[events.length - 1]?.id } }),
                };
              },
            };
          },
        } as unknown as ReturnType<SupabaseClient['from']>;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    admin: admin as SupabaseClient,
    alerts,
    events,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('evaluateAlertsForOrg', () => {
  it('gera alerta sem duplicar e auto-resolve quando volta ao normal', async () => {
    const { admin, alerts, events } = createAdminStub();

    const forecast = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ forecast_adjusted: 500, pipeline_bruto: 1000 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ forecast_adjusted: 500, pipeline_bruto: 1000 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ forecast_adjusted: 900, pipeline_bruto: 1000 }), { status: 200 })
      );

    vi.stubGlobal('fetch', forecast as unknown as typeof fetch);

    const first = await evaluateAlertsForOrg(admin, 'org-1');
    expect(first.opened).toBe(1);
    expect(alerts).toHaveLength(1);
    expect(events).toHaveLength(1);

    const second = await evaluateAlertsForOrg(admin, 'org-1');
    expect(second.opened).toBe(0);
    expect(alerts).toHaveLength(1);
    expect(events).toHaveLength(1);

    const third = await evaluateAlertsForOrg(admin, 'org-1');
    expect(third.resolved).toBe(1);
    expect(alerts[0]?.resolved_at).not.toBeNull();
  });
});
