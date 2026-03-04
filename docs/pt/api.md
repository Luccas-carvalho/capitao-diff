# Referência da API

Base URL (padrão): `http://localhost:4000`

## Health

- `GET /health`

## Auth

- `POST /auth/register`
- `POST /auth/login`

## Projetos

- `GET /projects`
- `POST /projects`

## QA Runs

- `GET /projects/:projectId/runs`
- `POST /projects/:projectId/runs`

## Issues

- `GET /projects/:projectId/issues`
- `POST /projects/:projectId/issues`
- `PATCH /issues/:issueId`

Use `Authorization: Bearer <token>` nas rotas protegidas.
