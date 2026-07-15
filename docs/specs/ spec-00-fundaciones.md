# SPEC 00 — Fundaciones del repo · Conviene (Paso 5, Bloque 0)

**Estado:** APROBADO en chat · 2026-07-12 · Modelo: Fable 5
**Fuentes:** HANDOFF v4 · 04-blueprint.md · 05-direccion-diseno.md · 06-cumplimiento-ley-21719.md

---

## 1. Estructura de repo

```
conviene/
├── AGENTS.md                  ← contrato para Codex
├── CLAUDE.md                  ← contexto para Claude Code (auditor)
├── .claude/agents/
│   ├── evaluador-ux.md
│   ├── evaluador-negocio.md
│   └── evaluador-tecnico.md
├── docs/
│   ├── specs/                 ← specs por feature (spec-00 a spec-05 + agentes)
│   └── legal/                 ← DPAs archivados + registro de tratamiento (06 §2.2/§2.7)
├── app/                       ← Next.js 15 App Router
│   ├── (marketing)/           ← landing + aha pre-registro (sin auth)
│   ├── (app)/                 ← radar, detalle, configuración (auth)
│   └── api/                   ← route handlers (ingesta vía cron, webhooks)
├── lib/
│   ├── ingest/                ← pipeline P1/P2, guardrail, retry
│   ├── profile/                ← construcción de perfil por tier
│   ├── matching/               ← FTS + ONU + scorer
│   ├── checklist/              ← builder con degradación A1
│   └── copy/                   ← léxico canónico centralizado (Blueprint §7)
├── emails/                    ← templates digest (React Email, texto-primero)
├── supabase/
│   ├── migrations/            ← schema versionado (nunca cambios manuales en Supabase)
│   └── seed/
└── styles/tokens.css          ← design tokens (archivo entregado aparte)
```

## 2. Convenciones

- TypeScript estricto.
- Migraciones SQL versionadas; prohibido tocar el schema a mano en Supabase.
- Crons = Vercel Cron → route handlers protegidos por `CRON_SECRET`.
- Todo string de UI sale de `/lib/copy` (habilita la regla dura #1 de AGENTS.md).
- Timestamps de negocio en CLT (America/Santiago).

## 3. Decisión de archivos de spec

Las specs viven en dos lugares con el mismo contenido:
1. **Project Knowledge de Claude.ai** — para planificación y auditoría integral.
2. **`docs/specs/` del repo** — para que Codex las lea al construir.

El prompt de cada bloque de construcción (spec de prompts, Bloque 7) indica a
Codex qué spec leer. AGENTS.md gobierna el CÓMO transversal; las specs el QUÉ.

## 4. Orden de construcción (E2, cerrado)

ingesta/espejo → perfil → matching → radar → digest.
Gate comercial (15 conversaciones → ≥5 intenciones → ≥2 preventas) bloquea
la construcción del motor de matching (PRD §8).

## 5. Registro de modelo

Bloques 0-1 del paso 5 generados en Fable 5; bloques siguientes en Sonnet 5
(o el mejor disponible), según estrategia de modelo del HANDOFF.
