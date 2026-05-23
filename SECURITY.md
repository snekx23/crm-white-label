# Segurança

## Credenciais no Git

**Nunca** commite:

- `.env.local`, `.env.production`, `.dev.vars`
- `SUPABASE_SERVICE_ROLE_KEY` (acesso total ao banco)
- Chaves reais em `wrangler.jsonc`

Use `.env.example` e `.dev.vars.example` apenas como modelos.

## Deploy Cloudflare

Variáveis de runtime (copie do seu `.env.local`):

| Variável | Onde configurar |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Workers → Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Workers → Variables |
| `NEXT_PUBLIC_APP_URL` | Workers → Variables |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Workers → Variables ou Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (`wrangler secret put`) |

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Se credenciais vazaram no GitHub

1. **Rotacione** no [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API (gere nova anon key e service role).
2. Altere `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e atualize na Meta/Z-API.
3. Atualize `.dev.vars`, secrets do Wrangler e variáveis no painel Cloudflare.
4. Revogue chaves antigas no Supabase após validar o deploy.

Chaves que estiveram em commits públicos devem ser consideradas comprometidas.
