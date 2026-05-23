# Branding — SolAIre W+ (CRM modelo para parceiros)

A SolAIre W+ atua em **IA aplicada**, **rebranding** e **produtos com IA para empresas**. Este CRM e um **chassis de demonstracao**: cada socio pode alinhar aparencia ao cliente final via **tokens de tema** e, dentro do app, em **Configuracoes** (nome, logo, cor da marca por tenant).

## 1. Cores

Edite [`app/globals.css`](app/globals.css) e ajuste as variaveis `--brand` e
`--brand-foreground` (formato HSL sem `hsl(...)`):

```css
:root {
  /* exemplo: laranja vivido */
  --brand: 24 95% 53%;
  --brand-foreground: 0 0% 100%;
}
```

Tambem pode ajustar `--primary`, `--background`, `--foreground`, etc., para
casar com o restante da paleta.

Use a cor da marca em qualquer lugar via Tailwind:

- `bg-brand`, `text-brand`, `border-brand`, `text-brand-foreground`
- Componentes shadcn ja tem variante `variant="brand"` no `<Button>` e
  `variant="brand"` no `<Badge>`.

## 2. Fonte

Em [`app/layout.tsx`](app/layout.tsx) troque `Inter` por outra fonte do
`next/font/google`. Exemplo com **Manrope**:

```ts
import { Manrope } from "next/font/google";
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
```

E aplique a `className={manrope.variable}` no `<html>`.

## 3. Logo

O componente [`components/app/brand-logo.tsx`](components/app/brand-logo.tsx)
traz um icone padrao SolAIre W+. Para marca propria do cliente na demo, use
**Configuracoes** → upload de logo (grava em `tenants.logo_url` via Storage).

## 4. Quando houver guideline oficial

1. Ajustar `--brand` para a cor exata da marca.
2. Alinhar fonte ao manual da SolAIre W+ ou do cliente white-label.
3. Substituir o SVG padrao em `BrandLogo` se necessario.
4. Atualizar metadados em `app/layout.tsx` (titulo, descricao, favicon).
