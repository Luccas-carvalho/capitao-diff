# CLI Usage

Binary name: `captain-diff`

## Commands

- `captain-diff init`
  - Detects git status, current branch, base branch, project port, and framework.
  - Saves configuration to `.capitao-diff/config.yml`.

- `captain-diff test`
  - Runs full QA pipeline.
  - Executes via MCP by default and falls back to local QA engine.
  - Saves markdown/json report files to `.capitao-diff/reports`.

- `captain-diff pr-check`
  - Runs QA pipeline.
  - Can comment on GitHub PR and publish check status.

- `captain-diff doctor`
  - Validates git, config, Node, and Playwright readiness.

## Examples

```bash
captain-diff init
captain-diff test --headless
captain-diff pr-check --owner acme --repo web-app --pr 42
captain-diff doctor
```
