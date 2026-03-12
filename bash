==> Subindo Postgres local (Docker)...
==> Aguardando Postgres ficar saudável...
✓ Postgres pronto.
==> Aplicando schema e migrations...
==> Banco alvo: container docker 'postgres' (db: postgres)
✓ schema.sql (já aplicada)
✓ 002_org_config_and_crm.sql (já aplicada)
✓ 003_ai_benchmark_tables.sql (já aplicada)
✓ 004_training_logs.sql (já aplicada)
✓ 005_unit_economics_icp.sql (já aplicada)
✓ 006_saas_core.sql (já aplicada)
✓ 007_supho.sql (já aplicada)
→ Aplicando 008_supho_default_questions.sql
BEGIN
INSERT 0 15
INSERT 0 1
COMMIT
✓ 008_supho_default_questions.sql (ok)
==> Migrações finalizadas com sucesso.
==> Banco pronto.
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
