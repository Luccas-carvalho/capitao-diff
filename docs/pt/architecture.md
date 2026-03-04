# Arquitetura

Capitão Diff é um monorepo com pnpm workspaces, modular e escalável.

## Apps

- `apps/landing`: site marketing animado (React + Vite + Tailwind + shadcn + Framer Motion)
- `apps/dashboard`: dashboard SaaS (React + Vite + Tailwind + shadcn)
- `apps/api`: API backend (Node + Express + Prisma + PostgreSQL)

## Packages

- `packages/cli`: cliente de linha de comando `captain-diff`
- `packages/mcp-server`: servidor MCP com ferramentas de QA
- `packages/qa-engine`: pipeline e geração de relatórios
- `packages/playwright-runner`: runtime de automação de navegador
- `packages/i18n`: dicionários e utilitários de tradução (`en` fallback, `pt`)
- `packages/shared`: tipos compartilhados

## Pipeline QA

1. Análise de diff contra branch base
2. Automação Playwright desktop/mobile
3. Detecção de erros (console/rede/hidratação)
4. Heurísticas de consistência de UI
5. Testes de estresse (input vazio, longo e cliques rápidos)
6. Avaliação de UX (loading/skeleton/acessibilidade)
7. Decisão final de QA
