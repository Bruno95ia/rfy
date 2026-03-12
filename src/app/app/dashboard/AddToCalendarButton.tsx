'use client';

import { useState } from 'react';
import { CalendarPlus, Mail, Loader2 } from 'lucide-react';
import { generateIcsEvent, downloadIcs } from '@/lib/ical';

type Deal = {
  company_name?: string | null;
  title?: string | null;
  value?: number | null;
  days_without_activity?: number;
  owner_email?: string | null;
  owner_name?: string | null;
};

interface AddToCalendarButtonProps {
  deal: Deal;
  context: string;
  ownerEmail?: string | null;
}

export function AddToCalendarButton({
  deal,
  context,
  ownerEmail,
}: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const company = deal.company_name ?? 'Cliente';
  const title = deal.title ?? 'Negócio';
  const summary = `Follow-up: ${company} — ${title}`;
  const valueStr = deal.value != null
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(deal.value)
    : '-';
  const days = deal.days_without_activity ?? 0;
  const description = `Negócio ${context}. ${days} dias sem atividade. Valor: ${valueStr}. Gerado pelo Revenue Engine.`;

  const handleAddToMyCalendar = () => {
    setLoading(true);
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(15, 0, 0, 0);

    const ics = generateIcsEvent({
      summary,
      description,
      start,
      end,
    });
    downloadIcs(`follow-up-${company.replace(/\s+/g, '-').slice(0, 30)}.ics`, ics);
    setLoading(false);
    setOpen(false);
  };

  const handleMailtoVendor = () => {
    const email = ownerEmail ?? deal.owner_email;
    if (!email) return;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(15, 0, 0, 0);
    const ics = generateIcsEvent({ summary, description, start, end });
    downloadIcs(`follow-up-${company.replace(/\s+/g, '-').slice(0, 30)}.ics`, ics);
    const subject = encodeURIComponent(`Follow-up: ${company} - ${title}`);
    const body = encodeURIComponent(
      `Olá,\n\nSegue em anexo o convite para agendar follow-up no negócio:\n${company} — ${title}\nValor: ${valueStr}\nDias sem atividade: ${days}\n\nPor favor, anexe o arquivo .ics que foi baixado e envie este email para adicionar o evento à sua agenda.\n\nRevenue Engine`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setOpen(false), 500);
  };

  const hasVendorEmail = !!(ownerEmail ?? deal.owner_email);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 hover:border-amber-500/50"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Adicionar à agenda
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-white/10 bg-zinc-900 py-2 shadow-xl">
            <button
              type="button"
              onClick={handleAddToMyCalendar}
              disabled={loading}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4 text-amber-500" />
              )}
              <span>Baixar .ics (minha agenda)</span>
            </button>
            {hasVendorEmail && (
              <button
                type="button"
                onClick={handleMailtoVendor}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
              >
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>
                  {sent ? 'Email aberto!' : 'Enviar invite ao vendedor'}
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
