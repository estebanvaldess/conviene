# HANDOFF — Conviene (v5 · post-Paso 5 + Auditoría Integral)

Sube este archivo al Knowledge del Project **reemplazando la v4**. El chat nuevo arranca leyéndolo.
Última actualización: 2026-07-12 (cierre del paso 5 y de la auditoría integral).

## Qué es Conviene
SaaS para pymes proveedoras del Estado chileno (Mercado Público). Entrega cada mañana las licitaciones que le convienen al usuario, con puntaje de conveniencia justificado y checklist de requisitos. Propuesta de valor: **juicio, no alertas**.
Marca **Conviene** · dominio **usaconviene.cl**. "Calza" queda solo como código interno histórico.

## Estado actual
- **Pasos 1-4** — CERRADOS (PRD v1.3 · referentes · naming · blueprint v1.0.1 · diseño · plan 21.719).
- **Paso 5 (specs + prompts Codex)** — ✅ COMPLETO: spec-00 a spec-06 + spec-07 + 3 agentes + AGENTS.md/CLAUDE.md + tokens.css v1.1 + `07-inventario-copy.md` + borradores `docs/legal/`.
- **Auditoría integral** — ✅ EJECUTADA (2026-07-12, sesión adversarial dedicada). 16 hallazgos de coherencia (C1-C16) + 14 de completitud (F1-F14), **todos cerrados** en las v1.1 y documentos nuevos. Traza: `auditoria-2026-07-12-cierre.md`. Nota final del sistema documental: 7/7.
- **⚠️ Pendiente de gobernanza:** las specs 02-05 (v1.1), spec-06 y las "decisiones nuevas" listadas en cada una requieren el **OK explícito de Esteban** (siguen en estado BORRADOR para aprobación). Nada se construye antes de ese OK.

## Decisiones CERRADAS (resumen; detalle en cada doc)
- Precios: Free $0 / Fundador $12.990 (= Pro de por vida, cupo 30) / Pro $24.990 / Business $49.990. Matriz completa: `spec-06` §1 (propuesta, pendiente OK). Lemon Squeezy + transferencia manual (carta de compromiso en docs/legal).
- MVP 5 features (PRD §4) + Bloque 6 (planes/checkout, post-gate) · Telemetría + feedback 👍/👎 día-1 · 3 agentes evaluadores.
- Orden de construcción: bootstrap → **ingesta/espejo → perfil+onboarding → [checkpoint visual] → [test A1] → GATE → matching → radar (incluye shell+checklist rama B) → digest+rama A → planes**.
- Léxico canónico: Blueprint §7 + `07-inventario-copy.md` (fuente única de /lib/copy).
- Diseño: "calma editorial cálida" · tokens.css v1.1 COMPLETO (Fraunces decidida como editorial) · el "tablero de diseño" se reemplazó por el **checkpoint visual sobre el deploy del Bloque 2** · personalización (dark mode, escalas, densidad) = post-MVP, NO construir.
- 21.719: PN puntúa por historial pero **nunca ve detalle a nivel de OC en v1** (verificación fuerte = backlog) · lookup anónimo PN no persiste perfiles · ARCO con confirmación en dos pasos · export incluye events propios.
- Demo del gate = capa 1 del foso (historial real) en modo pre-F3, sin puntajes simulados en producto vivo + maqueta estática marcada (spec-07 C3).

## Riesgos vivos
- **P0:** Licitados misma casilla UX con tracción → mitigación: profundidad (3 capas).
- **P1:** calidad matching solo FTS (calibrar con feedback) · volumen P2 vs guardrail Y vs ventana 06:00→07:30 (medir en Bloque 1).
- **P1 Ley 21.719 (vigencia 01-12-2026):** plan propio ejecutándose; la pregunta #1 de la revisión legal es la suficiencia del display PN (spec-02 §A4).

## Pendientes (calendario en spec-07 B6/E4)
1. **OK de Esteban a specs v1.1 + spec-06** (bloquea todo).
2. CSV Datos Abiertos: columnas RUT+región (antes del backfill) + **dumps DIARIOS de licitaciones** (supuesto del fallback del guardrail — nunca testeado).
3. Volumen real P2 (Bloque 1).
4. **A1 en Postman — antes del GATE** (condiciona el guion del pitch).
5. INAPI 42/35 + dominios defensa — **antes de las conversaciones públicas del gate**.
6. Proveedor email (propuesta: Resend) — antes del Bloque 5.
7. Revisión legal puntual pre-lanzamiento (06 §3, con C8/C9 en el alcance).
8. **Project Instructions del Project** — crear ahora que el producto está completamente definido (siguiente acción).

## Registro de modelos (real — corrige C13)
Pasos 3-4: Fable 5. Paso 5: bloques 0-1 Fable 5; specs 02-05 y 07 Sonnet 5. Auditoría integral + fixes v1.1 + spec-06: Fable 5. Fable 5 retirado el 13-jul → sesiones siguientes: Opus 4.8 (o el mejor disponible); avisar antes de subir esfuerzo.

## Ejecución técnica
Claude (Project) planifica · Codex construye (AGENTS.md → specs) · Claude Code audita (CLAUDE.md + 3 agentes). Repo AÚN NO configurado (setup: spec-07 Parte B). Stack: Next.js 15 + Supabase (sa-east-1) + Vercel · FTS Spanish · Lemon Squeezy. Usuario NO desarrollador: Codex vía app en modo revisar/aprobar, nunca full-auto.

## REGLAS DE INTERACCIÓN (mantener)
1. No crear archivos sin aprobación explícita. 2. Respuestas breves optimizadas a tokens. 3. Nota 1-7 al final. 4. No dar la razón si el usuario no la tiene. 5. Avisar antes de tareas exigentes. 6. Asesoría experta con salvedades de gobernanza. 7. Usuario Senior UX: no explicar lo básico de diseño; sí lo técnico/comercial en simple.

## Próxima acción en el chat nuevo
1) Esteban revisa y da OK (o ajusta) las decisiones nuevas de specs v1.1 + spec-06 (lista consolidada en `auditoria-2026-07-12-cierre.md` §3). 2) Crear Project Instructions. 3) Ejecutar setup de spec-07 Parte B y arrancar el Bloque 0.
