'use client';

import { useState, useEffect } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import {
  Building2,
  Sliders,
  Bell,
  Webhook,
  Save,
  Loader2,
  Check,
  ExternalLink,
  Copy,
  AlertCircle,
  Users,
  Database,
  Activity,
  KeyRound,
  ShieldAlert,
  FileClock,
  Goal,
  LineChart,
  Repeat,
  Search,
  LayoutGrid,
  RefreshCw,
  Mail,
  UserMinus,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const CRM_PROVIDERS = [
  { id: 'piperun', name: 'PipeRun', desc: 'Exportação CSV (atual)' },
  { id: 'pipedrive', name: 'Pipedrive', desc: 'API REST' },
  { id: 'hubspot', name: 'HubSpot', desc: 'API REST' },
  { id: 'n8n_webhook', name: 'n8n / Webhook', desc: 'Receber dados via HTTP POST' },
  { id: 'generic', name: 'API genérica', desc: 'Webhook customizado' },
] as const;

type Config = {
  org_display_name?: string | null;
  dias_proposta_risco?: number;
  dias_pipeline_abandonado?: number;
  dias_aging_inflado?: number;
  dias_aprovacao_travada?: number;
  notificar_email?: boolean;
  email_notificacoes?: string | null;
  incluir_convite_calendario?: boolean;
  top_deals_por_friccao?: number;
  top_evidencias_por_friccao?: number;
  timezone?: string | null;
  cac_manual?: number | null;
  marketing_spend_monthly?: number | null;
};

type SettingsData = {
  org: { id: string; name: string };
  webhookBaseUrl?: string;
  deployment?: {
    email_outbound_configured: boolean;
    inngest_configured: boolean;
  };
  role?: 'owner' | 'admin' | 'manager' | 'viewer';
  is_platform_admin?: boolean;
  config: Config | null;
  usage?: {
    uploads_30d: number;
    processed_uploads_30d: number;
    active_deals: number;
    users: number;
  };
  integrations: Array<{
    id: string;
    provider: string;
    webhook_enabled: boolean;
    last_sync_at: string | null;
    last_sync_status: string | null;
    is_active: boolean;
  }>;
  saas?: {
    role: 'owner' | 'admin' | 'manager' | 'viewer';
    plans: Array<{
      id: string;
      name: string;
      price_monthly: number;
      seats_limit: number;
      uploads_limit_30d: number;
      active_deals_limit: number;
      features_json: Record<string, unknown>;
    }>;
    subscription: { plan_id?: string | null } | null;
    limits: {
      seats_limit: number;
      uploads_limit_30d: number;
      active_deals_limit: number;
    };
    onboarding: Array<{ step_key: string; completed_at: string | null }>;
    api_keys: Array<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      created_at: string;
      last_used_at: string | null;
      revoked_at: string | null;
    }>;
    outbound_webhooks: Array<{
      id: string;
      name: string;
      target: string;
      events: string[];
      is_active: boolean;
      last_status: string | null;
      last_sent_at: string | null;
    }>;
    alert_channels: Array<{
      id: string;
      channel_type: string;
      target: string;
      is_active: boolean;
    }>;
    alert_rules: Array<{
      id: string;
      rule_key: string;
      severity: string;
      threshold: number | null;
      enabled: boolean;
    }>;
    report_schedules: Array<{
      id: string;
      name: string;
      frequency: string;
      is_active: boolean;
      recipients: string;
      next_run_at: string | null;
      format?: string;
      timezone?: string;
      hour_utc?: number;
      minute_utc?: number;
      day_of_week?: number | null;
      day_of_month?: number | null;
    }>;
    forecast_scenarios: Array<{
      id: string;
      name: string;
      is_default: boolean;
      assumptions_json: Record<string, unknown>;
    }>;
    quarterly_goals: Array<{
      id: string;
      year: number;
      quarter: number;
      target_revenue: number | null;
      target_win_rate: number | null;
      target_cycle_days: number | null;
    }>;
    latest_data_quality: {
      score: number;
      source_kind: string;
      created_at: string;
      issues_json: unknown[];
    } | null;
    retention_cohorts: Array<{
      cohort_month: string;
      segment: string;
      customers_start: number;
      customers_retained: number;
      retention_rate: number | null;
    }>;
  };
};

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'manager' | 'viewer'>('owner');
  const [integrationStatus, setIntegrationStatus] = useState<SettingsData['integrations'][number] | null>(null);
  const [usage, setUsage] = useState<NonNullable<SettingsData['usage']>>({
    uploads_30d: 0,
    processed_uploads_30d: 0,
    active_deals: 0,
    users: 0,
  });
  const [saas, setSaas] = useState<NonNullable<SettingsData['saas']>>({
    role: 'owner',
    plans: [],
    subscription: null,
    limits: { seats_limit: 8, uploads_limit_30d: 120, active_deals_limit: 500 },
    onboarding: [],
    api_keys: [],
    outbound_webhooks: [],
    alert_channels: [],
    alert_rules: [],
    report_schedules: [],
    forecast_scenarios: [],
    quarterly_goals: [],
    latest_data_quality: null,
    retention_cohorts: [],
  });

  const [orgName, setOrgName] = useState('');
  const [config, setConfig] = useState<Config>({
    dias_proposta_risco: 7,
    dias_pipeline_abandonado: 14,
    dias_aging_inflado: 60,
    dias_aprovacao_travada: 5,
    notificar_email: true,
    email_notificacoes: '',
    incluir_convite_calendario: true,
    top_deals_por_friccao: 20,
    top_evidencias_por_friccao: 10,
    timezone: 'America/Sao_Paulo',
    cac_manual: null,
    marketing_spend_monthly: null,
  });
  const [crmProvider, setCrmProvider] = useState<string>('n8n_webhook');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [orgId, setOrgId] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('Ingest API');
  const [newOutboundWebhookName, setNewOutboundWebhookName] = useState('Webhook principal');
  const [newOutboundWebhookUrl, setNewOutboundWebhookUrl] = useState('');
  const [newAlertChannelType, setNewAlertChannelType] = useState('email');
  const [newAlertChannelTarget, setNewAlertChannelTarget] = useState('');
  const [newAlertRuleKey, setNewAlertRuleKey] = useState('rfy_abaixo_do_limiar');
  const [newAlertRuleThreshold, setNewAlertRuleThreshold] = useState('10');
  const [newScheduleRecipients, setNewScheduleRecipients] = useState('');
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Resumo Executivo',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    day_of_week: 1,
    day_of_month: 1,
    hour_utc: 12,
    minute_utc: 0,
    timezone: 'America/Sao_Paulo',
    recipients: '',
    format: 'link' as 'pdf' | 'csv' | 'link',
    is_active: true,
  });
  const [newScenarioName, setNewScenarioName] = useState('Cenário Base');
  const [newScenarioAssumptions, setNewScenarioAssumptions] = useState(
    '{"win_rate_delta":0,"cycle_days_delta":0}'
  );
  const [goalYear, setGoalYear] = useState(String(new Date().getFullYear()));
  const [goalQuarter, setGoalQuarter] = useState('1');
  const [goalRevenue, setGoalRevenue] = useState('');
  const [retentionMonth, setRetentionMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  );
  const [retentionStart, setRetentionStart] = useState('100');
  const [retentionRetained, setRetentionRetained] = useState('85');
  const [qualityScore, setQualityScore] = useState('92');
  const [panelSection, setPanelSection] = useState<'all' | 'overview' | 'saas' | 'org' | 'crm' | 'members'>('all');
  const [panelSearch, setPanelSearch] = useState('');
  const [resetDemoLoading, setResetDemoLoading] = useState(false);
  const [resetDemoError, setResetDemoError] = useState<string | null>(null);
  const [resetDemoSuccess, setResetDemoSuccess] = useState(false);
  const [alertEvents, setAlertEvents] = useState<Array<{ id: string; rule_id: string; severity: string; payload_json: Record<string, unknown>; status: string; created_at: string }>>([]);
  const [members, setMembers] = useState<Array<{ user_id: string; role: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; role: string; expires_at: string; created_at: string }>>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'viewer'>('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState<string | null>(null);
  const [people, setPeople] = useState<
    Array<{
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      company_name: string | null;
      person_type: string;
      department: string | null;
      seniority: string | null;
      role_title: string | null;
      persona_tag: string | null;
      is_key_contact: boolean;
    }>
  >([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonRoleTitle, setNewPersonRoleTitle] = useState('');
  const [newPersonType, setNewPersonType] = useState<
    'decision_maker' | 'economic_buyer' | 'champion' | 'user' | 'influencer' | 'stakeholder' | 'finance' | 'procurement' | 'other'
  >('stakeholder');
  const [newPersonDept, setNewPersonDept] = useState('');
  const [newPersonSeniority, setNewPersonSeniority] = useState<
    'c_level' | 'vp' | 'director' | 'manager' | 'analyst' | 'other'
  >('other');
  const [newPersonKey, setNewPersonKey] = useState(false);
  const [newPersonPersonaTag, setNewPersonPersonaTag] = useState('');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformUsers, setPlatformUsers] = useState<
    Array<{ id: string; email: string; created_at: string; is_active: boolean; is_platform_admin: boolean }>
  >([]);
  const [platformUsersLoading, setPlatformUsersLoading] = useState(false);
  const [platformUsersError, setPlatformUsersError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<NonNullable<SettingsData['deployment']>>({
    email_outbound_configured: true,
    inngest_configured: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings');
      const d = (await res.json()) as SettingsData & { error?: string };
      if (!res.ok) {
        throw new Error(d.error ?? 'Erro ao carregar configurações');
      }
      if (d.deployment) {
        setDeployment(d.deployment);
      }
      setOrgName(d.org?.name ?? '');
      if (d.config) {
        setConfig((c) => ({ ...c, ...d.config }));
      }
      setRole(d.role ?? 'owner');
      setIsPlatformAdmin(Boolean(d.is_platform_admin));
      setIntegrationStatus(
        d.integrations?.find((i: SettingsData['integrations'][number]) => i.is_active) ?? null
      );
      if (d.usage) setUsage(d.usage);
      if (d.saas) {
        setSaas(d.saas);
      }
      setWebhookUrl(d.webhookBaseUrl || `${window.location.origin}/api/crm/piperun/webhook`);
      const oid = d.org?.id ?? '';
      setOrgId(oid);
      if (oid) {
        try {
          const evRes = await fetch(`/api/alerts/events?org_id=${encodeURIComponent(oid)}&limit=10`);
          const evData = (await evRes.json()) as { events?: typeof alertEvents };
          setAlertEvents(evData.events ?? []);
        } catch {
          setAlertEvents([]);
        }
        try {
          const [memRes, invRes] = await Promise.all([
            fetch(`/api/org/members?org_id=${encodeURIComponent(oid)}`),
            fetch(`/api/org/invites?org_id=${encodeURIComponent(oid)}`),
          ]);
          const memData = (await memRes.json()) as { members?: Array<{ user_id: string; role: string }>; current_user_id?: string };
          const invData = (await invRes.json()) as { invites?: Array<{ id: string; email: string; role: string; expires_at: string; created_at: string }> };
          setMembers(memData.members ?? []);
          setCurrentUserId(memData.current_user_id ?? null);
          setPendingInvites(invData.invites ?? []);
        } catch {
          setMembers([]);
          setPendingInvites([]);
        }
        try {
          setPeopleLoading(true);
          const peopleRes = await fetch(`/api/org/people?org_id=${encodeURIComponent(oid)}`);
          const peopleData = (await peopleRes.json()) as {
            people?: Array<{
              id: string;
              full_name: string;
              email: string | null;
              phone: string | null;
              company_name: string | null;
              person_type: string;
              department: string | null;
              seniority: string | null;
              role_title: string | null;
              persona_tag: string | null;
              is_key_contact: boolean;
            }>;
          };
          setPeople(peopleData.people ?? []);
        } catch {
          setPeople([]);
        } finally {
          setPeopleLoading(false);
        }
      }

      if (d.is_platform_admin) {
        try {
          setPlatformUsersLoading(true);
          setPlatformUsersError(null);
          const adminRes = await fetch('/api/admin/users');
          const adminData = (await adminRes.json()) as {
            users?: Array<{
              id: string;
              email: string;
              created_at: string;
              is_active: boolean;
              is_platform_admin: boolean;
            }>;
            error?: string;
          };
          if (!adminRes.ok) {
            throw new Error(adminData.error ?? 'Erro ao carregar usuários da plataforma');
          }
          setPlatformUsers(adminData.users ?? []);
        } catch (e) {
          setPlatformUsersError(e instanceof Error ? e.message : 'Erro ao carregar usuários da plataforma');
          setPlatformUsers([]);
        } finally {
          setPlatformUsersLoading(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    trackScreen('settings');
  }, []);

  const save = async (section: string, payload: Record<string, unknown>) => {
    setSaving(section);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data: payload }),
      });
      const parsed = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parsed.error ?? 'Erro ao salvar');
      }
      setSaved(section);
      setTimeout(() => setSaved(null), 2000);
      return parsed as Record<string, unknown>;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(null);
    }
    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSaved('copy');
    setTimeout(() => setSaved(null), 1500);
  };

  const resetDemoBase = async () => {
    if (!confirm('Zerar e recarregar a base de demonstração? Todos os dados de demonstração serão substituídos pelo seed padrão.')) return;
    setResetDemoLoading(true);
    setResetDemoError(null);
    setResetDemoSuccess(false);
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Erro ao zerar base');
      setResetDemoSuccess(true);
      setTimeout(() => setResetDemoSuccess(false), 4000);
      await loadSettings();
    } catch (e) {
      setResetDemoError(e instanceof Error ? e.message : 'Erro ao zerar base');
    } finally {
      setResetDemoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-center text-sm text-red-600">{error}</p>
        <Button variant="outline" onClick={() => loadSettings()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const currentPlan =
    saas.plans.find((p) => p.id === saas.subscription?.plan_id) ?? saas.plans[0];
  const planName = currentPlan?.name ?? 'Starter';
  const planLimits = {
    users: saas.limits.seats_limit ?? currentPlan?.seats_limit ?? 8,
    uploads30d: saas.limits.uploads_limit_30d ?? currentPlan?.uploads_limit_30d ?? 120,
    activeDeals: saas.limits.active_deals_limit ?? currentPlan?.active_deals_limit ?? 500,
  };
  const uploadsPct = Math.min(
    100,
    (usage.uploads_30d / Math.max(1, planLimits.uploads30d)) * 100
  );
  const usersPct = Math.min(
    100,
    (usage.users / Math.max(1, planLimits.users)) * 100
  );
  const canManage = role === 'owner' || role === 'admin';
  const searchTokens = panelSearch
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const shouldShow = (
    section: 'overview' | 'saas' | 'org' | 'crm' | 'members',
    tags: string[]
  ) => {
    if (panelSection !== 'all' && panelSection !== section) return false;
    if (searchTokens.length === 0) return true;
    const haystack = tags.join(' ').toLowerCase();
    return searchTokens.every((token) => haystack.includes(token));
  };
  const alertRuleLabel = (key: string) => {
    if (key === 'rfy_abaixo_do_limiar' || key === 'rfy_index_below') {
      return 'RFY abaixo do limiar';
    }
    if (
      key === 'receita_inflada_acima_do_limiar' ||
      key === 'receita_inflada_above'
    ) {
      return 'Receita Inflada acima do limiar';
    }
    if (key === 'pipeline_stagnation') {
      return 'Pipeline estagnado';
    }
    return key;
  };
  const hasVisibleCards =
    shouldShow('overview', ['organização', 'integração', 'plano', 'sync', 'visão geral']) ||
    shouldShow('overview', ['plano', 'uso', 'uploads', 'assentos', 'deals']) ||
    shouldShow('saas', ['saas', 'billing', 'api keys', 'webhooks', 'alertas']) ||
    shouldShow('org', ['organização', 'nome']) ||
    shouldShow('org', ['limiares', 'fricção', 'pipeline', 'cac', 'marketing']) ||
    shouldShow('org', ['notificações', 'email', 'timezone', 'fuso']) ||
    shouldShow('crm', ['crm', 'webhook', 'integração', 'piperun', 'hubspot', 'pipedrive']) ||
    shouldShow('members', ['membros', 'convites', 'convite', 'equipe']);

  return (
    <div className="space-y-8">
      {canManage && !deployment.email_outbound_configured && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-medium">E-mail de saída não configurado no servidor</p>
              <p className="mt-1 text-amber-900/90">
                Alertas por e-mail, convites a membros, relatórios agendados e notificações de formulários não serão
                enviados até existir <code className="rounded bg-amber-100/80 px-1">RESEND_API_KEY</code> nas variáveis
                de ambiente. Os fluxos na aplicação continuam a funcionar; apenas o envio real de correio fica em falta.
              </p>
            </div>
          </div>
        </div>
      )}
      {canManage && !deployment.inngest_configured && (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
          role="status"
        >
          <div className="flex gap-2">
            <Activity className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
            <div>
              <p className="font-medium">Jobs assíncronos (Inngest) não configurados</p>
              <p className="mt-1 text-slate-700">
                Processamento em fila (CSV, relatórios recalculados, etc.) pode depender do Inngest em produção.
                Defina <code className="rounded bg-white px-1">INNGEST_SIGNING_KEY</code> e{' '}
                <code className="rounded bg-white px-1">INNGEST_EVENT_KEY</code> conforme o ambiente. Em desenvolvimento
                pode usar o Inngest Dev Server.
              </p>
            </div>
          </div>
        </div>
      )}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelSection('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium',
                panelSection === 'all'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tudo
            </button>
            {[
              { key: 'overview', label: 'Visão geral' },
              { key: 'saas', label: 'SaaS' },
              { key: 'org', label: 'Organização' },
              { key: 'crm', label: 'Integrações' },
              { key: 'members', label: 'Membros' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setPanelSection(item.key as 'overview' | 'saas' | 'org' | 'crm' | 'members')
                }
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium',
                  panelSection === item.key
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Buscar campos: plano, webhook, alerta, CAC..."
              className="pl-9"
            />
          </div>
          {!canManage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Seu perfil é <strong>{role}</strong>. Este painel está em modo leitura para ações de gestão.
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {shouldShow('overview', [
        'organização',
        'integração',
        'plano',
        'sync',
        'visão geral',
      ]) && <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Organização
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{orgName || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Integração ativa
            </p>
            {integrationStatus ? (
              <Badge variant={integrationStatus.is_active ? 'success' : 'warning'} className="mt-1">
                {integrationStatus.provider}
              </Badge>
            ) : (
              <Badge variant="warning" className="mt-1">
                Não configurada
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Plano
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="primary">{planName}</Badge>
              <span className="text-xs text-slate-500">pricing-ready</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Último sync
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {integrationStatus?.last_sync_at
                ? new Date(integrationStatus.last_sync_at).toLocaleString('pt-BR')
                : 'Sem execução registrada'}
            </p>
          </div>
        </CardContent>
      </Card>}

      {shouldShow('overview', [
        'plano',
        'uso',
        'uploads',
        'assentos',
        'deals',
      ]) && <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano e uso</CardTitle>
          <p className="text-sm text-slate-500">
            Estrutura pronta para evolução de cobrança por volume e assentos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Uploads (30 dias)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {usage.uploads_30d}/{planLimits.uploads30d}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Usuários ativos</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {usage.users}/{planLimits.users}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Deals ativos</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {usage.active_deals}/{planLimits.activeDeals}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" />
                  Uploads
                </span>
                <span>{uploadsPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${uploadsPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Assentos
                </span>
                <span>{usersPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${usersPct}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                {usage.processed_uploads_30d} upload(s) processado(s) com sucesso nos últimos 30 dias.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>}

      {shouldShow('saas', [
        'saas',
        'billing',
        'api keys',
        'webhooks',
        'alertas',
        'onboarding',
        'cenários',
        'metas',
        'retenção',
      ]) && <Card>
        <CardHeader>
          <CardTitle className="text-base">SaaS Control Tower</CardTitle>
          <p className="text-sm text-slate-500">
            Billing, segurança, alertas, automações, cenários e saúde de dados.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset disabled={!canManage} className={cn(!canManage && 'opacity-75')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Perfil de acesso</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{role}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">API keys ativas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {saas.api_keys.filter((k) => !k.revoked_at).length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Webhooks outbound ativos</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {saas.outbound_webhooks.filter((w) => w.is_active).length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-500">Regras de alerta ativas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {saas.alert_rules.filter((r) => r.enabled).length}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Database className="h-4 w-4 text-indigo-600" />
                Planos e limites
              </p>
              <div className="flex flex-wrap gap-2">
                {saas.plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={async () => {
                      await save('plan', { plan_id: plan.id });
                      await loadSettings();
                    }}
                    disabled={saving === 'plan'}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm transition',
                      saas.subscription?.plan_id === plan.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {plan.name} • R$ {Number(plan.price_monthly).toFixed(0)}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                <p className="rounded-lg bg-slate-50 px-2 py-1">Assentos: {planLimits.users}</p>
                <p className="rounded-lg bg-slate-50 px-2 py-1">Uploads/30d: {planLimits.uploads30d}</p>
                <p className="rounded-lg bg-slate-50 px-2 py-1">Deals ativos: {planLimits.activeDeals}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <KeyRound className="h-4 w-4 text-indigo-600" />
                API Keys
              </p>
              <div className="flex gap-2">
                <Input
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="Nome da API key"
                />
                <Button
                  size="sm"
                  disabled={saving === 'api_key_create'}
                  onClick={async () => {
                    const res = await save('api_key_create', {
                      name: newApiKeyName,
                      scopes: ['ingest:write', 'reports:read'],
                    });
                    if (res?.api_key && typeof res.api_key === 'string') {
                      setGeneratedApiKey(res.api_key);
                    }
                    await loadSettings();
                  }}
                >
                  Gerar
                </Button>
              </div>
              {generatedApiKey && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                  <p className="font-medium text-amber-800">Copie agora (exibida uma única vez):</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="max-w-[280px] truncate rounded bg-white px-2 py-1 text-amber-900">
                      {generatedApiKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedApiKey)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {saas.api_keys.slice(0, 5).map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <span className="text-slate-700">
                      {k.name} • {k.key_prefix}***
                      {k.revoked_at && <span className="ml-2 text-red-600">(revogada)</span>}
                    </span>
                    {!k.revoked_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await save('api_key_revoke', { id: k.id });
                          await loadSettings();
                        }}
                      >
                        Revogar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Webhook className="h-4 w-4 text-indigo-600" />
                Webhooks Outbound
              </p>
              <Input
                value={newOutboundWebhookName}
                onChange={(e) => setNewOutboundWebhookName(e.target.value)}
                placeholder="Nome do webhook"
              />
              <Input
                value={newOutboundWebhookUrl}
                onChange={(e) => setNewOutboundWebhookUrl(e.target.value)}
                placeholder="https://seu-endpoint.com/events"
              />
              <Button
                size="sm"
                disabled={saving === 'webhook_create'}
                onClick={async () => {
                  await save('webhook_create', {
                    name: newOutboundWebhookName,
                    target_url: newOutboundWebhookUrl,
                    events: ['report.generated', 'alert.triggered'],
                  });
                  await loadSettings();
                }}
              >
                Criar webhook
              </Button>
              <div className="space-y-2">
                {saas.outbound_webhooks.slice(0, 5).map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <span className="text-slate-700">
                      {w.name} • {w.target}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await save('webhook_toggle', { id: w.id, is_active: !w.is_active });
                        await loadSettings();
                      }}
                    >
                      {w.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldAlert className="h-4 w-4 text-indigo-600" />
                Alertas no painel
              </p>
              <p className="text-xs text-slate-500">
                Nesta fase, os alertas são registrados e exibidos no dashboard (sem envio por email).
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={newAlertChannelType}
                  onChange={(e) => setNewAlertChannelType(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="email">email</option>
                  <option value="slack">slack</option>
                  <option value="webhook">webhook</option>
                  <option value="whatsapp">whatsapp</option>
                </select>
                <Input
                  value={newAlertChannelTarget}
                  onChange={(e) => setNewAlertChannelTarget(e.target.value)}
                  placeholder="canal@empresa.com / URL"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await save('alert_channel_create', {
                      channel_type: newAlertChannelType,
                      target: newAlertChannelTarget,
                    });
                    setNewAlertChannelTarget('');
                    await loadSettings();
                  }}
                >
                  Criar canal
                </Button>
                <select
                  value={newAlertRuleKey}
                  onChange={(e) => setNewAlertRuleKey(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="rfy_abaixo_do_limiar">RFY Index abaixo de</option>
                  <option value="receita_inflada_acima_do_limiar">Receita Inflada acima de</option>
                  <option value="rfy_index_below">RFY Index abaixo de (legado)</option>
                  <option value="receita_inflada_above">Receita Inflada acima de (legado)</option>
                  <option value="pipeline_stagnation">Estagnação pipeline (dias)</option>
                </select>
                <Input
                  type="number"
                  value={newAlertRuleThreshold}
                  onChange={(e) => setNewAlertRuleThreshold(e.target.value)}
                  placeholder="limiar"
                  className="w-24"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await save('alert_rule_create', {
                      rule_key: newAlertRuleKey,
                      threshold: Number(newAlertRuleThreshold) || 0,
                      severity: 'high',
                    });
                    setNewAlertRuleThreshold('10');
                    await loadSettings();
                  }}
                >
                  Criar regra
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Canais</p>
                  <ul className="space-y-1 text-sm">
                    {saas.alert_channels.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1">
                        <span>{c.channel_type}: {c.target}</span>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              const r = await fetch(`/api/alerts/channels/${c.id}?org_id=${encodeURIComponent(orgId)}`, { method: 'DELETE' });
                              if (r.ok) await loadSettings();
                            }}
                          >
                            Excluir
                          </Button>
                        )}
                      </li>
                    ))}
                    {saas.alert_channels.length === 0 && <li className="text-slate-500">Nenhum canal</li>}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Regras</p>
                  <ul className="space-y-1 text-sm">
                    {saas.alert_rules.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1">
                        <span>
                          {alertRuleLabel(r.rule_key)} (limiar: {r.threshold ?? '—'}){' '}
                          {!r.enabled && <em className="text-slate-500">(desativada)</em>}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={async () => {
                                const limiarAtual = r.threshold != null ? String(r.threshold) : '0';
                                const novoLimiar = window.prompt('Novo limiar da regra:', limiarAtual);
                                if (novoLimiar == null) return;
                                const parsed = Number(novoLimiar);
                                if (Number.isNaN(parsed)) return;
                                await fetch(`/api/alerts/rules/${r.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ org_id: orgId, threshold: parsed }),
                                });
                                await loadSettings();
                              }}
                            >
                              Editar limiar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={async () => {
                                await fetch(`/api/alerts/rules/${r.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ org_id: orgId, enabled: !r.enabled }),
                                });
                                await loadSettings();
                              }}
                            >
                              {r.enabled ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              const res = await fetch(`/api/alerts/rules/${r.id}?org_id=${encodeURIComponent(orgId)}`, { method: 'DELETE' });
                              if (res.ok) await loadSettings();
                            }}
                          >
                            Excluir
                          </Button>
                        )}
                      </li>
                    ))}
                    {saas.alert_rules.length === 0 && <li className="text-slate-500">Nenhuma regra</li>}
                  </ul>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Eventos recentes (in-app)</p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                  {alertEvents.map((e) => (
                    <li key={e.id} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-slate-700">
                      {(e.payload_json?.message as string) ?? e.severity} — {new Date(e.created_at).toLocaleString('pt-BR')}
                    </li>
                  ))}
                  {alertEvents.length === 0 && <li className="text-slate-500">Nenhum evento recente</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileClock className="h-4 w-4 text-indigo-600" />
                Relatórios agendados
              </p>
              <p className="text-xs text-slate-500">
                Agendamentos ativos: {saas.report_schedules.filter((r) => r.is_active).length}
              </p>
              <ul className="space-y-2">
                {saas.report_schedules.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span className="text-slate-500">
                      {r.frequency === 'daily' ? 'Diário' : r.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                      {r.next_run_at && ` · Próximo: ${new Date(r.next_run_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-slate-600"
                        onClick={() => {
                          setScheduleEditId(r.id);
                          setScheduleForm({
                            name: r.name,
                            frequency: (r.frequency || 'weekly') as 'daily' | 'weekly' | 'monthly',
                            day_of_week: r.day_of_week ?? 1,
                            day_of_month: r.day_of_month ?? 1,
                            hour_utc: r.hour_utc ?? 12,
                            minute_utc: r.minute_utc ?? 0,
                            timezone: r.timezone ?? config.timezone ?? 'America/Sao_Paulo',
                            recipients: r.recipients ?? '',
                            format: (r.format || 'link') as 'pdf' | 'csv' | 'link',
                            is_active: r.is_active ?? true,
                          });
                          setScheduleFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (!confirm('Excluir este agendamento?')) return;
                          await save('report_schedule_delete', { id: r.id });
                          await loadSettings();
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {!scheduleFormOpen ? (
                <Button size="sm" onClick={() => { setScheduleEditId(null); setScheduleForm({ ...scheduleForm, recipients: newScheduleRecipients || '' }); setScheduleFormOpen(true); }}>
                  Novo agendamento
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">
                    {scheduleEditId ? 'Editar agendamento' : 'Novo agendamento'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Nome (ex.: Resumo Executivo)"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <select
                      className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                      value={scheduleForm.frequency}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                    {scheduleForm.frequency === 'weekly' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-slate-500">Dia da semana (0=dom, 1=seg, …)</label>
                        <Input
                          type="number"
                          min={0}
                          max={6}
                          value={scheduleForm.day_of_week}
                          onChange={(e) => setScheduleForm((f) => ({ ...f, day_of_week: parseInt(e.target.value, 10) || 0 }))}
                        />
                      </div>
                    )}
                    {scheduleForm.frequency === 'monthly' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-slate-500">Dia do mês (1–28)</label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={scheduleForm.day_of_month}
                          onChange={(e) => setScheduleForm((f) => ({ ...f, day_of_month: parseInt(e.target.value, 10) || 1 }))}
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Hora (UTC)</label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={scheduleForm.hour_utc}
                        onChange={(e) => setScheduleForm((f) => ({ ...f, hour_utc: parseInt(e.target.value, 10) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Minuto (UTC)</label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={scheduleForm.minute_utc}
                        onChange={(e) => setScheduleForm((f) => ({ ...f, minute_utc: parseInt(e.target.value, 10) || 0 }))}
                      />
                    </div>
                    <Input
                      placeholder="Timezone (ex.: America/Sao_Paulo)"
                      value={scheduleForm.timezone}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, timezone: e.target.value }))}
                    />
                    <select
                      className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                      value={scheduleForm.format}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, format: e.target.value as 'pdf' | 'csv' | 'link' }))}
                    >
                      <option value="link">Link</option>
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                  <Input
                    placeholder="Emails (separados por vírgula)"
                    value={scheduleForm.recipients}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, recipients: e.target.value }))}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={scheduleForm.is_active}
                      onChange={(e) => setScheduleForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    Ativo
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (scheduleEditId) {
                          await save('report_schedule_update', {
                            id: scheduleEditId,
                            ...scheduleForm,
                          });
                        } else {
                          await save('report_schedule_create', {
                            name: scheduleForm.name,
                            frequency: scheduleForm.frequency,
                            day_of_week: scheduleForm.frequency === 'weekly' ? scheduleForm.day_of_week : null,
                            day_of_month: scheduleForm.frequency === 'monthly' ? scheduleForm.day_of_month : null,
                            hour_utc: scheduleForm.hour_utc,
                            minute_utc: scheduleForm.minute_utc,
                            timezone: scheduleForm.timezone,
                            recipients: scheduleForm.recipients,
                            format: scheduleForm.format,
                          });
                        }
                        await loadSettings();
                        setScheduleFormOpen(false);
                        setScheduleEditId(null);
                      }}
                    >
                      {scheduleEditId ? 'Salvar' : 'Criar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setScheduleFormOpen(false); setScheduleEditId(null); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Check className="h-4 w-4 text-indigo-600" />
                Onboarding guiado
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'upload_opportunities',
                  'upload_activities',
                  'configure_crm',
                  'configure_alerts',
                ].map((step) => {
                  const done = saas.onboarding.some((s) => s.step_key === step && s.completed_at);
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={async () => {
                        await save('onboarding_step', { step_key: step, completed: !done });
                        await loadSettings();
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs text-left',
                        done
                          ? 'border-teal-200 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      )}
                    >
                      {done ? '✓ ' : ''}{step}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <LineChart className="h-4 w-4 text-indigo-600" />
                Cenários e metas
              </p>
              <Input
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="Nome do cenário"
              />
              <Input
                value={newScenarioAssumptions}
                onChange={(e) => setNewScenarioAssumptions(e.target.value)}
                placeholder='{"win_rate_delta":2}'
              />
              <Button
                size="sm"
                onClick={async () => {
                  let assumptions: Record<string, unknown> = {};
                  try {
                    assumptions = JSON.parse(newScenarioAssumptions);
                  } catch {
                    assumptions = {};
                  }
                  await save('forecast_scenario_save', {
                    name: newScenarioName,
                    assumptions_json: assumptions,
                    is_default: true,
                  });
                  await loadSettings();
                }}
              >
                Salvar cenário
              </Button>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input value={goalYear} onChange={(e) => setGoalYear(e.target.value)} placeholder="Ano" />
                <Input value={goalQuarter} onChange={(e) => setGoalQuarter(e.target.value)} placeholder="Trimestre" />
                <Input value={goalRevenue} onChange={(e) => setGoalRevenue(e.target.value)} placeholder="Meta receita" />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await save('quarterly_goal_upsert', {
                    year: Number(goalYear),
                    quarter: Number(goalQuarter),
                    target_revenue: Number(goalRevenue || 0),
                  });
                  await loadSettings();
                }}
              >
                Salvar meta trimestral
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Repeat className="h-4 w-4 text-indigo-600" />
                Retenção e expansão
              </p>
              <Input value={retentionMonth} onChange={(e) => setRetentionMonth(e.target.value)} placeholder="YYYY-MM-01" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={retentionStart} onChange={(e) => setRetentionStart(e.target.value)} placeholder="Clientes início" />
                <Input value={retentionRetained} onChange={(e) => setRetentionRetained(e.target.value)} placeholder="Clientes retidos" />
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  await save('retention_cohort_upsert', {
                    cohort_month: retentionMonth,
                    segment: 'default',
                    customers_start: Number(retentionStart),
                    customers_retained: Number(retentionRetained),
                  });
                  await loadSettings();
                }}
              >
                Salvar coorte
              </Button>
              <p className="text-xs text-slate-500">
                Coortes registradas: {saas.retention_cohorts.length}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Goal className="h-4 w-4 text-indigo-600" />
                Qualidade de dados
              </p>
              <Input value={qualityScore} onChange={(e) => setQualityScore(e.target.value)} placeholder="Score 0-100" />
              <Button
                size="sm"
                onClick={async () => {
                  await save('data_quality_record', {
                    source_kind: 'full',
                    score: Number(qualityScore),
                    issues_json: [],
                  });
                  await loadSettings();
                }}
              >
                Registrar score
              </Button>
              <p className="text-xs text-slate-500">
                Último score:{' '}
                {saas.latest_data_quality ? `${saas.latest_data_quality.score}` : '—'}
              </p>
            </div>
          </div>
          </fieldset>
        </CardContent>
      </Card>}

      {/* Organização */}
      {shouldShow('org', ['organização', 'nome']) && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Organização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManage} className={cn(!canManage && 'opacity-75')}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome da organização</label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Minha organização"
              className="max-w-md"
            />
          </div>
          <Button
            size="sm"
            onClick={() => save('org', { name: orgName })}
            disabled={saving === 'org'}
          >
            {saving === 'org' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
          </fieldset>
        </CardContent>
      </Card>}

      {/* Membros e convites */}
      {shouldShow('members', ['membros', 'convites', 'convite', 'equipe']) && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-indigo-600" />
            Membros, pessoas e convites
          </CardTitle>
          <p className="text-sm text-slate-500">
            Convide pessoas por e-mail e gerencie membros internos da organização, além de cadastrar contatos e demais envolvidos da empresa.
            Apenas perfis de gestão podem alterar essas informações.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Membros atuais</p>
            <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              {members.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum membro listado.</li>
              ) : (
                members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      {m.user_id === currentUserId ? (
                        <Badge variant="primary" className="text-xs">Você</Badge>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">{m.user_id.slice(0, 8)}…</span>
                      )}
                      <Badge variant="outline">{m.role}</Badge>
                    </span>
                    {canManage && m.user_id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={removeMemberLoading === m.user_id}
                        onClick={async () => {
                          if (!confirm('Remover este membro da organização?')) return;
                          setRemoveMemberLoading(m.user_id);
                          try {
                            const res = await fetch('/api/org/members', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: m.user_id }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erro ao remover');
                            await loadSettings();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Erro ao remover membro');
                          } finally {
                            setRemoveMemberLoading(null);
                          }
                        }}
                      >
                        {removeMemberLoading === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                        Remover
                      </Button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Pessoas e demais envolvidos da empresa */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Pessoas e envolvidos da empresa (ICP / decisores / usuários)</p>
            {peopleLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando pessoas...
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                {people.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma pessoa cadastrada ainda. Use o formulário abaixo para registrar decisores, usuários e demais envolvidos da empresa.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {people.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-white px-2 py-1.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{p.full_name}</span>
                          {p.email && (
                            <span className="text-xs text-slate-500">
                              {p.email}
                            </span>
                          )}
                          {p.person_type && (
                            <Badge variant="outline" className="text-xs">
                              {p.person_type}
                            </Badge>
                          )}
                          {p.role_title && (
                            <span className="text-xs text-slate-600">
                              {p.role_title}
                            </span>
                          )}
                          {p.department && (
                            <span className="text-xs text-slate-500">
                              · {p.department}
                            </span>
                          )}
                          {p.is_key_contact && (
                            <Badge variant="primary" className="text-[10px]">
                              Contato-chave
                            </Badge>
                          )}
                        </div>
                        {p.company_name && (
                          <span className="text-xs text-slate-500">
                            {p.company_name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {canManage && (
              <fieldset className={cn(!canManage && 'opacity-75')}>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  Cadastrar nova pessoa/envolvido
                </p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Nome completo
                    </label>
                    <Input
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Nome e sobrenome"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      value={newPersonEmail}
                      onChange={(e) => setNewPersonEmail(e.target.value)}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Cargo / função
                    </label>
                    <Input
                      value={newPersonRoleTitle}
                      onChange={(e) => setNewPersonRoleTitle(e.target.value)}
                      placeholder="Ex.: CFO, Head de Vendas"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">
                        Tipo de envolvido
                      </label>
                      <select
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs"
                        value={newPersonType}
                        onChange={(e) =>
                          setNewPersonType(
                            e.target.value as
                              | 'decision_maker'
                              | 'economic_buyer'
                              | 'champion'
                              | 'user'
                              | 'influencer'
                              | 'stakeholder'
                              | 'finance'
                              | 'procurement'
                              | 'other'
                          )
                        }
                      >
                        <option value="decision_maker">Decisor principal</option>
                        <option value="economic_buyer">Comprador econômico</option>
                        <option value="champion">Champion / sponsor interno</option>
                        <option value="user">Usuário</option>
                        <option value="influencer">Influenciador</option>
                        <option value="finance">Financeiro</option>
                        <option value="procurement">Compras / Procurement</option>
                        <option value="stakeholder">Stakeholder geral</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">
                        Nível
                      </label>
                      <select
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs"
                        value={newPersonSeniority}
                        onChange={(e) =>
                          setNewPersonSeniority(
                            e.target.value as
                              | 'c_level'
                              | 'vp'
                              | 'director'
                              | 'manager'
                              | 'analyst'
                              | 'other'
                          )
                        }
                      >
                        <option value="c_level">C-level / Dono</option>
                        <option value="vp">VP</option>
                        <option value="director">Diretor(a)</option>
                        <option value="manager">Gestor(a)</option>
                        <option value="analyst">Analista / especialista</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Área / departamento
                    </label>
                    <Input
                      value={newPersonDept}
                      onChange={(e) => setNewPersonDept(e.target.value)}
                      placeholder="Ex.: Finanças, Vendas, TI"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Tag de persona (opcional)
                    </label>
                    <Input
                      value={newPersonPersonaTag}
                      onChange={(e) => setNewPersonPersonaTag(e.target.value)}
                      placeholder="Ex.: CFO pragmático, VP growth"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="newPersonKey"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={newPersonKey}
                      onChange={(e) => setNewPersonKey(e.target.checked)}
                    />
                    <label htmlFor="newPersonKey" className="text-xs text-slate-700">
                      Marcar como contato-chave para esta empresa
                    </label>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    disabled={saving === 'org_people' || !newPersonName.trim()}
                    onClick={async () => {
                      setError(null);
                      setSaving('org_people');
                      try {
                        const res = await fetch('/api/org/people', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            full_name: newPersonName.trim(),
                            email: newPersonEmail.trim() || undefined,
                            role_title: newPersonRoleTitle.trim() || undefined,
                            person_type: newPersonType,
                            department: newPersonDept.trim() || undefined,
                            seniority: newPersonSeniority,
                            persona_tag: newPersonPersonaTag.trim() || undefined,
                            is_key_contact: newPersonKey,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error((data as { error?: string }).error ?? 'Erro ao cadastrar pessoa');
                        }
                        setNewPersonName('');
                        setNewPersonEmail('');
                        setNewPersonRoleTitle('');
                        setNewPersonDept('');
                        setNewPersonPersonaTag('');
                        setNewPersonKey(false);
                        await loadSettings();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Erro ao cadastrar pessoa');
                      } finally {
                        setSaving(null);
                      }
                    }}
                  >
                    {saving === 'org_people' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Adicionar pessoa
                      </>
                    )}
                  </Button>
                </div>
              </fieldset>
            )}
          </div>

          {canManage && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Convidar por e-mail</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager' | 'viewer')}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button
                    disabled={inviteLoading || !inviteEmail.trim()}
                    onClick={async () => {
                      setInviteError(null);
                      setInviteLoading(true);
                      try {
                        const res = await fetch('/api/org/invites', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erro ao enviar convite');
                        setInviteEmail('');
                        await loadSettings();
                      } catch (e) {
                        setInviteError(e instanceof Error ? e.message : 'Erro ao enviar convite');
                      } finally {
                        setInviteLoading(false);
                      }
                    }}
                  >
                    {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Convidar
                  </Button>
                </div>
                {inviteError && (
                  <p className="mt-1 text-sm text-red-600">{inviteError}</p>
                )}
              </div>

              {pendingInvites.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Convites pendentes</p>
                  <ul className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    {pendingInvites.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-slate-700">{inv.email}</span>
                          <Badge variant="outline">{inv.role}</Badge>
                          <span className="text-xs text-slate-500">
                            expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-700 hover:bg-amber-100"
                          disabled={revokeLoading === inv.id}
                          onClick={async () => {
                            setRevokeLoading(inv.id);
                            try {
                              const res = await fetch(`/api/org/invites/${inv.id}`, { method: 'DELETE' });
                              if (!res.ok) throw new Error('Erro ao revogar');
                              await loadSettings();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : 'Erro ao revogar convite');
                            } finally {
                              setRevokeLoading(null);
                            }
                          }}
                        >
                          {revokeLoading === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Revogar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>}

      {/* Gestão de usuários da plataforma (somente admin de plataforma) */}
      {isPlatformAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Administração de usuários da plataforma
            </CardTitle>
            <p className="text-sm text-slate-500">
              Visualize todos os usuários cadastrados na plataforma, ative/desative acesso e controle quem é administrador global.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {platformUsersError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                <AlertCircle className="h-4 w-4" />
                {platformUsersError}
              </div>
            )}
            {platformUsersLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuários da plataforma...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">E-mail</th>
                      <th className="px-3 py-2 font-medium">Criado em</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Admin</th>
                      <th className="px-3 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {platformUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="px-3 py-2 align-middle text-slate-800">
                          {u.email}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-500">
                          {new Date(u.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <Badge variant={u.is_active ? 'success' : 'outline'} className="text-[10px]">
                            {u.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {u.is_platform_admin ? (
                            <Badge variant="primary" className="text-[10px]">
                              Admin
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400">Usuário</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={saving === `admin_user_${u.id}`}
                              onClick={async () => {
                                setSaving(`admin_user_${u.id}`);
                                setPlatformUsersError(null);
                                try {
                                  const res = await fetch('/api/admin/users', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      user_id: u.id,
                                      action: u.is_active ? 'deactivate' : 'activate',
                                    }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) {
                                    throw new Error((data as { error?: string }).error ?? 'Erro ao atualizar usuário');
                                  }
                                  await loadSettings();
                                } catch (e) {
                                  setPlatformUsersError(e instanceof Error ? e.message : 'Erro ao atualizar usuário');
                                } finally {
                                  setSaving(null);
                                }
                              }}
                            >
                              {saving === `admin_user_${u.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : u.is_active ? (
                                'Desativar'
                              ) : (
                                'Ativar'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={saving === `admin_user_role_${u.id}`}
                              onClick={async () => {
                                setSaving(`admin_user_role_${u.id}`);
                                setPlatformUsersError(null);
                                try {
                                  const res = await fetch('/api/admin/users', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      user_id: u.id,
                                      action: u.is_platform_admin ? 'remove_admin' : 'make_admin',
                                    }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) {
                                    throw new Error((data as { error?: string }).error ?? 'Erro ao atualizar papel de usuário');
                                  }
                                  await loadSettings();
                                } catch (e) {
                                  setPlatformUsersError(e instanceof Error ? e.message : 'Erro ao atualizar papel de usuário');
                                } finally {
                                  setSaving(null);
                                }
                              }}
                            >
                              {saving === `admin_user_role_${u.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : u.is_platform_admin ? (
                                'Remover admin'
                              ) : (
                                'Tornar admin'
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {platformUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-500">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Limiares de distorção (receita inflada) */}
      {shouldShow('org', [
        'limiares',
        'fricção',
        'pipeline',
        'cac',
        'marketing',
      ]) && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-5 w-5 text-indigo-600" />
            Limiares de distorção (dias)
          </CardTitle>
          <p className="text-sm text-slate-500">
            Quantos dias sem atividade para considerar cada tipo de distorção (receita inflada).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManage} className={cn(!canManage && 'opacity-75')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Proposta alto risco</label>
              <Input
                type="number"
                min={1}
                value={config.dias_proposta_risco ?? 7}
                onChange={(e) => setConfig((c) => ({ ...c, dias_proposta_risco: parseInt(e.target.value, 10) || 7 }))}
              />
              <p className="mt-1 text-xs text-slate-500">Em Proposta, ≥ N dias sem atividade</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pipeline abandonado</label>
              <Input
                type="number"
                min={1}
                value={config.dias_pipeline_abandonado ?? 14}
                onChange={(e) => setConfig((c) => ({ ...c, dias_pipeline_abandonado: parseInt(e.target.value, 10) || 14 }))}
              />
              <p className="mt-1 text-xs text-slate-500">Open, ≥ N dias sem atividade</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Aging inflado</label>
              <Input
                type="number"
                min={1}
                value={config.dias_aging_inflado ?? 60}
                onChange={(e) => setConfig((c) => ({ ...c, dias_aging_inflado: parseInt(e.target.value, 10) || 60 }))}
              />
              <p className="mt-1 text-xs text-slate-500">Open, idade ≥ N dias</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Aprovação travada</label>
              <Input
                type="number"
                min={1}
                value={config.dias_aprovacao_travada ?? 5}
                onChange={(e) => setConfig((c) => ({ ...c, dias_aprovacao_travada: parseInt(e.target.value, 10) || 5 }))}
              />
              <p className="mt-1 text-xs text-slate-500">Em Aprovação, ≥ N dias</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Top deals por distorção</label>
              <Input
                type="number"
                min={5}
                max={100}
                value={config.top_deals_por_friccao ?? 20}
                onChange={(e) => setConfig((c) => ({ ...c, top_deals_por_friccao: parseInt(e.target.value, 10) || 20 }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Evidências por distorção</label>
              <Input
                type="number"
                min={5}
                max={50}
                value={config.top_evidencias_por_friccao ?? 10}
                onChange={(e) => setConfig((c) => ({ ...c, top_evidencias_por_friccao: parseInt(e.target.value, 10) || 10 }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">CAC médio (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={config.cac_manual ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : parseFloat(e.target.value);
                  setConfig((c) => ({ ...c, cac_manual: Number.isNaN(v) ? null : v }));
                }}
                placeholder="Custo de aquisição por cliente"
              />
              <p className="mt-1 text-xs text-slate-500">Usado para calcular LTV/CAC no dashboard</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Gasto com marketing/mês (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={config.marketing_spend_monthly ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : parseFloat(e.target.value);
                  setConfig((c) => ({ ...c, marketing_spend_monthly: Number.isNaN(v) ? null : v }));
                }}
                placeholder="Investimento mensal em aquisição"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => save('config', config)}
            disabled={saving === 'config'}
          >
            {saving === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar limiares
          </Button>
          </fieldset>
        </CardContent>
      </Card>}

      {/* Notificações */}
      {shouldShow('org', ['notificações', 'email', 'timezone', 'fuso']) && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-indigo-600" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canManage} className={cn(!canManage && 'opacity-75')}>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notificar_email"
              checked={config.notificar_email ?? true}
              onChange={(e) => setConfig((c) => ({ ...c, notificar_email: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="notificar_email" className="text-sm font-medium text-slate-700">
              Ativar notificações por e-mail
            </label>
          </div>
          {config.notificar_email && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mails para notificações</label>
              <Input
                value={config.email_notificacoes ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, email_notificacoes: e.target.value }))}
                placeholder="email1@empresa.com, email2@empresa.com"
                className="max-w-md"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="incluir_convite"
              checked={config.incluir_convite_calendario ?? true}
              onChange={(e) => setConfig((c) => ({ ...c, incluir_convite_calendario: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="incluir_convite" className="text-sm font-medium text-slate-700">
              Incluir opção de convite para calendário nos deals
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Fuso horário</label>
            <Input
              value={config.timezone ?? 'America/Sao_Paulo'}
              onChange={(e) => setConfig((c) => ({ ...c, timezone: e.target.value }))}
              placeholder="America/Sao_Paulo"
              className="max-w-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => save('config', config)}
            disabled={saving === 'config'}
          >
            {saving === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar notificações
          </Button>
          </fieldset>
        </CardContent>
      </Card>}

      {/* Integração CRM */}
      {shouldShow('crm', [
        'crm',
        'webhook',
        'integração',
        'piperun',
        'hubspot',
        'pipedrive',
      ]) && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-5 w-5 text-indigo-600" />
            Integração CRM / API
          </CardTitle>
          <p className="text-sm text-slate-500">
            Conecte seu CRM via API ou use n8n/Zapier para enviar dados automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <fieldset disabled={!canManage} className={cn(!canManage && 'opacity-75')}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Provedor</label>
            <div className="flex flex-wrap gap-2">
              {CRM_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCrmProvider(p.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition',
                    crmProvider === p.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-1.5 text-slate-500">— {p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(crmProvider === 'n8n_webhook' || crmProvider === 'generic') && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h4 className="font-medium text-slate-900">Webhook para receber dados</h4>
              <p className="text-sm text-slate-600">
                Configure seu n8n, Zapier, Make ou outro automatizador para enviar oportunidades e atividades neste endpoint.
                Inclua no body: <code className="rounded bg-slate-200 px-1">org_id</code>, <code className="rounded bg-slate-200 px-1">opportunities</code>, <code className="rounded bg-slate-200 px-1">activities</code>.
              </p>
              {orgId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Seu org_id:</span>
                  <code className="rounded bg-slate-200 px-2 py-1 text-xs font-mono">{orgId}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(orgId)} title="Copiar org_id">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrl)}
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Webhook Secret (opcional — header X-Webhook-Secret)
                </label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Seu secret para validar requisições"
                  className="max-w-md"
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  save('crm', {
                    provider: crmProvider,
                    webhook_enabled: true,
                    webhook_secret: webhookSecret || undefined,
                  })
                }
                disabled={saving === 'crm'}
              >
                {saving === 'crm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar integração
              </Button>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-medium text-amber-800">Payload esperado (exemplo)</p>
                <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-xs">
{`{
  "org_id": "${orgId || 'UUID_DA_SUA_ORG'}",
  "opportunities": [
    {
      "crm_hash": "abc123",
      "company_name": "Empresa X",
      "title": "Projeto Y",
      "value": 50000,
      "stage_name": "Proposta",
      "owner_email": "vendedor@empresa.com",
      "owner_name": "João Silva",
      "status": "open",
      "created_date": "2025-01-15"
    }
  ],
  "activities": [
    {
      "linked_opportunity_hash": "abc123",
      "done_at": "2025-02-01T14:00:00Z",
      "title": "Call de follow-up"
    }
  ]
}`}
                </pre>
                <p className="mt-2 text-amber-700">
                  <strong>Dica:</strong> No n8n, use o node HTTP Request (POST) e mapeie os campos do seu CRM para este formato.
                  O <code className="rounded bg-amber-100 px-1">org_id</code> você encontra na URL ou pode solicitar ao suporte.
                </p>
              </div>
              <a
                href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
              >
                Ver docs n8n HTTP Request
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {(crmProvider === 'pipedrive' || crmProvider === 'hubspot' || crmProvider === 'piperun') && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Integração direta com {crmProvider === 'piperun' ? 'PipeRun' : crmProvider === 'pipedrive' ? 'Pipedrive' : 'HubSpot'} em desenvolvimento.
                Por enquanto, use <strong>n8n / Webhook</strong> para conectar: exporte os dados do CRM no n8n e envie no formato esperado.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setCrmProvider('n8n_webhook')}
              >
                Usar Webhook
              </Button>
            </div>
          )}
          </fieldset>
        </CardContent>
      </Card>}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Base de demonstração
            </CardTitle>
            <p className="text-sm text-slate-500">
              Restaura a base de dados de demonstração ao estado inicial. Use para resetar cenários, oportunidades e relatórios de exemplo.
            </p>
          </CardHeader>
          <CardContent>
            {resetDemoError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {resetDemoError}
              </div>
            )}
            {resetDemoSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Base de demonstração zerada e recarregada com sucesso.
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={resetDemoBase}
              disabled={resetDemoLoading}
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300"
            >
              {resetDemoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Zerando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zerar e recarregar base de demonstração
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasVisibleCards && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Nenhuma seção encontrada para o filtro informado.
          </CardContent>
        </Card>
      )}

      {/* Status salvo */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 shadow-lg">
          <Check className="h-5 w-5" />
          {saved === 'copy' ? 'URL copiada!' : 'Salvo com sucesso!'}
        </div>
      )}
    </div>
  );
}
