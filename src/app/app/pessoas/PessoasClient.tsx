'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  person_type: string;
  department: string | null;
  role_title: string | null;
  is_key_contact: boolean;
  created_at: string;
};

export function PessoasClient({ initialOrgId = '' }: { initialOrgId?: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (initialOrgId) params.set('org_id', initialOrgId);
      if (search) params.set('q', search);
      if (typeFilter) params.set('person_type', typeFilter);
      const res = await fetch(`/api/org/people?${params}`);
      const data = await res.json();
      setPeople(data?.people ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, initialOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Lista de pessoas
        </CardTitle>
        <Link href="/app/settings?panel=saas">
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-1" />
            Gerenciar em Configurações
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="flex h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="decision_maker">Decision maker</option>
            <option value="champion">Champion</option>
            <option value="economic_buyer">Economic buyer</option>
            <option value="stakeholder">Stakeholder</option>
            <option value="user">User</option>
            <option value="influencer">Influencer</option>
          </select>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : people.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma pessoa cadastrada. Adicione em Configurações → Pessoas.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <span className="font-medium text-slate-900">{p.full_name}</span>
                  {p.is_key_contact && <Badge variant="default" className="ml-2 text-xs">Chave</Badge>}
                  {p.email && <p className="text-sm text-slate-500">{p.email}</p>}
                  {(p.company_name || p.role_title) && (
                    <p className="text-xs text-slate-400">{[p.company_name, p.role_title].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <Badge variant="outline">{p.person_type}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
