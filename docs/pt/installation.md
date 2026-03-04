# Instalação

## Requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

## Passos

1. Instale dependências:

```bash
pnpm install
```

2. Configure ambiente da API:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Execute migrations Prisma:

```bash
pnpm --filter @capitao-diff/api prisma:migrate
```

4. Suba os apps da plataforma:

```bash
pnpm dev:platform
```

5. Opcional: inicialize a configuração da CLI no projeto alvo:

```bash
pnpm --filter @capitao-diff/cli dev init
```
