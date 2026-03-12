# Análise de melhorias do sistema RFY

Documento consolidado de oportunidades de melhoria identificadas no código, na operação e na experiência do produto. Base: exploração do repositório, docs (O_QUE_O_SAAS_OFERECE, REESTRUTURACAO_ESTRATEGICA, SUPHO-INTEGRATION) e padrões de uso.

---

## 1. Resumo executivo

| Área | Prioridade | Resumo |
|------|------------|--------|
| **Erros e feedback ao usuário** | Alta | Vários fetches silenciam erro (`.catch(()=>{})`); usuário não vê falha nem retry. |
| **Validação de entrada (API)** | Alta | Só webhooks CRM têm parser estruturado; demais rotas validam manualmente; sem Zod/schema compartilhado. |
| **Variáveis de ambiente** | Média | Supabase/client/admin usam `process.env.X!` sem checagem; app quebra em runtime se faltar. |
| **Loading e rotas** | Média | `loading.tsx` ausente em várias rotas (ex.: supho/diagnostico, supho/paip, settings). |
| **Testes** | Média | Cobertura em lib e algumas APIs; falta E2E crítico (login → dashboard → SUPHO). |
| **Observabilidade** | Média | Sem middleware de request ID; logs de erro não padronizados. |
| **Cache e performance** | Baixa | Sem React Query/SWR; refetch manual; possível otimização de chamadas repetidas (ex.: metrics/status). |
| **Documentação de env** | Baixa | `.env.example` não lista RESEND, ALERT_FROM_*, GOOGLE_AI_API_KEY. |

---

## 2. Erros e feedback ao usuário

### Problema

- Vários `fetch()` em componentes client usam `.catch(() => {})` ou não expõem erro na UI (apenas loading + silêncio ou console).
- Arquivos com padrão de erro silencioso ou incompleto: `SettingsClient.tsx`, `DemoPackForm.tsx`, `PAIPClient.tsx`, `DiagnosticoClient.tsx`, `UploadDropzone.tsx`, `login`/`signup`.

### Melhorias sugeridas

1. **Padrão único de tratamento:** Em toda chamada a API a partir do client, em caso de `!res.ok` ou exceção: definir estado de erro (ex.: `setError(parsed.error || 'Erro ao processar')`) e exibir toast ou mensagem inline (já existe `useToast` em `components/ui`).
2. **Retry opcional:** Para APIs críticas (ex.: metrics/status, settings), considerar retry com backoff ou botão "Tentar novamente" quando falhar.
3. **Remover `.catch(()=>{})` vazios:** Substituir por log (dev) + atualização de estado de erro para o usuário.

---

## 3. Validação de entrada nas APIs

### Problema

- Apenas webhooks CRM (`crm/validate`, `parsePiperunWebhookPayload`) usam validação estruturada com mensagens de erro claras.
- Demais rotas (alerts, settings, supho, upload, ai) validam body/query manualmente (casts, condicionais); não há schema compartilhado (ex.: Zod).

### Melhorias sugeridas

1. **Introduzir Zod (ou similar):** Criar schemas por rota ou por recurso (ex.: `schemas/alerts.ts`, `schemas/supho.ts`) e validar `await req.json()` com `schema.safeParse()`; em caso de falha, retornar 400 com `{ error, details: zodError.flatten() }`.
2. **Reutilizar schemas:** Tipos TypeScript podem ser inferidos de `z.infer<typeof schema>` para manter contrato API ↔ client alinhado.
3. **Priorizar rotas de escrita:** POST/PATCH de alerts/rules, settings, supho (campaigns, answers, respondents, paip/plans), upload e AI (interventions, benchmark, forecast).

---

## 4. Variáveis de ambiente e startup

### Problema

- `src/lib/supabase/client.ts`, `server.ts` e `admin.ts` usam `process.env.NEXT_PUBLIC_SUPABASE_URL!` e `SUPABASE_SERVICE_ROLE_KEY!` sem checagem; se faltar, o app quebra em runtime (erro genérico).
- A única checagem explícita é em `app/page.tsx` (landing) para `NEXT_PUBLIC_SUPABASE_URL`.

### Melhorias sugeridas

1. **Validação no carregamento do Supabase:** Em cada `createClient`, se `!url || !key` (ou no admin `!serviceRoleKey`), lançar erro com mensagem clara: "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local".
2. **Script de checagem (opcional):** `scripts/check-env.js` que lê `.env.local` e verifica variáveis obrigatórias antes de `npm run dev`/build; pode ser chamado no `postinstall` ou documentado no README.
3. **Documentar no `.env.example`:** Incluir RESEND_API_KEY, ALERT_FROM_EMAIL, ALERT_FROM_NAME, GOOGLE_AI_API_KEY com comentário (opcional para email/alertas e ICP).

---

## 5. Loading e consistência de rotas

### Problema

- Existe `loading.tsx` em `app/app/`, `app/app/dashboard/`, `uploads/`, `reports/`, `supho/maturidade/`, mas falta em `app/app/settings/`, `supho/diagnostico/`, `supho/paip/`, `supho/rituais/`, `supho/certificacao/`.

### Melhorias sugeridas

1. **Criar `loading.tsx`** nas rotas que ainda não têm, usando o mesmo padrão (ex.: Skeleton ou spinner) de `app/app/dashboard/loading.tsx`.
2. **Suspense boundaries:** Onde a página carrega vários blocos de dados (ex.: dashboard), considerar `<Suspense>` por seção para não bloquear toda a página.

---

## 6. Testes

### Situação atual

- Testes unitários em: `lib` (metrics, reports, crm, piperun, simulations), `api/ai` (interventions, benchmark, forecast), integração (alerts, crm webhook, piperun webhook).
- Não há E2E cobrindo fluxo completo: login → dashboard → SUPHO (diagnóstico, maturidade, PAIP).

### Melhorias sugeridas

1. **E2E crítico (Playwright):** Um fluxo mínimo: login com conta demo → dashboard carrega (RFY Index, cards) → navegação para SUPHO → Diagnóstico (lista campanhas) → Painel de Maturidade (exibe resultado ou estado vazio). Garante que quebras de auth ou de dados quebrem o build.
2. **Testes de API com schema:** Ao adotar Zod, testes que enviem payload inválido e esperem 400 com `details` coerentes.
3. **Cobertura de SUPHO:** Testes unitários para `computeDiagnosticResult`, `getCriticalItems`, e para as rotas `supho/diagnostic/compute`, `supho/answers`, `supho/campaigns`.

---

## 7. Observabilidade e operação

### Problema

- Não há middleware Next.js na raiz; refresh de sessão Supabase depende do uso em cada rota/layout.
- Logs de erro não padronizados (alguns `console.error`, outros só retorno 500 sem log estruturado).
- Terminais mostraram erro Supabase: "Could not find the table 'public.alerts' in the schema cache" — indica que após migration 010 (realtime_alerts) o schema do Supabase client pode precisar de reload ou que a tabela existe mas o cache do cliente não foi atualizado.

### Melhorias sugeridas

1. **Middleware opcional:** `middleware.ts` na raiz para renovar sessão Supabase (updateSession) nas rotas protegidas e, se desejado, injetar header `X-Request-Id` para rastreio.
2. **Log de erros em API:** Em catch de rotas API, logar `requestId`, `route`, `status`, `message` (sem PII) para um único formato (ex.: JSON) facilitando agregação.
3. **Tabela `alerts`:** Confirmar que a migration 010 foi aplicada no banco que o app usa e, se o erro persistir, verificar se o projeto Supabase (cloud) está com schema sincronizado; em local, garantir que `db:up` rodou até 010.

---

## 8. Performance e dados no client

### Problema

- Não há React Query nem SWR; componentes usam `useState` + `useEffect` + `fetch`; refetch é manual.
- Chamadas repetidas (ex.: `GET /api/metrics/status?org_id=...`) aparecem várias vezes no mesmo dashboard; pode haver duplicação de requisições.

### Melhorias sugeridas

1. **Centralizar chamadas do dashboard:** Um único hook ou contexto que busca metrics/status (e summary) uma vez por org e período, e repassa aos componentes; ou adotar SWR/React Query com mesma key para deduplicar.
2. **Stale-while-revalidate:** Para dados que não precisam ser em tempo real (ex.: resumo de métricas), considerar cache curto (ex.: 60s) para reduzir carga sem prejudicar UX.
3. **Lazy load de seções pesadas:** Blocos "Análise detalhada" ou gráficos secundários podem ser carregados sob demanda (expandir seção) em vez de tudo na primeira render.

---

## 9. Segurança (resumo)

- **Auth:** Uso de Supabase Auth + checagem de org em APIs (`requireAuthAndOrgAccess`, `getOrgIdForUser`) está coerente; admin só onde necessário.
- **RLS:** Políticas presentes em schema e migrações; código usa admin como fallback documentado em `auth.ts`.
- **Rate limit:** Presente em upload e possivelmente em outras rotas; Upstash opcional com comportamento definido quando não configurado.
- **Input:** Maior risco em rotas que aceitam JSON sem schema (ver seção 3); webhooks CRM já validados.

---

## 10. SUPHO e documentação

- **Código SUPHO:** Alinhado a SUPHO-METODOLOGIA e SUPHO-INTEGRATION; constantes, cálculos e textos executivos centralizados; prompt/questionário para GPT em `SUPHO-PROMPT-QUESTIONARIO-GPT.md`.
- **Melhorias possíveis:** Manter `SUPHO-METODOLOGIA.md` atualizado quando houver mudança de faixas ou fórmulas; considerar testes automatizados que comparem constantes (ex.: ITSMO_LEVEL_BANDS) com valores esperados pelo doc.

---

## 11. Priorização sugerida

| Ordem | Ação | Impacto | Esforço |
|-------|------|---------|---------|
| 1 | Tratamento de erro e feedback ao usuário (toast/estado) nos fetches do client | Alto (UX e confiança) | Médio |
| 2 | Validação com Zod nas rotas de escrita (alerts, settings, supho, upload) | Alto (segurança e consistência) | Médio |
| 3 | Checagem de env nos clientes Supabase + documentar env no .env.example | Médio (evitar quebra em prod) | Baixo |
| 4 | loading.tsx nas rotas que faltam (settings, supho/*) | Médio (UX) | Baixo |
| 5 | E2E mínimo (login → dashboard → SUPHO) | Alto (regressão) | Médio |
| 6 | Centralizar ou cachear chamadas metrics/status no dashboard | Médio (performance) | Baixo |
| 7 | Middleware de sessão + request ID e log de erros padronizado | Médio (operação) | Médio |

---

*Documento gerado a partir da exploração do repositório e da análise dos docs existentes. Recomenda-se revisar com a equipe e ajustar prioridades conforme roadmap.*
