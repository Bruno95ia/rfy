import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireApiAuth, requireApiCampaignAccess } from '@/lib/auth';
import { sendFormInviteEmail } from '@/lib/email/send';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

const payloadSchema = z.object({
  form_slug: z.string().min(1, 'form_slug é obrigatório'),
  form_name: z.string().min(1, 'form_name é obrigatório'),
  respondents: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).optional(),
      })
    )
    .min(1, 'Ao menos um respondente é obrigatório'),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { form_slug, form_name, respondents } = parsed.data;
  const admin = createAdminClient();
  const campaignId = form_slug.startsWith('supho-')
    ? form_slug.slice('supho-'.length).trim()
    : null;
  if (form_slug.startsWith('supho-')) {
    if (!campaignId) {
      return NextResponse.json({ error: 'form_slug inválido para SUPHO' }, { status: 400 });
    }
    const access = await requireApiCampaignAccess(campaignId);
    if (!access.ok) return access.response;
  }

  const results: {
    email: string;
    name?: string;
    ok: boolean;
    error?: string;
  }[] = [];

  for (const r of respondents) {
    const email = r.email.toLowerCase().trim();
    const name = r.name?.trim() || null;

    const token = randomBytes(32).toString('hex');

    const { error: insertError } = await admin.from('form_invites').insert({
      email,
      name,
      token,
      form_slug,
      status: 'pending',
      sent_at: new Date().toISOString(),
    });

    if (insertError) {
      results.push({ email, name: name ?? undefined, ok: false, error: insertError.message });
      continue;
    }

    const formUrl = `${APP_URL}/forms/${encodeURIComponent(form_slug)}?token=${token}`;
    const sendResult = await sendFormInviteEmail(email, name, form_name, formUrl);

    if (!sendResult.ok) {
      // registramos falha de envio, mas mantemos o registro no banco
      // status permanece 'pending'
      results.push({ email, name: name ?? undefined, ok: false, error: sendResult.error });
      // eslint-disable-next-line no-console
      console.warn('[forms] Failed to send form invite email:', email, sendResult.error);
      continue;
    }

    await admin
      .from('form_invites')
      .update({ status: 'sent' })
      .eq('email', email)
      .eq('token', token);

    results.push({ email, name: name ?? undefined, ok: true });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    {
      form_slug,
      total: results.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    },
    { status: allOk ? 200 : 207 }
  );
}
