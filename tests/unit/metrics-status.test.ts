import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMetricsStatus, nextMetricsVersion, touchMetricsStatus } from '@/lib/metrics/status';

function createAdminStub(options?: {
  currentVersion?: number | null;
  reportGeneratedAt?: string | null;
}) {
  let persistedVersion = options?.currentVersion ?? null;
  const reportGeneratedAt = options?.reportGeneratedAt ?? '2026-02-24T12:00:00.000Z';

  const admin: Partial<SupabaseClient> = {
    from(table: string) {
      if (table === 'metrics_status') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => {
                    if (persistedVersion == null) return { data: null };
                    return {
                      data: {
                        org_id: 'org-1',
                        version: persistedVersion,
                        last_updated_at: '2026-02-24T11:00:00.000Z',
                      },
                    };
                  },
                };
              },
            };
          },
          upsert(payload: { version?: number }) {
            persistedVersion = payload.version ?? persistedVersion;
            return Promise.resolve({ data: payload });
          },
        } as unknown as ReturnType<SupabaseClient['from']>;
      }

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
                            data: reportGeneratedAt
                              ? { generated_at: reportGeneratedAt }
                              : null,
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

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    admin: admin as SupabaseClient,
    getVersion: () => persistedVersion,
  };
}

describe('metrics status', () => {
  it('nextMetricsVersion inicia em 1 e incrementa', () => {
    expect(nextMetricsVersion(null)).toBe(1);
    expect(nextMetricsVersion(undefined)).toBe(1);
    expect(nextMetricsVersion(1)).toBe(2);
    expect(nextMetricsVersion(7)).toBe(8);
  });

  it('touchMetricsStatus incrementa versão persistida', async () => {
    const { admin, getVersion } = createAdminStub({ currentVersion: 3 });

    const result = await touchMetricsStatus(admin, 'org-1', '2026-02-24T12:10:00.000Z');

    expect(result.version).toBe(4);
    expect(result.org_id).toBe('org-1');
    expect(getVersion()).toBe(4);
  });

  it('getMetricsStatus usa fallback do último report quando status não existe', async () => {
    const { admin } = createAdminStub({ currentVersion: null, reportGeneratedAt: '2026-02-24T09:00:00.000Z' });

    const status = await getMetricsStatus(admin, 'org-1');

    expect(status.version).toBe(0);
    expect(status.last_updated_at).toBe('2026-02-24T09:00:00.000Z');
  });
});
