# Installation

## Requirements

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

## Steps

1. Install dependencies:

```bash
pnpm install
```

2. Configure API environment:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Run Prisma migrations:

```bash
pnpm --filter @capitao-diff/api prisma:migrate
```

4. Start platform apps:

```bash
pnpm dev:platform
```

5. Optional: initialize CLI config in your target project:

```bash
pnpm --filter @capitao-diff/cli dev init
```
