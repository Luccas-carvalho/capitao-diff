# Configuração

Caminho: `.capitao-diff/config.yml`

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

## Campos

- `qa.baseUrl`: URL alvo do frontend para Playwright.
- `qa.baseBranch`: branch base usada na análise de diff.
- `qa.projectPort`: porta detectada ou definida manualmente.
- `qa.framework`: framework detectado (react/next/vue/svelte).
- `auth`: credenciais para missão de login automático.
- `twoFactor`: metadados opcionais de provedor 2FA.
