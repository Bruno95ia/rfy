# Avaliação: software pronto para venda?

Avaliação objetiva do estado do RFY para **venda comercial** (clientes pagantes). Base: código, docs (O_QUE_O_SAAS_OFERECE, SAAS-FEATURES-ROADMAP, ANALISE_MELHORIAS_SISTEMA) e fluxos de billing/limites.

---

## Veredicto resumido

| Pergunta | Resposta |
|----------|----------|
| **Pronto para venda com cobrança automática?** | **Não.** Não há integração de pagamento (Stripe/Pagar.me); assinatura é criada como "active" sem cobrança. |
| **Pronto para pilotos / vendas manuais?** | **Sim, com ressalvas.** O produto entrega valor (RFY Index, dashboard, SUPHO, relatórios); dá para vender com contrato e cobrança manual (boleto/transferência) e controle de plano/limites via admin. |
| **Pronto para demonstração comercial?** | **Sim.** Login, demo, upload, dashboard, SUPHO e configurações estão funcionais; conta demo e pacote demo permitem provas de valor. |

---

## O que está pronto para uso comercial

1. **Produto core**
   - RFY Index, Receita Confiável (30d), Receita Inflada, evolução e Top 3 decisões.
   - Dashboard com pipeline, fricções, intervenções, Deal Intelligence, Unit Economics/ICP.
   - SUPHO: diagnóstico (campanhas, respostas, cálculo ITSMO/IC/IH/IP), Painel de Maturidade, PAIP, rituais e certificação (estrutura).
   - Upload de CSV (PipeRun), webhook/n8n, relatórios executivos (PDF/CSV), configurações (org, integrações, alertas).

2. **Multi-tenant e governança**
   - Organizações, org_members, RBAC (owner/admin/manager/viewer).
   - Planos e limites (assentos, uploads/30d, deals ativos) definidos em `plans` e `usage_limits`; `checkOrgLimit` usado em upload e demo/upload-pack; retorno 402 quando limite é atingido.
   - Auditoria (org_audit_logs), API keys, webhooks outbound, alertas.

3. **Experiência de primeiro uso**
   - Signup sem cartão (badge "Sem cartão nesta fase"), criação de org "Default", conta demo (admin@demo.rfy.local), pacote demo para popular dados.
   - Configurações exibem plano e limites; fluxo de uso (upload → dashboard → SUPHO) coerente.

4. **Segurança e resiliência**
   - Auth Supabase, checagem de acesso por org nas APIs, RLS nas tabelas sensíveis.
   - Rate limit (Upstash) em upload e webhooks; validação em rotas críticas (incl. Zod em SUPHO e métricas refatoradas).

---

## O que falta para venda com cobrança automática

1. **Billing real (P0 no roadmap)**
   - **Checkout:** fluxo de assinatura com Stripe ou Pagar.me (cartão, PIX, boleto conforme provedor).
   - **Ciclo de vida:** upgrade/downgrade de plano, cancelamento, renovação; sincronizar status (trialing, active, past_due, canceled) com `org_subscriptions` e com bloqueio/aviso na app.
   - **Falha de pagamento:** retry, notificação ao usuário e possível restrição de uso (ex.: somente leitura) até regularização.
   - Hoje: toda org recebe subscription "starter" + "active" sem pagamento; não há tela de preços nem checkout.

2. **Convites e RBAC avançado (P0)**
   - Convite por e-mail, aceite de convite e remoção de membro com trilha de auditoria melhoram governança em time pago.
   - RBAC existe; fluxo de convite não está implementado.

3. **Observabilidade e operação (P0)**
   - Eventos de uso por tela, funil de ativação e retenção ajudam a operar e vender com dados.
   - Backups automatizados e teste de restauração são esperados em produção paga.

4. **Documentação e jurídico**
   - Termos de uso e política de privacidade (LGPD) para assinatura comercial.
   - Preços públicos (landing ou página de preços) e descrição clara de planos/limites.

---

## Riscos e ressalvas para pilotos / vendas manuais

| Área | Situação | Recomendação |
|------|----------|--------------|
| **Erro na UI** | Vários fetches com erro silencioso ou sem retry (ver ANALISE_MELHORIAS_SISTEMA). | Tratar erro e exibir toast/mensagem; botão "Tentar novamente" nas telas críticas. |
| **Variáveis de ambiente** | Supabase e outros sem checagem no startup; app quebra se faltar env. | Validar env no carregamento ou em script de deploy; documentar .env.example. |
| **AI Service** | Forecast e intervenções dependem de serviço externo; se indisponível, usa fallback (ex.: 70% do pipeline). | Deixar claro na UI quando o RFY Index está em modo fallback; garantir SLA/contrato do AI em pilotos. |
| **Evolução do RFY 90d** | Documentado como "em implementação". | Comunicar como "em breve" ou concluir antes de prometer em contrato. |

---

## Checklist mínimo para “pronto para venda”

Use como referência conforme o modelo (cobrança automática vs. pilotos).

- [ ] **Cobrança automática:** Integração Stripe ou Pagar.me (checkout, webhooks, status de assinatura, tratamento de falha de pagamento).
- [ ] **Cobrança automática:** Página de preços e planos e fluxo de upgrade/downgrade na app.
- [ ] **Pilotos:** Processo definido de ativação (criação de org, plano e limites manuais) e renovação.
- [ ] Termos de uso e política de privacidade publicados.
- [ ] Tratamento de erro consistente nas telas principais (dashboard, upload, SUPHO, configurações).
- [ ] Checagem de variáveis de ambiente no deploy ou documentação clara de requisitos.
- [ ] (Recomendado) Backup automatizado do banco e teste de restauração.

---

## Conclusão

- **Para venda com cobrança recorrente automática:** o software **não está pronto**; o principal gap é billing real (Stripe/Pagar.me) e fluxo de vida da assinatura, além de convites e observabilidade (P0 do roadmap).
- **Para pilotos, provas de valor e vendas com contrato + cobrança manual:** o software **está utilizável**; o core (RFY Index, dashboard, SUPHO, limites por plano) entrega valor e os limites já são aplicados em upload. As melhorias de erro, env e operação aumentam a confiança e a profissionalidade para esse uso.

*Documento gerado com base no estado atual do repositório e nos docs de produto e roadmap. Revisar periodicamente conforme as prioridades P0/P1 do SAAS-FEATURES-ROADMAP forem implementadas.*
