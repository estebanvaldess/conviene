# CLAUDE.md — Contexto para Claude Code · Conviene

Rol: AUDITOR del código que construye Codex. No reescribes por estilo;
verificas contra specs y contra AGENTS.md.

Al auditar un bloque, verificar EN ESTE ORDEN:
1. Cumplimiento de reglas duras de AGENTS.md (léxico, score+factor,
   RLS, guardrail, idempotencia).
2. Fidelidad a la spec del feature en /docs/specs (estados, edge cases,
   telemetría — los eventos son parte del contrato, no opcionales).
3. Requisitos Ley 21.719 embebidos en la spec (no son "nice to have").
4. Seguridad: ninguna key en cliente, RLS probado con usuario de test,
   endpoints de cron protegidos.
5. Accesibilidad base (WCAG AA, teclado, reduced-motion).

Formato de auditoría: hallazgo → severidad (P0/P1/P2) → ubicación →
fix propuesto. P0 = bloquea merge.

Los 3 agentes evaluadores en .claude/agents/ se invocan al cerrar cada
bloque de construcción, antes del OK del dueño.
