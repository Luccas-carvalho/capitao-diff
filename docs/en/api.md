# API Reference

Base URL (default): `http://localhost:4000`

## Health

- `GET /health`

## Auth

- `POST /auth/register`
- `POST /auth/login`

## Projects

- `GET /projects`
- `POST /projects`

## QA Runs

- `GET /projects/:projectId/runs`
- `POST /projects/:projectId/runs`

## Issues

- `GET /projects/:projectId/issues`
- `POST /projects/:projectId/issues`
- `PATCH /issues/:issueId`

Use `Authorization: Bearer <token>` in protected routes.
