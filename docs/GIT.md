# Estrutura e fluxo Git – RFY

## Repositório

- **Branch padrão:** `main`
- O histórico deve refletir o que está em produção ou pronto para deploy.

## Boas práticas

1. **Commits:** mensagens objetivas em português ou inglês, no imperativo (ex.: "Adiciona endpoint de export CSV", "Corrige cálculo de pillar score"). Prefira prefixos convencionais: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
2. **Mensagem final:** use só o título e o corpo que descrevem a mudança. Evite linhas de meta não versionáveis (ex.: "Made-with: …") no texto que vai para o histórico do Git.
3. **Branches de feature:** opcional usar `feature/nome-da-feature` ou `fix/nome-do-fix` e fazer merge em `main` após revisão/testes.
4. **Não commitar:** `.env`, `.env.local`, chaves, `node_modules`, `.next`, `tmp/`, `output/`, venvs Python. O `.gitignore` já cobre isso.
5. **Arquivo de exemplo:** use `.env.example` com variáveis sem valores sensíveis; o `.env.local` fica apenas local.

## Modelo de mensagem de commit

- Ao correr `git commit` sem `-m`, o Git abre `.git/COMMIT_EDITMSG`: a **primeira linha não vazia** (que não seja só comentário `#`) vira o assunto; linhas que começam com `#` são ignoradas.
- Modelo versionado (opcional): ficheiro [`COMMIT_MESSAGE_TEMPLATE.txt`](COMMIT_MESSAGE_TEMPLATE.txt). Para usar em todos os commits deste clone:

  ```bash
  git config commit.template docs/COMMIT_MESSAGE_TEMPLATE.txt
  ```

Exemplo de commit final (sem linhas `#` no histórico):

```
docs: descreve validação local no repasse

- Secção 13.1 em REPASSE_SOFTWARE (build + testes).
- GIT.md e template de mensagem.
```

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
