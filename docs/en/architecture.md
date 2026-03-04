# Architecture

Capitão Diff is a pnpm-workspaces monorepo with modular packages and apps.

## Apps

- `apps/landing`: animated marketing site (React + Vite + Tailwind + shadcn + Framer Motion)
- `apps/dashboard`: SaaS dashboard (React + Vite + Tailwind + shadcn)
- `apps/api`: backend API (Node + Express + Prisma + PostgreSQL)

## Packages

- `packages/cli`: `captain-diff` command-line client
- `packages/mcp-server`: MCP server exposing QA tools
- `packages/qa-engine`: orchestration pipeline and report generation
- `packages/playwright-runner`: browser mission runtime
- `packages/i18n`: dictionaries and translation helpers (`en` fallback, `pt`)
- `packages/shared`: shared domain types

## QA Pipeline

1. Diff analysis against base branch
2. Playwright desktop/mobile automation
3. Console/network/hydration error detection
4. UI consistency heuristics
5. Stress testing (empty input, long input, rapid clicks)
6. UX evaluation (loading/skeleton/accessibility)
7. Final QA decision output
