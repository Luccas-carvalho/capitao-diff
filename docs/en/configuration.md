# Configuration

Path: `.capitao-diff/config.yml`

```yaml
qa:
  baseUrl: http://localhost:3000
  baseBranch: dev
  projectPort: 3000
  framework: react

auth:
  email: admin@test.com
  password: admin

twoFactor:
  enabled: false
  provider: mailhog
  url: http://localhost:8025
```

## Fields

- `qa.baseUrl`: target frontend URL used by Playwright.
- `qa.baseBranch`: baseline branch for diff analysis.
- `qa.projectPort`: detected or manually defined project port.
- `qa.framework`: detected framework (react/next/vue/svelte).
- `auth`: credentials for automated login mission.
- `twoFactor`: optional provider metadata.
