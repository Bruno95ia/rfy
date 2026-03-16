import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireApiUserOrgAccess,
  userHasMinimumOrgRole,
  type OrgRole,
} from '@/lib/auth';

const personTypeEnum = [
  'decision_maker',
  'economic_buyer',
  'champion',
  'user',
  'influencer',
  'stakeholder',
  'finance',
  'procurement',
  'other',
] as const;

const seniorityEnum = [
  'c_level',
  'vp',
  'director',
  'manager',
  'analyst',
  'other',
] as const;

const createPersonSchema = z.object({
  org_id: z.string().uuid().optional(), // se não vier, usamos org do usuário via requireApiUserOrgAccess
  full_name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido').optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().max(80).optional(),
  company_name: z.string().max(255).optional(),
  person_type: z.enum(personTypeEnum).optional().default('stakeholder'),
  department: z.string().max(120).optional(),
  seniority: z.enum(seniorityEnum).optional().default('other'),
  role_title: z.string().max(160).optional(),
  persona_tag: z.string().max(80).optional(),
  is_key_contact: z.boolean().optional().default(false),
  owner_email: z.string().email('Email inválido').optional(),
  notes: z.string().max(4000).optional(),
});

/** GET: lista pessoas ligadas à organização do usuário (com filtros simples opcionais). */
export async function GET(req: NextRequest) {
  const orgIdParam = req.nextUrl.searchParams.get('org_id');
  const search = req.nextUrl.searchParams.get('q')?.trim() || '';
  const typeFilter = req.nextUrl.searchParams.get('person_type')?.trim() || '';
  const onlyKey = req.nextUrl.searchParams.get('key_only') === 'true';

  const auth = await requireApiUserOrgAccess(orgIdParam);
  if (!auth.ok) return auth.response;
  const { orgId } = auth;

  const admin = createAdminClient();
  let query = admin
    .from('org_people')
    .select(
      'id, org_id, full_name, email, phone, company_name, person_type, department, seniority, role_title, persona_tag, is_key_contact, owner_email, created_at, updated_at'
    )
    .eq('org_id', orgId)
    .order('full_name', { ascending: true });

  if (onlyKey) {
    query = query.eq('is_key_contact', true);
  }
  if (typeFilter) {
    query = query.eq('person_type', typeFilter);
  }
  if (search) {
    // Busca simples por nome/email/empresa (case-insensitive)
    query = query.ilike('full_name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ people: data ?? [] });
}

/** POST: cadastra uma nova pessoa/envolvido para a organização. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = createPersonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { org_id, ...data } = parsed.data;

  const auth = await requireApiUserOrgAccess(org_id ?? null);
  if (!auth.ok) return auth.response;
  const { user, orgId } = auth;

  // Apenas perfis com role mínimo "manager" podem cadastrar pessoas/envolvidos da empresa
  const canManagePeople = await userHasMinimumOrgRole(
    user.id,
    orgId,
    'manager' satisfies OrgRole
  );
  if (!canManagePeople) {
    return NextResponse.json(
      { error: 'Apenas owner, admin ou manager podem cadastrar pessoas da empresa.' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('org_people')
    .insert({
      org_id: orgId,
      full_name: data.full_name.trim(),
      email: data.email?.trim().toLowerCase() ?? null,
      phone: data.phone?.trim() ?? null,
      company_name: data.company_name?.trim() ?? null,
      person_type: data.person_type,
      department: data.department?.trim() ?? null,
      seniority: data.seniority,
      role_title: data.role_title?.trim() ?? null,
      persona_tag: data.persona_tag?.trim() ?? null,
      is_key_contact: data.is_key_contact ?? false,
      owner_email: data.owner_email?.trim().toLowerCase() ?? null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select(
      'id, org_id, full_name, email, phone, company_name, person_type, department, seniority, role_title, persona_tag, is_key_contact, owner_email, created_at, updated_at'
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? 'Falha ao cadastrar pessoa' },
      { status: 500 }
    );
  }

  return NextResponse.json({ person: inserted }, { status: 201 });
}

