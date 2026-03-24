# Descritivo do sistema RFY (Revenue Friction Engine)

Este documento descreve, em linguagem corrida, o que o RFY é, para quem serve, como se organiza e que peças técnicas o sustentam. Serve como leitura única para onboarding, documentação interna ou base para materiais de produto.

---

## O que é o RFY

O **RFY — Revenue Friction Engine** é uma aplicação SaaS pensada para equipas de **revenue**, **vendas** e **liderança comercial**. O objetivo central é tornar visível a diferença entre o que a organização *declara* ou *espera* receber e o que é **estatisticamente mais confiável** dado o estado real do pipeline — o chamado contraste entre **receita inflada** e **receita confiável**, sintetizado em indicadores como o **RFY Index** e em leituras de **fricção** (onde o pipeline trava, estagna ou perde qualidade).

Na prática, o utilizador ingere dados de oportunidades e atividades (por exemplo via **CSV** alinhado ao ecossistema PipeRun ou por **integrações** e **webhooks**), e o sistema processa, gera relatórios e alimenta um **dashboard** com visão executiva, alertas e, quando configurado, camadas de **inteligência artificial** (previsões, benchmarks, sugestões de intervenção).

O produto é **multi-tenant**: cada organização tem os seus dados, membros, limites de uso e, se aplicável, subscrição. O primeiro acesso pode criar conta ou usar fluxos de convite; em muitos cenários de demonstração existe uma **conta demo** para acelerar testes.

---

## O módulo SUPHO

O **SUPHO** não é um produto separado, mas um **conjunto de funcionalidades** dentro do mesmo aplicativo, focado em **maturidade comercial**, **diagnóstico**, **rituais**, **PAIP** (planeamento) e **certificação**. Integra-se com formulários, campanhas de resposta e importações de dados externos, para apoiar metodologias de avaliação e governança (incluindo referências a níveis ITSMO e fluxos de maturidade).

Quem usa o RFY para pipeline e KPIs pode usar o SUPHO como camada de **organização e disciplina** sobre o mesmo contexto de negócio; a navegação concentra-se nas rotas `/app/supho/*`.

---

## Jornada típica do utilizador

Um utilizador autenticado entra na **Torre de Controle** (navegação principal): acede ao **dashboard** de receita, faz **uploads** de ficheiros ou configura **integrações** e **webhooks** em **Configurações**. Pode convidar colegas, gerir **pessoas** e membros da organização, consultar **relatórios** exportáveis, explorar **previsão** e **IA** quando disponíveis, e acompanhar **alertas** configuráveis.

Se ainda não houver dados suficientes, o dashboard mostra um **estado vazio** orientado: passos sugeridos (upload, processamento, exploração). Quando o processamento assíncrono está ativo, o utilizador espera a fila de trabalhos; **sem fila**, o sistema pode degradar para processamento síncrono em certos fluxos, para não bloquear totalmente a experiência.

---

## Arquitetura em termos simples

Do ponto de vista de **software**, o RFY é uma aplicação **monolítica** em **Next.js** (interface e API no mesmo projeto), com **App Router** e rotas de servidor em `src/app/api`. A interface é **React** com **Tailwind CSS**; a identidade visual usa tokens de cor e componentes reutilizáveis (por exemplo, cabeçalhos de página e um *shell* de aplicação com barra lateral).

A **persistência** é **PostgreSQL**, acedida diretamente pelo servidor Node através de um *pool* de ligações. O **Supabase** pode existir como opção legada ou para integrações, mas o **login e sessão principais** são **próprios**: cookie de sessão, tabelas de utilizadores e sessões na base de dados, palavras-passe com hash moderno.

Trabalhos **longos** e **repetíveis** (pós-upload, sincronizações, envio agendado de relatórios) recorrem ao **Inngest** quando configurado. O **serviço de IA** em Python corre à parte, exposto por URL; a aplicação Next chama-o e persiste resultados conforme o desenho das rotas e tabelas.

O **billing** segue o padrão **Stripe** (checkout, webhook, estado de subscrição). **E-mail** transacional (alertas, convites) pode usar **Resend** quando as chaves estão definidas. **Rate limiting** pode usar **Redis** (Upstash) em cenários de produção.

Em **produção**, o build gera um pacote **standalone** do Node; o arranque costuma ser `node` sobre o servidor embebido, com cópia explícita de ficheiros estáticos e da pasta `public` para evitar 404 em CSS e JS.

---

## Dados, SaaS e governança

O modelo de dados inclui entidades de **SaaS**: planos, subscrições, limites de uso, eventos de uso, papéis em org, auditoria, canais e regras de **alertas**, chaves de API, *webhooks* de saída, agendamentos de relatório, passos de onboarding e extensões de qualidade de dados e planeamento. Isto permite operar o produto como serviço cobrado, com **RBAC** e trilhas de auditoria.

As **migrations** SQL versionadas no repositório são a referência para evoluir o schema; em ambientes locais costuma usar-se Docker para Postgres; em cloud, a mesma cadeia de migrations aplica-se à instância gerida.

---

## Qualidade, testes e demonstração

O código inclui testes unitários (**Vitest**) e testes de ponta a ponta (**Playwright**). Existe um roteiro que grava um **vídeo de demonstração** (formato WebM) e o armazena em `docs/demo/`, para apresentações rápidas sem depender de gravação manual.

---

## Limitações e dependências operacionais

Para o sistema comportar-se como “completo”, é necessário **PostgreSQL acessível**, variáveis de ambiente mínimas (URL da app, base de dados, diretório de uploads, chave de criptografia para segredos), e — para pipelines assíncronos — **Inngest** configurado. Para **IA** avançada, o **serviço Python** e o respetivo URL. Sem e-mail configurado, convites e alertas por correio podem ficar limitados a registos na base de dados ou filas.

---

## Resumo em uma frase

**O RFY é uma plataforma de análise e governança de receita com dashboard, alertas, integrações e IA opcional, multi-organização e com billing Stripe, complementada pelo módulo SUPHO de maturidade e disciplina comercial.**

