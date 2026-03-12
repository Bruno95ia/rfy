# Estrutura e fluxo Git – RFY

## Repositório

- **Branch padrão:** `main`
- O histórico deve refletir o que está em produção ou pronto para deploy.

## Boas práticas

1. **Commits:** mensagens objetivas em português ou inglês, no imperativo (ex.: "Adiciona endpoint de export CSV", "Corrige cálculo de pillar score").
2. **Branches de feature:** opcional usar `feature/nome-da-feature` ou `fix/nome-do-fix` e fazer merge em `main` após revisão/testes.
3. **Não commitar:** `.env`, `.env.local`, chaves, `node_modules`, `.next`, `tmp/`, `output/`, venvs Python. O `.gitignore` já cobre isso.
4. **Arquivo de exemplo:** use `.env.example` com variáveis sem valores sensíveis; o `.env.local` fica apenas local.

## Comandos úteis

```bash
# Ver status
git status

# Primeiro commit (após configurar o repo)
git add .
git commit -m "chore: estrutura inicial do projeto RFY"

# Adicionar remote (ex.: GitHub)
git remote add origin https://github.com/SEU_USUARIO/rfy.git
git push -u origin main
```

## Observação

Se na sua máquina existir um repositório Git na pasta home (`/Users/bruno`), o Cursor/IDE pode ter apontado para ele. O repositório **do projeto** é o que está em `RFY/.git`. Para trabalhar sempre no repo do RFY, abra a pasta **RFY** como workspace (raiz do projeto).
