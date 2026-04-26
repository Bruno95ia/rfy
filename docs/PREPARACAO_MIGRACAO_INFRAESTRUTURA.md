# Preparação para migração de infraestrutura (Cloud “padrão”) — RFY

**Objetivo:** preparar a migração do RFY para uma infraestrutura de cloud “padrão” (nuvem dedicada **Opus Tech**, hyperscaler AWS/GCP/Azure, ou híbrido), reduzindo risco de indisponibilidade, perda de dados e regressões — com **plano por fases**, **checklists**, **cutover** e **rollback**.

**Escopo deste documento:** preparação e execução da migração de infraestrutura (rede/compute/banco/observabilidade/segredos/DNS). Não cobre mudanças de produto; cobre o necessário para o sistema rodar com confiabilidade em ambiente gerenciado.

**Base no repositório:**

- Blueprint AWS (referência): `docs/INFRAESTRUTURA_AWS.md`
- Repasse técnico: `docs/REPASSE_SOFTWARE.md`
- Stack: Next.js + Postgres + Supabase Auth + Inngest + AI service opcional (ver `docs/DOCUMENTACAO_COMPLETA_RFY.md`)
- **Alvo Opus Tech:** secção [10) Estrutura Opus Tech](#10-estrutura-opus-tech-nuvem-dedicada--smart-it)

---

## 1) Decisões obrigatórias (antes de mexer em qualquer coisa)

Estas decisões evitam “migração eterna” e reduzem retrabalho.

- **Alvo de compute**
  - **Opus Tech (nuvem dedicada)**: normalmente **VMs dedicadas** (ex.: linha **Smart IT**) com rede e hardening no padrão do provedor; app pode rodar em Node/PM2, Docker ou orquestrador acordado com o time Opus
  - **Hyperscaler**: containers (ECS/Fargate, Cloud Run, Azure Container Apps/Kubernetes)
  - Alternativa: manter **Vercel** para Next.js e migrar “apenas” banco/segredos/observabilidade (menor risco)
- **Banco (Postgres)**
  - **Opus Tech:** Postgres em **VM dedicada** (Smart IT ou serviço acordado), com backup/replicação conforme contrato (**Smart Safe** / **Smart Mirror**)
  - **Hyperscaler:** Postgres gerenciado (RDS/Cloud SQL/Azure Database for PostgreSQL)
  - Definir se terá **alta disponibilidade / failover** já na primeira ida a produção (no hyperscaler: Multi-AZ; na Opus: espelhamento/DR contratado)
- **Auth/Storage**
  - **Manter Supabase Auth** (como está hoje) ou **migrar autenticação** para IdP cloud (mudança maior)
  - Storage de uploads: manter Supabase Storage vs S3/GCS/Blob (impacta código e permissões)
- **Jobs**
  - **Inngest Cloud** continua como SaaS externo (padrão atual) — apenas garantir URL pública estável do handler `/api/inngest`
- **IA**
  - AI service roda junto do app (interno) ou como serviço separado (recomendado)
  - Estratégia de artefatos (MLflow): S3/GCS/Blob vs volume efêmero + persistência externa
- **DNS e certificados**
  - Domínio(s) e subdomínios (ex.: `app.seudominio.com`, `api.seudominio.com`)
  - Autoridade DNS (Route 53/Cloud DNS/Azure DNS) e gestão de certificados (ACM/Managed certs)

> Resultado esperado desta seção: uma “folha de decisão” com escolhas e responsáveis. Sem isso, a migração vira uma sequência de exceções.

---

## 2) Inventário técnico (o que existe hoje e precisa ser migrado/repontado)

### 2.1 Componentes do sistema

- **App (Next.js)**: UI + Route Handlers (`src/app/api/*`)
- **Banco Postgres**: schema + migrations em `supabase/sql/`
- **Supabase Auth**: projeto/keys (anon + service role)
- **Jobs (Inngest)**: app/projeto, keys, handler `/api/inngest`
- **AI service (Python, opcional)**: `ai-service/` (porta 8001 em dev)
- **Redis (opcional)**: rate limit via **Upstash** (`UPSTASH_REDIS_*`) ou cache gerenciado
- **Email (Resend)**: `RESEND_API_KEY` e templates/fluxos

### 2.2 Variáveis e segredos (inventário mínimo)

Referência canônica: `.env.example` e `docs/REPASSE_SOFTWARE.md` (secção de envs).

- **Banco**: `DATABASE_URL` (e `AI_DATABASE_URL` se aplicável)
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **App**: `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY`
- **Jobs**: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`
- **IA**: `AI_SERVICE_URL` (e segredos do AI se houver)
- **Email**: `RESEND_API_KEY` (e parâmetros de alerta/convite)
- **Redis/rate limit**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Ação de preparação:**

- Criar um **mapa de segredos** com:
  - nome, onde fica hoje, onde ficará na cloud (Secret Manager/Parameter Store), rotação, dono
  - quais segredos são **build-time** (NEXT_PUBLIC*) vs **runtime**

### 2.3 Dependências externas

- **Supabase** (Auth/possível Storage)
- **Inngest Cloud**
- **Resend**
- **Google AI / OpenAI** (se usado)
- **Upstash** (se mantido)

**Ação de preparação:**

- Listar para cada SaaS: conta, projeto, plano, limites, billing, credenciais, URLs de callback/webhook, e contato técnico.

---

## 3) Requisitos não-funcionais (SLO e governança)

Defina explicitamente antes da migração:

- **Disponibilidade**: alvo (ex.: 99,5% ou 99,9%) e janelas de manutenção
- **RPO/RTO**: quanto de dado pode ser perdido (RPO) e quanto tempo pode ficar fora (RTO)
- **Backups**: frequência, retenção, e **teste de restore** (obrigatório)
- **Observabilidade**: logs, métricas, alarmes e rastreio de erros
- **Segurança**: segredos fora do código, least privilege, e controles de rede

> Se não houver SLO/RPO/RTO definidos, “migrar” vira “torcer”.

---

## 4) Estratégia de migração (recomendada)

### 4.1 Migração em 2 fases (staging → produção)

- **Fase A — Staging (obrigatória)**
  - Montar infraestrutura “padrão” com o mesmo desenho de produção
  - Exercitar deploy, migrations, seed mínimo, e smoke tests
  - Ajustar observabilidade e runbooks

- **Fase B — Produção**
  - Criar recursos finais (ou promover os de staging quando apropriado)
  - Executar migração de dados e cutover com plano de rollback

### 4.2 Cutover recomendado (baixo risco)

- **Preferir DNS cutover** (troca do destino do domínio) com TTL baixo previamente
- **Preferir “dual write” apenas se necessário** (aumenta complexidade)
- Para banco, usar:
  - **pg_dump/pg_restore** (simples, janela de manutenção) **ou**
  - **replicação/CDC** (menos downtime, maior complexidade)

---

## 5) Checklist de preparação (antes de criar recursos)

### 5.1 Repositório e build

- [ ] `npm run build` passa localmente com envs equivalentes ao alvo
- [ ] Health check definido e estável (ex.: criar/confirmar endpoint `/api/health`)
- [ ] Rotas de callback/webhook identificadas: `/api/inngest`, `/api/crm/*`

### 5.2 Banco e dados

- [ ] Confirmar fonte de migrations: `supabase/sql/schema.sql` + `supabase/sql/migrations/001...008`
- [ ] Definir política de migrations em produção (job, pipeline, ou execução manual controlada)
- [ ] Validar collation/timezone e extensões necessárias no Postgres gerenciado
- [ ] Plano de backup e restore documentado e testado em staging

### 5.3 Segredos e configuração

- [ ] Definir cofre de segredos (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault)
- [ ] Separar envs por ambiente: `dev`, `staging`, `prod`
- [ ] Confirmar quais envs precisam estar disponíveis em runtime (containers) vs build

### 5.4 Observabilidade e operação

- [ ] Logs centralizados por serviço (app, ai-service)
- [ ] Métricas mínimas: latência, 5xx, CPU/mem, conexões DB, espaço em disco DB
- [ ] Alarmes mínimos: erro 5xx, health check falhando, DB sem espaço, task restart loop
- [ ] Runbooks: deploy/rollback, migrations, incidentes comuns

### 5.5 Segurança

- [ ] Política de rede: banco só acessível a partir do compute; sem exposição pública
- [ ] Privilégios mínimos: role do compute apenas com permissões necessárias (ex.: ler secrets, escrever logs, ler/gravar artifacts)
- [ ] Rotação planejada para segredos críticos (ao menos `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `DATABASE_URL`)

---

## 6) Infra “cloud padrão” (desenho mínimo recomendado)

### 6.1 Componentes mínimos

- **Rede**: VPC/VNet + subnets públicas/privadas + saída controlada (NAT)
- **Load balancer**: HTTPS com certificado gerenciado, health checks
- **Compute**: containers com autoscaling básico (min >= 2 para app em produção)
- **Banco**: Postgres gerenciado com backups e, idealmente, Multi-AZ (ou plano de failover)
- **Segredos**: cofre gerenciado
- **Observabilidade**: logs + métricas + alarmes

### 6.2 Referência AWS

Se o alvo for AWS, use como mapa inicial: `docs/INFRAESTRUTURA_AWS.md` (VPC, ECS/Fargate, ALB, RDS, ECR, Secrets Manager, CloudWatch, Route 53/ACM).

### 6.3 Referência Opus Tech (resumo)

Para o desenho completo e checklist operacional, use a [secção 10](#10-estrutura-opus-tech-nuvem-dedicada--smart-it).

---

## 7) Plano de execução (passo a passo)

### 7.1 Staging

- [ ] Provisionar infra mínima (rede, compute, secrets, logs)
- [ ] Subir Postgres gerenciado (staging)
- [ ] Aplicar migrations (todas) e seed mínimo (usuário/org de teste)
- [ ] Deploy do app (e ai-service se aplicável)
- [ ] Configurar `NEXT_PUBLIC_APP_URL` e validar cookies/sessão (Supabase)
- [ ] Validar Inngest: handler público acessível, keys configuradas, job executa
- [ ] Smoke test:
  - login
  - dashboard
  - upload CSV + processamento
  - geração/atualização de relatório

### 7.2 Produção (pré-cutover)

- [ ] Provisionar infra de produção (equivalente a staging, com sizing e HA)
- [ ] Configurar observabilidade e alarmes antes do tráfego real
- [ ] Preparar banco de produção (instância, parâmetro, backups)
- [ ] Preparar migração de dados (método escolhido: dump/restore ou replicação)
- [ ] Preparar DNS:
  - baixar TTL com antecedência
  - documentar registros (A/AAAA/CNAME) e reversão

### 7.3 Cutover (janela)

- [ ] Colocar app antigo em modo “somente leitura” (se aplicável) **ou** congelar writes por janela
- [ ] Executar migração de dados
- [ ] Validar integridade básica:
  - contagem de tabelas-chave
  - queries de sanidade (ex.: orgs, members, reports)
- [ ] Subir app novo apontando para DB novo
- [ ] Trocar DNS para nova infra
- [ ] Monitorar métricas/erros por 60–120 min após o cutover

### 7.4 Rollback (obrigatório ter pronto, mesmo que não use)

Definir com antecedência o gatilho de rollback (ex.: erro 5xx acima de X%, login quebrado, jobs falhando).

- **Rollback de DNS**: voltar registros para infra anterior
- **Rollback de banco**:
  - se houve writes na infra nova, decidir se:
    - aceita perda (RPO) e volta o tráfego, ou
    - mantém a nova e corrige (sem rollback)

---

## 8) Riscos comuns (e mitigação)

- **Migração de DB subestimada**
  - Mitigação: ensaio completo em staging com dump/restore e medição de tempo
- **Segredos faltando / env inconsistente**
  - Mitigação: inventário e validação por ambiente; checklist de runtime envs
- **Handler do Inngest inacessível**
  - Mitigação: health check + teste de job em staging e imediatamente após DNS cutover
- **Auth/Supabase com URLs erradas**
  - Mitigação: conferir `NEXT_PUBLIC_APP_URL`, redirects/callbacks no Supabase, cookies/headers no LB
- **Observabilidade insuficiente**
  - Mitigação: logs estruturados e alarmes mínimos antes do primeiro tráfego

---

## 9) Entregáveis (o que “pronto para migrar” significa)

- **Documento de decisão** (alvo de compute/banco/auth/storage/jobs/IA)
- **Mapa de segredos por ambiente** (dev/staging/prod) e cofre configurado
- **Staging rodando** com smoke test aprovado
- **Runbooks**: deploy, migrations, incidentes, rollback
- **Plano de cutover** com janela, responsáveis e critérios de rollback

---

## 10) Estrutura Opus Tech (nuvem dedicada / Smart IT)

Esta secção adapta a preparação de migração ao modelo típico da **Opus Tech**: infraestrutura **dedicada** (não multitenant “genérico”), com serviços comerciais que costumam incluir **backup**, **monitoramento** e opções de **continuidade** — alinhados às linhas **Smart IT**, **Smart Safe**, **Smart Vision**, **Smart Mirror** e camada de **segurança de perímetro** (firewall / proteções), conforme catálogo público da empresa.

> **Importante:** nomes de produto, SLAs, dimensionamento exato de VM, política de firewall e procedimentos de NOC devem ser **confirmados no contrato e com o time comercial/técnico da Opus**. O quadro abaixo é um **mapeamento lógico** do RFY para esse tipo de ambiente, não substitui o runbook do provedor.

### 10.1 Princípios ao hospedar o RFY na Opus

- **Separar papéis por VM (recomendado em produção):** ao menos **app (Next.js)** e **Postgres** em hosts distintos; **AI service** em VM própria se houver treino ou carga de inferência relevante.
- **Expor só o necessário:** tráfego **HTTPS (443)** para o app; Postgres **sem IP público**; comunicação app → DB apenas na rede interna/VLAN fornecida pela Opus.
- **SaaS externos permanecem:** **Supabase Auth**, **Inngest**, **Resend**, eventual **Google AI/OpenAI**, **Upstash** — as VMs precisam de **saída HTTPS** para a Internet nas rotas acordadas (ou proxy corporativo, se for o caso).
- **Jobs:** o endpoint `POST /api/inngest` deve ser alcançável **publicamente** pela Inngest Cloud (ou pelo runner que vocês usarem), atrás do mesmo hostname do app ou de um subdomínio dedicado.

### 10.2 Mapeamento: componente RFY × camada Opus (típico)

| Componente RFY | Onde rodar (padrão Opus) | Observação |
|----------------|---------------------------|------------|
| Next.js (UI + `/api/*`) | **Smart IT** — VM(s) app ou par de VMs com LB reverso | TLS no LB/nginx/traefik; health check HTTP interno |
| PostgreSQL | **Smart IT** — VM DB dedicada ou serviço de banco acordado | Backups alinhados ao **Smart Safe** / política contratada; testar restore |
| AI service (`ai-service/`) | **Smart IT** — VM separada (recomendado) | Não precisa URL pública; `AI_SERVICE_URL` interno (rede privada) |
| Redis (rate limit) | Manter **Upstash** **ou** Redis em VM/Smart IT | Se Redis interno: restringir porta às VMs do app |
| Segredos | Arquivo restrito + permissões, **Vault** se a Opus disponibilizar, ou cofre do cliente | Nunca commitar; rotacionar após handoff |
| Backup de dados | **Smart Safe** (e política de retenção contratada) | Incluir Postgres + artefatos de modelo se armazenados em disco |
| DR / failover | **Smart Mirror** (se contratado) | Definir RPO/RTO com o plano Opus |
| Monitoramento / alertas | **Smart Vision** (se contratado) | CPU, memória, disco, serviço down, latência HTTP |
| Perímetro | **Smart Firewall** / defender conforme pacote | Regras mínimas: 443 entrada; saída HTTPS para SaaS listados |

### 10.3 Rede e firewall (checklist)

- [ ] Endereço público ou LB apenas para o **serviço web** (app).
- [ ] Regra de entrada **443** → processo do Next (ou reverse proxy).
- [ ] Postgres: acesso **somente** a partir do(s) IP(s) interno(s) do app (e bastion/jump se usado).
- [ ] Saída **HTTPS (443)** permitida para: Supabase, Inngest, Resend, provedores de IA e Upstash (ajustar lista ao `.env` real).
- [ ] **MTU / proxy:** se houver proxy HTTP corporativo, validar que o runtime Node/Python e o cliente Postgres suportam o cenário.

### 10.4 DNS e TLS

- [ ] Definir hostname(s) (ex.: `app.cliente.com.br`) — registro na Opus ou no DNS do cliente apontando para o IP/LB.
- [ ] Certificado TLS (Let’s Encrypt no proxy, certificado gerenciado ou certificado do cliente).
- [ ] Atualizar **`NEXT_PUBLIC_APP_URL`** e URLs/callbacks no painel **Supabase** após o hostname final.

### 10.5 Dimensionamento inicial (referência — validar com a Opus)

Valores são **ponto de partida** para piloto ou carga baixa; o time Opus deve dimensionar com base em usuários concorrentes, tamanho do banco e uso de IA.

| Papel | vCPU / RAM (partida) | Disco (partida) |
|-------|----------------------|------------------|
| App (Next.js) | 2 vCPU / 4 GB | SSD adequado a logs e deploy |
| Postgres | 2 vCPU / 8 GB | SSD com folga para crescimento + IOPS acordados |
| AI service (opcional) | 2 vCPU / 4–8 GB | Se modelos em disco: volume dedicado ou sync para backup |

### 10.6 Cutover específico (Opus)

- [ ] **Staging** em VM(s) homóloga(s) com mesma versão de SO e patch que produção.
- [ ] Ensaiar **migrations** e **restore** de backup no ambiente de homologação.
- [ ] No dia: congelar escrita ou janela curta; **dump/restore** ou estratégia acordada com DBAs Opus.
- [ ] Após DNS: validar **login (Supabase)**, **upload + Inngest**, **relatório**, e chamadas a **`/api/ai/*`** se IA estiver ativa.
- [ ] Abrir chamado/canal com **NOC Opus** para período de observação pós-cutover (se incluído no contrato).

### 10.7 O que pedir explicitamente à Opus antes da migração

- Planta de rede (VLAN, IPs, gateway, LB).
- Política de **backup** (frequência, retenção, restore testado) e responsável pela execução.
- SLA de **hardware/rede** e tempo de resposta para incidente.
- Se **Smart Mirror** ou equivalente está ativo: procedimento de failover e quem aciona.
- Lista de portas e **allowlist** de destinos SaaS se o firewall for restritivo.

