# Uso da CLI

Nome do binário: `captain-diff`

## Comandos

- `captain-diff init`
  - Detecta status git, branch atual, branch base, porta e framework.
  - Salva em `.capitao-diff/config.yml`.

- `captain-diff test`
  - Executa pipeline completo de QA.
  - Usa MCP por padrão com fallback para QA engine local.
  - Salva relatório markdown/json em `.capitao-diff/reports`.

- `captain-diff pr-check`
  - Executa pipeline de QA.
  - Pode comentar no PR do GitHub e publicar status check.

- `captain-diff doctor`
  - Valida git, configuração, Node e Playwright.

## Exemplos

```bash
captain-diff init
captain-diff test --headless
captain-diff pr-check --owner acme --repo web-app --pr 42
captain-diff doctor
```
