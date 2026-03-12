# Dev 100% local com Supabase (Auth + Postgres)

Quando você usa **apenas** Postgres no Docker (`docker compose up -d postgres`), o **login** ainda depende do **Supabase em nuvem**. Se o projeto Supabase estiver pausado, as chaves estiverem erradas ou você quiser trabalhar offline, o login falha.

Para ter **Auth e banco totalmente locais**, use o **Supabase local** (stack em Docker: Auth + Postgres + Studio).

## Passos

1. **Subir o Supabase local**
   ```bash
   npx supabase start
   ```
   Na primeira vez pode demorar (download de imagens).

2. **Ver URL e chaves**
   ```bash
   npx supabase status
   ```
   Anote:
   - **API URL** (ex.: `http://127.0.0.1:54321`)
   - **anon key**
   - **service_role key**

3. **Configurar `.env.local`**
   No `.env.local` defina:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do status>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key do status>
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   AI_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```
   (Postgres do Supabase local usa a porta **54322**.)

4. **Aplicar migrations e criar usuário demo**
   ```bash
   npm run supabase:local
   ```
   Isso aplica o schema/migrations no Postgres local e cria o usuário **admin@demo.rfy.local** / **Adminrv**.

5. **Rodar o app**
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000 e faça login com as credenciais demo.

## URLs úteis (Supabase local)

| Serviço   | URL                      |
|-----------|--------------------------|
| API (Auth)| http://127.0.0.1:54321  |
| Studio    | http://127.0.0.1:54323   |
| Postgres  | localhost:54322          |

## Parar o Supabase local

```bash
npx supabase stop
```

Para limpar dados e subir de novo:

```bash
npx supabase stop --no-backup
npx supabase start
npm run supabase:local
```
