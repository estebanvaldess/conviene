# SPEC 07 — Setup de construcción + Prompts para Codex · Conviene (Paso 5, Bloque 7)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **v1.1 (post-auditoría integral: C6, C13, F1, F4, F5)** · Modelo: Sonnet 5
**Cierra el paso 5.** Audiencia: Esteban (no desarrollador) — instrucciones
literales, sin jerga no explicada.

---

## PARTE A — Dónde va cada archivo generado en el paso 5

### A1. Al Project Knowledge de Claude.ai (subir tal cual)
`spec-00` a `spec-07` (incluye la nueva `spec-06-planes-monetizacion.md`)
+ `07-inventario-copy.md` + los 3 agentes + AGENTS.md, CLAUDE.md,
tokens.css + borradores de `docs/legal/` + `auditoria-2026-07-12-cierre.md`.

### A2. Al repo (cuando exista, Parte B lo crea)
| Archivo generado | Destino en el repo |
|---|---|
| AGENTS.md | `/AGENTS.md` (raíz) |
| CLAUDE.md | `/CLAUDE.md` (raíz) |
| agents-evaluador-ux.md | `/.claude/agents/evaluador-ux.md` |
| agents-evaluador-negocio.md | `/.claude/agents/evaluador-negocio.md` |
| agents-evaluador-tecnico.md | `/.claude/agents/evaluador-tecnico.md` |
| spec-00 … spec-06 | `/docs/specs/` (mismos nombres) |
| 07-inventario-copy.md | `/docs/specs/` (fuente de /lib/copy) |
| politica-privacidad-BORRADOR.md · tus-datos-contenido.md · carta-compromiso-preventa.md | `/docs/legal/` |
| tokens.css | `/styles/tokens.css` |

Nota: Codex lee `AGENTS.md` de la raíz **automáticamente** (es su
convención nativa). Claude Code lee `CLAUDE.md` automáticamente. Los
agentes de `.claude/agents/` se invocan desde Claude Code por nombre.

---

## PARTE B — Setup de plataformas (orden exacto, una vez)

1. **GitHub:** crear repo privado `conviene`. (Codex y Vercel se conectan a él.)
2. **Supabase:** crear proyecto (región `sa-east-1`, São Paulo — la más
   cercana a Chile). Guardar: `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`
   (esta última JAMÁS va al cliente ni al repo).
3. **Vercel:** importar el repo. Configurar variables de entorno (las 3 de
   Supabase + `CRON_SECRET` — genera uno: contraseña larga aleatoria — +
   `CHILECOMPRA_TICKET` que ya tienes).
4. **Proveedor de email del digest — DECISIÓN PENDIENTE (la única
   plataforma no definida en los docs):** propongo **Resend** (integración
   nativa con React Email, tier gratis 3.000/mes suficiente para MVP,
   setup de dominio simple). Requiere verificar el dominio
   `usaconviene.cl` (registros DNS que Resend te indica). Alternativa:
   Postmark (más caro, mejor entregabilidad). **Decide antes del bloque
   de construcción 5.**
5. **Lemon Squeezy:** NO configurar aún — post gate comercial.
6. Los tests manuales tuyos siguen su calendario **(actualizado v1.1)**:
   - CSV Datos Abiertos — columnas RUT+región (antes del backfill, comando spec-01 §3).
   - **Dumps DIARIOS de licitaciones en Datos Abiertos** (nuevo — supuesto
     del fallback del guardrail, spec-01 §2): verificar en
     datosabiertos.chilecompra.cl que existan y su cadencia, junto al test CSV.
   - Volumen P2 real (primeros días de ingesta del Bloque 1) — condiciona
     además la ventana 06:00→07:30 del digest.
   - **A1 en Postman — ADELANTADO: antes del GATE, no del Bloque 5** (si A1
     resulta pobre, el pitch de las 15 conversaciones debe presentar el
     checklist como "guía por tipo de proceso", no como verificación
     específica — el guion honesto depende de saberlo antes).

---

## PARTE C — Codex y Claude Code: configuración y modo de uso

### C1. Recomendación: Codex vía **app (interfaz), no terminal**
Fundamento: no eres desarrollador; la app de Codex (web/escritorio, o el
panel en VS Code) muestra diffs visuales, permite revisar qué cambió antes
de aceptar, y maneja el sandbox por ti. La terminal da lo mismo en
capacidad pero exige leer diffs en texto plano y conocer git. **Regla de
gobernanza en cualquier modo:** modo de aprobación "sugerir/revisar"
(Codex propone, tú apruebas) — nunca modo full-auto.

### C2. Claude Code = auditor (no constructor)
- Instalar Claude Code (app de escritorio Claude → pestaña Code, apuntada
  a la carpeta del repo; lee CLAUDE.md solo).
- Al cerrar cada bloque de Codex, en Claude Code:
  `Ejecuta los 3 agentes de .claude/agents/ sobre el bloque recién
  construido (spec-0X). Consolida veredictos.`
- Flujo por bloque: **Codex construye → Claude Code audita (3 agentes) →
  fixes en Codex si hay P0/P1 → re-audita → tu OK → commit/merge.**
- Tú eres el checkpoint final de cada bloque, igual que en planificación.

### C3. Secuencia de construcción (con gates) — v1.1
```
Bootstrap (prompt 0)
→ [borradores docs/legal listos — F4: el checkbox del registro los necesita]
→ Bloque 1: ingesta/espejo        [tras esto: medir volumen P2 real]
→ Bloque 2: perfil + onboarding
→ ✋ CHECKPOINT VISUAL (F1): revisión del deploy del Bloque 2 contra 05 §5
   y tokens.css — calibración fina de tono/tipografía SOBRE los tokens v1.1
   (reemplaza al "tablero de diseño"; es la única instancia de ajuste visual
   antes de construir el radar)
→ [test A1 en Postman — antes del gate, ajusta el guion del pitch]
── GATE COMERCIAL ── (15 conversaciones → ≥5 intenciones → ≥2 preventas;
   preventas se activan con el procedimiento manual de spec-06 §4)
→ Bloque 3: matching + score
→ Bloque 4: radar (incluye shell, responsive y checklist rama B)
→ Bloque 5: digest + checklist rama A
→ Bloque 6: planes + checkout (spec-06)
```
**La demo del gate (Δ C6, honesta):** el deploy del Bloque 2 muestra la
**capa 1 del foso** — el resumen del historial real por RUT, que ningún
competidor puede mostrar — y el teaser en modo pre-F3 (spec-02 §A4): sin
puntaje numérico, con justificación cualitativa de rubro. Las capas 2-3
(puntaje multifactor + checklist) se presentan en material estático
claramente marcado como maqueta (la card del 05 §2 con datos de ejemplo).
Prohibido simular en el producto vivo un puntaje que el motor no calculó.

---

## PARTE D — Prompts copy-paste para Codex

**Uso:** un prompt por bloque, en una sesión/tarea nueva de Codex cada
vez. Codex lee AGENTS.md solo; cada prompt le indica su spec.

### Prompt 0 — Bootstrap del repo
```
Inicializa el proyecto Conviene según docs/specs/spec-00-fundaciones.md.
1. Scaffold Next.js 15 (App Router, TypeScript estricto) con la estructura
   de carpetas exacta de la spec §1.
2. Integra styles/tokens.css como única fuente de variables de diseño.
3. Crea lib/copy/ con el módulo de léxico canónico vacío pero tipado
   (toda string de UI vendrá de aquí).
4. Configura Supabase client (server y browser separados; service role
   solo en server), variables de entorno de ejemplo en .env.example
   (nunca valores reales).
5. Configura Vercel Cron placeholder en vercel.json (06:00 y 07:30
   America/Santiago) apuntando a route handlers vacíos protegidos por
   CRON_SECRET.
No implementes features. Al terminar, lista qué creaste y qué decisiones
tomaste para mi confirmación.
```

### Prompt 1 — Ingesta / Espejo
```
Implementa completa la spec docs/specs/spec-01-ingesta-espejo.md.
Orden: (1) migración SQL íntegra de §1 incluyendo RLS y particionado de
events; (2) pipeline del cron §2 con guardrail, throttle, backoff,
idempotencia y edge cases; (3) parser de backfill Datos Abiertos §3 —
pero NO lo ejecutes: el dueño debe validar antes las columnas del CSV;
(4) jobs de retención 21.719 de §4; (5) telemetría §5 con nombres de
evento exactos.
Los criterios de aceptación §6 son tests que debes dejar escritos y
pasando (fixtures sintéticos, sin llamar la API real en tests).
Ante cualquier ambigüedad: propón opciones, no decidas solo.
```

### Prompt 2 — Perfil + Onboarding
```
Implementa completa la spec docs/specs/spec-02-perfil-onboarding.md.
Orden: primero 2.A (backend de perfil: algoritmo §A2, recálculo §A3,
endpoint §A4 con rate limit y rama PN reducida), después 2.B (las 6
pantallas §B1, tabla de ramas §B2, páginas legales §B3).
Reglas innegociables: rama PN pre-registro devuelve SOLO agregados no
sensibles; checkboxes del gate NO pre-marcados; registro nunca bloqueado
por espejo caído; todo copy desde lib/copy con los textos EXACTOS de la
spec. El teaser usa el fallback TODO-F3 descrito en §A4 (el motor de
matching aún no existe). Accesibilidad §B4 y criterios §4 como tests o
verificaciones documentadas en el PR.
```

### Prompt 3 — Matching + Score
```
[SOLO tras gate comercial aprobado por el dueño]
Implementa completa la spec docs/specs/spec-03-matching-score.md.
Orden: candidateo §1.1 (set-based en SQL), scorer §2 con las tablas de
pesos por tier EXACTAS, contrato del jsonb factors §2.4 (reglas duras:
nunca vacío, siempre el contra, cap 55 solo-FTS, congelamiento), re-score
y ciclo de vida §3, exclusión opt_out §4, telemetría §5 incluida la
alarma flat_scores_alert.
Todas las constantes numéricas en un archivo de config comentado, no
hardcodeadas. El test del criterio 1 (score reproducible a mano con
fixture) es obligatorio antes de cualquier otra cosa.
Conecta el teaser del onboarding (TODO-F3 de spec-02) al motor real.
```

### Prompt 4 — Radar
```
Implementa completa la spec docs/specs/spec-04-radar.md.
Orden: componente TenderCard §1 con sus 6 reglas duras como invariantes
(error en dev si factors vacío), vistas §2, triage y filtros §3 (filtros
reducen, JAMÁS reordenan; estado en URL), Free vs pago §4 (sin filtración
en DOM/payload), estados §5, configuración de cuenta §6 con ARCO completo
(export con pii_access_log, eliminación con soft-delete 30 días).
Accesibilidad §7 como criterios verificables. Los 10 criterios de §10
deben quedar cubiertos por tests o verificación documentada. Usa
exclusivamente tokens de styles/tokens.css.
```

### Prompt 4b — nota (Δ C5): el prompt 4 incluye "implementa el builder de
checklist rama B (spec-05 §2.1) + su hook en el pipeline (mapa de jobs de
spec-01 §2) + el shell y responsive de spec-04 §0".

### Prompt 5 — Digest + Checklist
```
[Precondición: el dueño entrega el resultado del test A1 — indica si la
rama principal del checklist es A (estructurada) o B (degradada)]
Implementa completa la spec docs/specs/spec-05-digest-checklist.md.
Orden: builder del checklist §2 (AMBAS ramas; la principal según el
resultado A1 que te indicaré; estados ✓✗? jamás inventados), template del
digest §1.3 (React Email, texto-primero, multipart, pie fijo TEXTUAL),
job y reglas de envío §1.1-1.2 (14 días de hábito, bounces, semanal,
unsubscribe sin login), canal ARCO público §3, telemetría §4.
Proveedor de envío: [Resend u otro — confirmar con el dueño antes].
Los 10 criterios de §5 cubiertos; capturas de render Gmail/Outlook en el PR.
```

### Prompt 6 — Planes + checkout (post-gate, tras Bloque 5 o en paralelo)
```
Implementa completa la spec docs/specs/spec-06-planes-monetizacion.md.
Orden: matriz de gating §1 (helpers de plan en lib/, límites Free),
página /precios §2 (copy desde lib/copy, neto+IVA, cupo Fundador real),
webhook Lemon Squeezy §3 (firma verificada, PaymentProvider agnóstico,
gracia 7 días), telemetría §5. Los matches del día JAMÁS se gatean por
plan (regla dura AGENTS.md #5). Criterios §6 cubiertos por tests.
```

### Prompt de auditoría (Claude Code, tras cada bloque)
```
Ejecuta secuencialmente los 3 agentes de .claude/agents/ (evaluador-ux,
evaluador-negocio, evaluador-tecnico) sobre el bloque recién construido
contra su spec en docs/specs/. Consolida: lista única de hallazgos
P0/P1/P2 sin duplicados, veredicto por agente, y veredicto global
(cualquier P0 = RECHAZA). No corrijas nada tú: el fix lo hace Codex.
```

---

## PARTE E — Cierre del paso 5 (recordatorios de gobernanza)

1. **Auditoría integral — ✅ EJECUTADA (2026-07-12).** Hallazgos C1-C16 y
   F1-F14 cerrados en las v1.1 de specs/tokens y los documentos nuevos;
   traza completa en `auditoria-2026-07-12-cierre.md`.
2. Tras la auditoría: crear **Project Instructions** del proyecto
   (pendiente del HANDOFF, ahora sí con el producto completamente definido).
3. Actualizar **HANDOFF a v5** — ✅ hecho junto al cierre. **Registro de
   modelos corregido (Δ C13):** bloques 0-1 del paso 5 en Fable 5; specs
   02-05 y 07 en Sonnet 5; auditoría integral, fixes v1.1 y spec-06 en
   Fable 5 (registro REAL, reemplaza la estrategia declarativa del HANDOFF v4).
4. Gate comercial: 15 conversaciones → ≥5 intenciones → ≥2 preventas.
   Demo = deploy del Bloque 2 en modo pre-F3 + maqueta marcada (C6);
   preventas vía spec-06 §4. **Prerequisitos del gate:** borradores legales
   publicados, test A1 hecho, INAPI/dominios verificados (la marca se
   expone públicamente en las conversaciones).

## Decisiones nuevas en este bloque (para tu visto bueno)

1. **Codex vía app con modo revisar/aprobar** (no terminal, no full-auto)
   — fundamento en C1; corrige mi hint anterior de "probablemente
   terminal": para un no-developer los diffs visuales valen más que el
   control fino de la terminal.
2. **Resend como proveedor de email** — única pieza de stack no definida
   en los docs; propuesta con alternativa, decides antes del bloque 5.
3. **Supabase en sa-east-1** (São Paulo) — región más cercana a Chile.
4. **Deploy vivo desde el Bloque 2** para usar el aha como demo del gate
   comercial — conecta construcción con validación sin esperar el MVP
   completo.
