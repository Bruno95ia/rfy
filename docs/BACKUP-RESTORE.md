# Backup e restauração do Postgres (RFY)

## Backup

Use o script `scripts/backup-db.sh`. Requer `DATABASE_URL` e `pg_dump` no PATH.

```bash
# Backup no diretório atual (ou passe um diretório como argumento)
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
./scripts/backup-db.sh
# ou
./scripts/backup-db.sh /caminho/backups
```

Saída: `backup_YYYYMMDD_HHMMSS.sql.gz`.

**Produção:** agende via cron (ex.: diário às 2h):

```cron
0 2 * * * cd /app && DATABASE_URL="..." ./scripts/backup-db.sh /backups
```

## Restauração

1. **Pare a aplicação** que usa o banco (evitar escritas durante o restore).

2. **Opção A — banco vazio (substituir tudo):**
   ```bash
   gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL" -f -
   ```

3. **Opção B — criar banco novo e restaurar:**
   ```bash
   createdb -h host -U user rfy_restore
   export DATABASE_URL="postgresql://user:pass@host:5432/rfy_restore"
   gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL" -f -
   ```

4. **Validação:** conferir tabelas e contagens:
   ```sql
   \dt
   SELECT COUNT(*) FROM orgs;
   SELECT COUNT(*) FROM reports;
   ```

5. **Teste de restauração:** recomenda-se rodar restore em ambiente de staging pelo menos mensalmente para validar o procedimento e os backups.
