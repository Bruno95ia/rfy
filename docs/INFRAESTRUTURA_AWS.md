# Estrutura AWS para o RFY

Este documento descreve a estrutura de recursos a ser criada na AWS para rodar o RFY em produção, com base no [plano de infraestrutura em nuvem](.cursor/plans/infraestrutura_nuvem_rfy_9a79365a.plan.md).

---

## 1. Visão geral

| Camada        | Serviço AWS                    | Uso no RFY                          |
|---------------|--------------------------------|-------------------------------------|
| Rede          | VPC, Subnets, NAT Gateway      | Isolamento e acesso à internet      |
| Compute       | ECS (Fargate)                  | Next.js + AI Service (containers)   |
| Load balance  | ALB + Target Groups            | Tráfego HTTPS para o app            |
| Banco         | RDS (PostgreSQL)               | Dados da aplicação                  |
| Cache         | ElastiCache (Redis) ou Upstash | Rate limit (ou manter Upstash)      |
| Storage       | S3 + EFS (opcional)            | Artifacts MLflow, uploads, modelos  |
| Registry      | ECR                            | Imagens Docker (app + ai-service)   |
| Secrets       | Secrets Manager                | DATABASE_URL, API keys, etc.        |
| DNS / Cert    | Route 53 + ACM                 | Domínio e HTTPS                     |
| Observabilidade | CloudWatch (Logs, Métricas)  | Logs e alertas                      |

SaaS externos continuam como estão: **Supabase** (Auth/Storage), **Inngest Cloud**, **Resend**, **Google AI**; Redis pode permanecer **Upstash** em cenário inicial.

---

## 2. Estrutura de recursos por serviço

### 2.1 Rede (VPC)

```
VPC (ex.: 10.0.0.0/16)
├── Subnet pública A (10.0.1.0/24)  — ALB, NAT
├── Subnet pública B (10.0.2.0/24)  — ALB, NAT (multi-AZ)
├── Subnet privada A (10.0.10.0/24) — ECS, RDS, ElastiCache
├── Subnet privada B (10.0.11.0/24) — ECS, RDS, ElastiCache
├── Internet Gateway
├── NAT Gateway (em cada AZ, para saída dos privados)
└── Route tables (públicas → IGW; privadas → NAT)
```

- **Objetivo:** ECS e RDS em subnets privadas; ALB nas públicas; saída controlada via NAT.

---

### 2.2 Compute — ECS (Fargate)

| Recurso              | Descrição |
|----------------------|-----------|
| **Cluster ECS**      | 1 cluster (ex.: `rfy-production`) |
| **Task Definition – App (Next.js)** | 1 vCPU, 2 GB RAM (inicial); 2 vCPU, 2–4 GB (crescimento). Porta 3000. |
| **Task Definition – AI Service**  | 1 vCPU, 2 GB RAM (inicial); 2 vCPU, 4 GB (treino/crescimento). Porta 8001. |
| **Task Definition – MLflow** (opcional) | 0.5 vCPU, 1 GB RAM. Porta 5000. |
| **Service – App**    | 2 tarefas (min); subnets privadas; health check em `/api/health` ou similar. |
| **Service – AI**     | 1 tarefa (min) ou scale-to-zero conforme custo; health check em `/health` ou `/api/ai/status`. |
| **Service – MLflow** | 1 tarefa se usar MLflow na AWS. |

- **Imagens:** build a partir do `Dockerfile` (Next) e `ai-service/Dockerfile`; push no **ECR** (um repositório por serviço).
- **Variáveis:** `DATABASE_URL`, `AI_SERVICE_URL`, Supabase, Resend, Google AI, Inngest, etc. via **Secrets Manager** e env vars na task definition (referência a secrets).

---

### 2.3 Load balancer

| Recurso        | Descrição |
|----------------|-----------|
| **ALB**        | 1 Application Load Balancer nas subnets públicas (2 AZs). |
| **Target Group – App** | Porta 3000; protocolo HTTP; health check no path do Next (ex.: `/api/health`). |
| **Target Group – AI**  | Porta 8001; uso interno (apenas Next chamando); pode ser target group interno ou mesmo ALB com regra por host/path. |
| **Listener 443** | HTTPS; certificado no **ACM**; encaminha tráfego para o Target Group do App. |
| **Listener 80**  | Redirect 80 → 443. |

- **Segurança:** AI Service não precisa de URL pública; apenas o Next (no mesmo VPC ou via service discovery) chama `AI_SERVICE_URL` (URL interna do ALB ou do serviço ECS).

---

### 2.4 Banco de dados — RDS (PostgreSQL)

| Recurso     | Cenário A (inicial) | Cenário B (crescimento) |
|------------|----------------------|--------------------------|
| **Engine** | PostgreSQL 16        | PostgreSQL 16            |
| **Instância** | db.t3.micro/small (2 vCPU, 2–4 GB RAM) | db.t3.medium ou superior (2–4 vCPU, 8 GB RAM) |
| **Storage** | 20–50 GB (gp3)     | 50–100 GB (gp3)          |
| **Multi-AZ** | Opcional (1 instância) | Sim (failover)        |
| **Subnets** | Subnets privadas (DB subnet group) | Idem |
| **Security Group** | Porta 5432 apenas a partir do security group do ECS (e opcionalmente bastion). | Idem |

- **Migrations:** executar via job ECS ou pipeline (scripts em `scripts/db-migrate.sh`, migrations 002–008).
- **Backup:** backup automático habilitado; retenção 7 dias (mínimo); PITR se necessário.

---

### 2.5 Cache — ElastiCache (Redis) — opcional

Se **não** usar Upstash:

| Recurso   | Descrição |
|-----------|-----------|
| **Cluster** | Redis 7; 1 nó (cache.t3.micro ou small). |
| **Subnets** | Subnets privadas (subnet group para ElastiCache). |
| **Security Group** | Porta 6379 apenas a partir do security group do ECS. |

Se manter **Upstash:** nenhum recurso ElastiCache; apenas configurar `UPSTASH_REDIS_*` no app.

---

### 2.6 Storage

| Recurso   | Uso no RFY |
|-----------|------------|
| **Bucket S3 – artifacts** | MLflow artifacts e modelos (.joblib). Política: acesso apenas pela role do ECS (AI Service). Lifecycle opcional para antigos. |
| **Bucket S3 – uploads** (opcional) | Se não usar Supabase Storage para uploads; caso contrário, manter Supabase. |
| **EFS** (opcional) | Volume compartilhado entre tarefas ECS (ex.: `/artifacts` do AI Service) se não quiser só S3; mais simples começar com volume efêmero + S3. |

- **AI Service:** `AI_ARTIFACTS_PATH` pode apontar para volume efêmero e sincronizar com S3 (script no container) ou usar SDK S3 direto para modelos.

---

### 2.7 Registry e secrets

| Recurso        | Descrição |
|----------------|-----------|
| **ECR**        | 2 repositórios: `rfy-app`, `rfy-ai-service`; (opcional) `rfy-mlflow`. Lifecycle policy para limitar número de imagens. |
| **Secrets Manager** | Secrets: `rfy/prod/DATABASE_URL`, `rfy/prod/SUPABASE_SERVICE_ROLE_KEY`, `rfy/prod/GOOGLE_AI_API_KEY`, `rfy/prod/RESEND_*`, `rfy/prod/INNGEST_*`, `rfy/prod/ENCRYPTION_KEY`, `rfy/prod/train_secret`, etc. ECS task definition referencia por ARN. |

---

### 2.8 DNS e certificado

| Recurso   | Descrição |
|-----------|-----------|
| **Route 53** | Hosted zone do domínio; registro A (alias) para o ALB. |
| **ACM**   | Certificado SSL/TLS para o domínio (ex.: `app.seudominio.com`); validado por DNS (Route 53); associado ao listener 443 do ALB. |

---

### 2.9 Observabilidade

| Recurso     | Descrição |
|-------------|-----------|
| **CloudWatch Log Groups** | Um por serviço: `/ecs/rfy-app`, `/ecs/rfy-ai-service`, `/ecs/rfy-mlflow`. ECS envia logs via awslogs driver. |
| **CloudWatch Metrics**   | Métricas padrão do ECS (CPU, memória); RDS; ALB (request count, latency). |
| **Alarms** (opcional)    | Alta CPU/memória ECS; falha de health check ALB; espaço em disco RDS. |
| **Health checks**        | Endpoint do Next (ex.: `/api/health`); endpoint do AI (ex.: `/health` ou `/api/ai/status`). |

---

## 3. Resumo da estrutura (lista de recursos)

Criar na ordem sugerida:

1. **VPC** + subnets (públicas e privadas) + IGW + NAT + route tables.
2. **Security groups:** ALB (443/80); ECS (3000, 8001, 5000); RDS (5432); ElastiCache (6379) se usar.
3. **ECR:** repositórios para app e ai-service.
4. **Secrets Manager:** secrets de produção (não colocar valores no código).
5. **RDS:** subnet group, instância PostgreSQL, SG.
6. **ElastiCache** (opcional): subnet group, cluster Redis, SG.
7. **S3:** bucket(s) para artifacts (e uploads se não usar Supabase).
8. **ECS:** cluster; task definitions (app, ai-service, opcional mlflow); services.
9. **ALB:** load balancer, target groups, listeners 80/443.
10. **ACM:** certificado; **Route 53:** hosted zone e registro para o ALB.
11. **CloudWatch:** log groups; alarmes opcionais.

---

## 4. Dimensionamento de referência (AWS)

| Fase        | Next.js (ECS)     | AI Service (ECS)  | RDS              | Redis              |
|------------|-------------------|-------------------|------------------|--------------------|
| **Inicial (A)** | 1× 0.25 vCPU, 0.5 GB (Fargate 0.25) ou 1× 0.5 vCPU, 1 GB | 1× 0.25–0.5 vCPU, 0.5–1 GB (scale-to-zero possível) | db.t3.micro, 20 GB | Upstash (sem ElastiCache) |
| **Crescimento (B)** | 2× 0.5–1 vCPU, 1–2 GB | 1–2× 1 vCPU, 2 GB | db.t3.small/medium, 50 GB | ElastiCache cache.t3.micro ou Upstash |
| **Controle total (C)** | 2× 1 vCPU, 2 GB | 1–2× 2 vCPU, 4 GB | db.t3.medium ou maior, multi-AZ | 1 nó ElastiCache small |

---

## 5. Checklist de implantação AWS

- [ ] VPC e subnets criadas (2 AZs).
- [ ] Security groups: ALB, ECS, RDS, (ElastiCache).
- [ ] ECR: repositórios criados; CI/CD ou script de build e push.
- [ ] Secrets Manager: todos os secrets de prod criados; task definitions referenciando por ARN.
- [ ] RDS: criado; migrations aplicadas; `DATABASE_URL` no secret.
- [ ] S3: bucket de artifacts; política para ECS; `AI_ARTIFACTS_PATH` ou integração S3 no AI Service.
- [ ] ECS: cluster; task definitions (app, ai-service); services apontando para ALB (app) e interno (ai).
- [ ] ALB: listeners 80/443; certificado ACM; target groups com health check.
- [ ] Route 53: registro do domínio para o ALB.
- [ ] Variáveis no app: `NEXT_PUBLIC_APP_URL`, `AI_SERVICE_URL` (URL interna do AI no ECS/ALB).
- [ ] Inngest: app registrado; webhook acessível pela internet (URL do Next no ALB).
- [ ] CloudWatch: log groups; verificar logs do app e do AI Service.

Esta estrutura cobre o que deve ser criado na AWS para rodar o RFY conforme o plano de infraestrutura em nuvem (cenários A/B/C).
