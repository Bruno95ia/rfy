# Roadmap de Funcionalidades SaaS (RFY)

## Prioridade P0 (0-30 dias)
- Billing real com Stripe/Pagar.me: checkout, upgrade/downgrade, status de assinatura, falha de pagamento.
- RBAC avançado com convites: fluxo de convite por e-mail, aceite de convite, remoção e trilha de auditoria.
- Observabilidade de produto: eventos de uso por tela, funil de ativação, retenção por coorte no painel admin.
- Alertas operacionais: retries com backoff para webhooks e notificações de falha em tempo real.
- Backups e restore: rotina automatizada de backup PostgreSQL com teste de restauração mensal.

## Prioridade P1 (30-60 dias)
- Multi-tenant hardening: rate limit por organização, isolamento forte por chave/API, quotas por feature.
- Centro de integrações: conectores nativos (HubSpot, Pipedrive, Salesforce) com health/status por conector.
- Onboarding guiado in-app: checklist progressivo com milestones e score de ativação.
- Relatórios recorrentes premium: templates por perfil (CEO, Revenue Ops, Sales Manager).
- Catálogo de playbooks de intervenção: sugestões acionáveis com histórico de resultado por ação.

## Prioridade P2 (60-90 dias)
- Forecast versionado: comparação de cenários, baseline vs. otimista/pessimista, aprovação interna.
- Benchmarks setoriais: comparação por segmento e faixa de receita.
- Módulo de metas e comissão: objetivo trimestral por squad, acompanhamento de atingimento e risco.
- API pública versionada: documentação OpenAPI + chaves com escopo fino por endpoint.
- Compliance pack: trilhas para LGPD/SOC2 (retenção, auditoria e controle de acesso revisável).

## Métricas de sucesso sugeridas
- Ativação: % de orgs com primeira integração + primeiro relatório em até 48h.
- Retenção: WAU/MAU por org e churn logo nos primeiros 90 dias.
- Receita: expansão (upgrade), contração (downgrade) e MRR líquido por coorte.
- Confiabilidade: taxa de sucesso de webhook, tempo médio de processamento, incidentes por mês.
- Valor entregue: redução de ciclo comercial e receita antecipada por organização.

## Dependências técnicas
- Worker assíncrono dedicado (fila) para processamentos críticos e envio de alertas.
- Padrão de versionamento de schema e contratos de API.
- Ambientes separados (dev/staging/prod) com gates de deploy e rollback.
