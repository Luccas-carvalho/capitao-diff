# Capitão Diff

Ship frontend code without fear.

Capitão Diff is an AI-powered QA engineer that analyzes git diffs, runs Playwright browser missions, evaluates UI/UX quality, and blocks regressions before pull requests reach production.

## Monorepo Structure

```text
apps/
  landing/
  dashboard/
  api/
packages/
  cli/
  mcp-server/
  qa-engine/
  playwright-runner/
  i18n/
  shared/
```

## Quick Start

```bash
./scripts/setup.sh
pnpm dev:platform
```

### CLI

```bash
pnpm --filter @capitao-diff/cli build
pnpm exec captain-diff init
pnpm exec captain-diff test
pnpm exec captain-diff pr-check --owner <owner> --repo <repo> --pr <number>
pnpm exec captain-diff doctor
```

## MCP Auto Install

One command bootstrap (clone/update + install deps + build + MCP setup):

```bash
curl -fsSL https://raw.githubusercontent.com/Luccas-carvalho/capitao-diff/main/scripts/install-mcp.sh | bash
```

Install/update MCP entry only:

```bash
pnpm mcp:install
pnpm mcp:install:cursor
pnpm mcp:install:all
```

Optional custom target file (works for other clients too):

```bash
pnpm mcp:install -- --targets cursor,codex,claude
pnpm mcp:install:cursor -- --config /absolute/path/to/mcp.json
```

## i18n

Initial supported languages:

- `en` (fallback)
- `pt`

Locale files are centralized in [`packages/i18n/locales`](/Users/luccas/Documents/Github/capitao-diff/packages/i18n/locales).

## Docs

English:

- [`installation`](/Users/luccas/Documents/Github/capitao-diff/docs/en/installation.md)
- [`cli`](/Users/luccas/Documents/Github/capitao-diff/docs/en/cli.md)
- [`configuration`](/Users/luccas/Documents/Github/capitao-diff/docs/en/configuration.md)
- [`api`](/Users/luccas/Documents/Github/capitao-diff/docs/en/api.md)
- [`architecture`](/Users/luccas/Documents/Github/capitao-diff/docs/en/architecture.md)

Português:

- [`instalação`](/Users/luccas/Documents/Github/capitao-diff/docs/pt/installation.md)
- [`cli`](/Users/luccas/Documents/Github/capitao-diff/docs/pt/cli.md)
- [`configuração`](/Users/luccas/Documents/Github/capitao-diff/docs/pt/configuration.md)
- [`api`](/Users/luccas/Documents/Github/capitao-diff/docs/pt/api.md)
- [`arquitetura`](/Users/luccas/Documents/Github/capitao-diff/docs/pt/architecture.md)
