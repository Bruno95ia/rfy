# O que está faltando no software RFY

Consolidado do que está faltando no RFY com base na documentação existente e no estado atual do código. Referências: [AVALIACAO_PRONTO_PARA_VENDA.md](AVALIACAO_PRONTO_PARA_VENDA.md), [SAAS-FEATURES-ROADMAP.md](SAAS-FEATURES-ROADMAP.md), [ANALISE_MELHORIAS_SISTEMA.md](ANALISE_MELHORIAS_SISTEMA.md). Convites por e-mail já foram implementados (APIs e UI em Configurações).

---

## 1. Cobrança e venda (P0)

- **Billing real:** Não há integração com Stripe ou Pagar.me. Toda org recebe assinatura "starter" + "active" sem pagamento. Falta: checkout (cartão/PIX/boleto), upgrade/downgrade de plano, cancelamento, renovação e sincronização de status (trialing, active, past_due, canceled) com `org_subscriptions` e bloqueio/aviso na app.
- **Falha de pagamento:** Retry, notificação ao usuário e restrição de uso (ex.: somente leitura) até regularização.
- **Página de preços:** Não existe tela pública de planos/limites nem fluxo de upgrade/downgrade na app.
- **Termos e LGPD:** Termos de uso e política de privacidade não publicados para assinatura comercial.

---

## 2. Observabilidade e operação (P0)

- **Eventos de uso:** Não há tracking de uso por tela, funil de ativação nem retenção por coorte em painel admin.
- **Backups:** Sem rotina automatizada de backup do Postgres nem teste de restauração.
- **Logs e request ID:** Logs de erro não padronizados; sem middleware de request ID para rastreio.
- **Alertas operacionais (roadmap):** Retries com backoff para webhooks e notificações de falha em tempo real.

---

## 3. Experiência e robustez (alto impacto)

- **Tratamento de erro na UI:** Vários fetches silenciam erro (`.catch(()=>{})`). Em SettingsClient, PAIPClient, DiagnosticoClient, upload e login/signup falta exibir toast ou mensagem e opção "Tentar novamente".
- **Variáveis de ambiente:** Supabase e outros usam `process.env.X!` sem checagem; app quebra em runtime se faltar. Falta validação no carregamento e `.env.example` completo (RESEND, ALERT_*, GOOGLE_AI_API_KEY, etc.).
- **Indicação de fallback de AI:** Quando o RFY Index usa fallback (70% do pipeline) por indisponibilidade do AI, a UI não deixa isso explícito para o usuário.

---

## 4. Validação e qualidade (médio)

- **Validação com Zod:** Várias rotas (alerts, settings, upload, ai) ainda validam body/query de forma manual; não há schema compartilhado em todas as escritas (SUPHO e métricas já usam Zod em parte).
- **Loading:** Já existem `loading.tsx` em supho/diagnostico, paip, rituais, certificacao e em outras rotas; falta apenas em settings se ainda não foi adicionado (conferir).
- **Testes E2E:** Não há E2E cobrindo fluxo completo (login → dashboard → SUPHO). Testes unitários e de API existem em várias áreas; cobertura de SUPHO foi reforçada.

---

## 5. Produto e roadmap (P1/P2)

- **Onboarding guiado (P1):** Checklist progressivo in-app com milestones e score de ativação.
- **Centro de integrações (P1):** Conectores nativos (HubSpot, Pipedrive, Salesforce) com health/status.
- **Relatórios por perfil (P1):** Templates por perfil (CEO, Revenue Ops, Sales Manager).
- **Copiloto de Receita — visão do vendedor (P1):** Próximos passos, mensagens e oportunidades de expansão por conta para Executivo de Contas B2B; especificação e prompt em [COPILOTO-RECEITA-VISAO-VENDEDOR.md](COPILOTO-RECEITA-VISAO-VENDEDOR.md).
- **Multi-tenant hardening (P1):** Rate limit por organização, isolamento por chave/API, quotas por feature.
- **Evolução RFY 90d:** Documentado como "em implementação"; comunicar como "em breve" ou concluir.
- **Forecast versionado, benchmarks setoriais, API pública versionada, compliance LGPD/SOC2 (P2):** Itens de roadmap ainda não implementados.

---

## 6. Resumo por prioridade

| Prioridade | O que falta |
|------------|-------------|
| **Crítico para cobrança** | Billing (Stripe/Pagar.me), página de preços, termos/LGPD. |
| **Crítico para operação** | Observabilidade (eventos de uso, backups, logs), tratamento de erro na UI, checagem de env. |
| **Importante** | Indicar na UI modo fallback do AI; validação Zod nas rotas que faltam; E2E mínimo. |
| **Desejável** | Onboarding guiado, centro de integrações, relatórios por perfil, Copiloto de Receita (visão do vendedor), itens P2 do roadmap. |

---

Para implementar um bloco (ex.: billing, tratamento de erro ou observabilidade), defina um plano específico por tema.
