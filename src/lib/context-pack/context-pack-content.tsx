import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Conteúdo do Context Pack v1 — espelha docs/context-pack/CONTEXT-PACK-RFY-v1.md */

export const CONTEXT_PACK_VERSION = 'v1';

export function ContextPackContent() {
  return (
    <div className="space-y-8 text-[var(--color-text)]">
      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
        Alinhamento produto, pricing, diagnóstico SUPHO/ITSMO e roadmap. Taxa de referência USD→BRL:{' '}
        <strong>1 USD = 5,275 BRL</strong>.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          1. Diagnóstico SUPHO / ITSMO
        </h2>
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pacote Core (90/90)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>
              <strong className="text-[var(--color-text)]">15 perguntas Core</strong> globais (Likert 1–5),
              blocos A / B / C, com <code className="rounded bg-[var(--color-surface-muted)] px-1">item_code</code>{' '}
              para subíndices. Use este pacote nas campanhas para comparar evolução em janelas de 90 dias.
            </p>
            <p>
              Evoluções de texto: versionar via migração — não editar perguntas Core diretamente em produção sem
              processo.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confidence level (leitura)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nível</TableHead>
                  <TableHead>Critérios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Alto</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    ≥ 70% de respostas dos convidados e ≥ 80% de cobertura em cada bloco A, B e C
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Médio</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    50–70% de respostas ou cobertura parcial em algum bloco
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Baixo</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    &lt; 50% de respostas ou blocos incompletos
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Cálculo automático em roadmap: fechar campanha ou ao computar diagnóstico.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text)]">Reavaliação 90 dias:</strong> após cada campanha, planejar nova
          rodada ~90 dias para fechar o ciclo 90/90 (lembrete automático — instrumentação futura).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">2. ICP e pricing (BRL)</h2>
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil ICP</TableHead>
                  <TableHead>Critérios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Indústria</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    Processos rígidos; ERP/CRM integrados; ≥ 200 colaboradores; vendas longas
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Tech / Serviços</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    B2B consultivo; CRM ativo; ≥ 10 usuários; ≥ 100 registros/semana
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preço mensal (base + por usuário)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Base (R$)</TableHead>
                  <TableHead className="text-right">/ usuário (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Starter</TableCell>
                  <TableCell className="text-right">786</TableCell>
                  <TableCell className="text-right">158</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Growth</TableCell>
                  <TableCell className="text-right">1.577</TableCell>
                  <TableCell className="text-right">132</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Enterprise</TableCell>
                  <TableCell className="text-right">5.270</TableCell>
                  <TableCell className="text-right">211</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Custos marginais indicativos: +1 usuário R$ 132–211/mês; +100 colaboradores ≈ R$ 264/mês; +1 integração ≈
              R$ 2.638 setup + R$ 264/mês; +1 unidade ≈ R$ 528/mês. Margem bruta alvo ≥ 70%; payback onboarding (R$
              10.550–26.375) até 3 meses.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">3. Roadmap</h2>
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Prio</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Escopo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">P0</TableCell>
                  <TableCell>Piloto</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    CRM/ERP + CSV com reprocessamento; SUPHO/ITSMO; alertas; relatórios agendados; reprocessamento de
                    uploads
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">P1</TableCell>
                  <TableCell>Pós-piloto</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    Billing Stripe; rituais + decisões no PAIP; base de conhecimento com IA
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">P2</TableCell>
                  <TableCell>Futuro</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">
                    Previsões avançadas; SSO/permissões; certificação/marketplace
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">4. Custos e métricas</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-text-muted)]">
          <li>Infra ~R$ 95/org/mês; mensageria ~R$ 4,75/mil e-mails; IA ~R$ 2,11/milhão tokens</li>
          <li>Instrumentar: onboarding, tickets/mês, custo infra, custo envio/armazenamento, WAU, taxa resposta SUPHO</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">5. Rituais e PAIP</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Cada decisão em rituais deve virar ação no plano <strong className="text-[var(--color-text)]">30 / 60 / 90</strong>{' '}
          com responsável e data — evitar decisões órfãs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">6. Produto e métricas</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Core: integrações CRM/ERP, reprocessamento, alertas, relatórios, base de conhecimento, diagnósticos SUPHO,
          reavaliação 90/90, rituais. SSO, preditivo avançado e certificação: fases futuras. Reforçar baseline, fricções e
          execução de decisões nas métricas.
        </p>
      </section>

      <p className="text-xs text-[var(--color-text-muted)]">Context Pack RFY — {CONTEXT_PACK_VERSION} · Documento espelhado em docs/context-pack/</p>
    </div>
  );
}
