# AGENTS.md — Contrato de construcción · Conviene

## Qué es Conviene
SaaS para pymes proveedoras del Estado chileno (Mercado Público).
Entrega cada mañana las licitaciones que le convienen al usuario, con
puntaje de conveniencia 0-100 justificado y checklist de requisitos.
Propuesta: JUICIO, NO ALERTAS. Evalúa fit y admisibilidad, NUNCA
probabilidad de adjudicación.

## Reglas duras (violarlas = PR rechazado)
1. LÉXICO PROHIBIDO en todo copy visible: "calzar", "calce", "match",
   "probabilidad", "vas a ganar", "asegurado", "garantizado",
   "perfecta para ti". Léxico canónico en /lib/copy — todo string de UI
   sale de ahí, nunca hardcodeado en componentes.
2. El puntaje NUNCA se renderiza sin al menos 1 factor visible.
3. Siempre mostrar el factor en contra si existe; si no existe:
   "Sin señales en contra detectadas".
4. Significado nunca solo por color (número + texto + ícono).
5. Matches del día nunca gateados en plan Free.
6. Guardrail API: contador diario en events; 7.000 alerta, 8.500 corte P2.
7. Idempotencia de JOBS: ingesta = upsert por código; digest y push =
   insert-then-send con unique (re-correr un job jamás duplica emails).
8. RLS activo en toda tabla con datos de usuario. Espejo = solo lectura
   desde la app.
9. Checkbox de política de privacidad no pre-marcado; digest opt-in.
10. Accesibilidad base: WCAG AA, teclado, foco visible,
    prefers-reduced-motion, unidades relativas. NO construir dark mode,
    escalas tipográficas ni panel de densidad (post-MVP explícito).
11. Timezone: todo en CLT (America/Santiago).

## Gobernanza
- Codex construye por bloques en el orden: ingesta → perfil → matching
  → radar → digest. No adelantar features.
- Ante ambigüedad en una spec: proponer opciones, NO decidir solo.
- Ninguna migración destructiva sin confirmación explícita del dueño.

## Stack
Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · Vercel
(hosting + cron) · FTS Spanish nativo Postgres (sin embeddings v1) ·
Anthropic Haiku (scoring auxiliar, si la spec lo pide) · Lemon Squeezy.

## Schema
La migración base vive en spec-01. Las specs posteriores extienden el
schema SOLO vía migraciones incrementales versionadas declaradas en su
sección "Schema delta". Prohibido mutar el schema a mano o fuera de una
migración.

## Specs
La fuente de verdad de cada feature está en /docs/specs (specs 00-06 +
07-inventario-copy.md como fuente de /lib/copy). Este archivo gobierna el
CÓMO transversal; las specs gobiernan el QUÉ.
