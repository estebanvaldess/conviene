# SPEC 05 — F5: Digest email + Checklist de requisitos · Conviene (Paso 5, Bloque 5)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **v1.1 (post-auditoría integral: C4, C5, C12, F7, F12, F14)** · Modelo: Sonnet 5
**Fuentes:** 04-blueprint.md §5 (flujo 2e) + §7 · 05-direccion-diseno.md §3.3 · 06-cumplimiento-ley-21719.md §2.2–§2.3
**Depende de:** spec-03 (matches ≥70) + spec-01 (checklists, digests) + spec-04 (detalle como destino de CTA).
**Orden:** quinta y última.
**⚠️ Precondición de CONSTRUCCIÓN (no de spec): test A1 — 3 licitaciones de
tipos distintos (ej. L1, LE, LP) consultadas en Postman para verificar qué
campos de admisibilidad llegan estructurados. El resultado decide qué rama
del checklist (§2) es la principal en v1. Esta spec cubre ambas.**

---

## 1. Digest (`emails/` + job)

### 1.1 Disparo y selección

- **Job 07:30 CLT**, con dos reglas de disparo (Δ C12/F12):
  - **Gating:** verifica `matching_run` del día completada; si no,
    reintenta cada 10 min (máx 6); agotado → evento `digest_delayed` y
    envía con los matches disponibles marcando "actualización en curso".
  - **Idempotencia:** el envío inserta en `digests` con
    `unique (user_id, run_date, kind)` — re-ejecutar el job NO re-envía
    (el email sale SOLO si el insert tuvo éxito). "1 email/día máximo"
    queda garantizado mecánicamente, no solo declarado.
  Por cada user con `digest_enabled=true` y `digest_email_bounces < 3`:
  - Ítems: matches nuevos del día con score ≥70, orden score desc,
    **top 3-5** (techo 5; si hay más: línea "y N más en tu radar" con link).
  - Matches con `upgraded_since_last_digest=true` (columna de spec-01,
    seteada por spec-03) entran marcados **"Actualizada"** aunque no sean
    nuevos; tras el envío el flag se resetea a false.
  - El estado personalizado del checklist ("cumples X de Y", spec-04
    §1.1) se calcula al armar el email y queda **congelado** en
    `digests.items` (Δ C4).
  - Registro en `digests` (items jsonb con posición y score — para medir
    si el ranking acierta vía clicks por posición).

### 1.2 Reglas de envío (Blueprint §5, contrato)

- **Asunto:** "N licitaciones te convienen hoy" · día vacío: "Hoy no hay
  nada que te convenga — te avisamos mañana".
- **Primeros 14 días del usuario: enviar SIEMPRE** (formación de hábito,
  incluso vacío) · después: solo con contenido · calibrable por apertura
  D7/D30 (constante en config).
- **1 email/día máximo.** Única excepción: push por cierre adelantado de
  una ⭐ (email individual "La licitación que guardaste adelantó su cierre
  a {fecha}") — máx 1 por tender, **garantizado por la PK de
  `tender_notifications`** (spec-01): se envía solo si el insert tuvo
  éxito.
- Email rebotado ×3 → `digest_enabled` pausado + aviso persistente en
  radar ("Tu resumen diario está pausado: no pudimos entregar el correo").
- `zero_match_day` ×7 → cambia a digest semanal (**lunes 07:30**,
  `kind='weekly'`) + sugerencia de ampliar chips; vuelve a diario al
  primer match. **Contenido del semanal (Δ F7):** top 3 vigentes de la
  semana con score ≥40 (aunque no lleguen a 70 — resumen de rescate,
  marcado "lo más cercano a tu perfil esta semana"), sugerencia de chips
  con link directo, y el pie fijo. Sin ≥40 disponibles: versión de 3
  líneas con la sugerencia de chips. Asunto: "Tu resumen de la semana".
- Unsubscribe (link en pie, 1 click, sin login): `digest_enabled=false`,
  radar intacto, evento `digest_unsub` (señal amarilla de retención,
  NUNCA tratada como churn).

### 1.3 Template (05 §3.3 — la card comprimida)

- **Una columna, texto-primero, sin imágenes** (render confiable en todo
  cliente; Gmail/Outlook/móvil). React Email → HTML con estilos inline;
  colores desde tokens (subset seguro para email).
- Por ítem (mismo ADN que TenderCard):
  ```
  {Nombre de la oportunidad}                    ← titular 6-10 palabras
  {Comprador} · {Monto} · Cierra {fecha} {("HOY" si aplica)}
  Conveniencia {score} · {categoría}
  ✓ {factor de mayor aporte}                    ← 1 solo factor
  Requisitos: {✓✗? compactos, 3-4 ítems}
  → Ver análisis completo                       ← link a /radar/[code]
  ```
- Lo más importante arriba: primera línea del cuerpo = TL;DR ("Hoy: 3
  licitaciones, la mejor con Conveniencia 84").
- **Pie fijo obligatorio (regla de mensaje):** "Conviene evalúa qué tan
  bien te acomoda cada licitación y qué exige. Postular y ganar depende
  de tu oferta." + unsubscribe + link política de privacidad (§2.2).
- Día vacío: cuerpo de 3 líneas, silencio honesto, sin relleno.
- Accesibilidad email: HTML semántico, lang="es", contraste AA, links
  descriptivos (nunca "click aquí"), texto plano alternativo (multipart).

## 2. Checklist de requisitos (`lib/checklist/` — transversal: digest + detalle radar)

**Reparto de construcción (Δ C5):** la **rama B** (set estándar) + el hook
en el pipeline de ingesta se construyeron en el **Bloque 4** (spec-04 los
necesita para renderizar "Requisitos"). Este bloque construye la **rama A**
(estructurada, condicionada al test A1) y la integración con el digest.
La personalización ("cumples X de Y") es de spec-04 §1.1 y aquí se reutiliza.

### 2.1 Construcción (por tender, **al ingestarlo** — paso del pipeline en
el mapa de jobs de spec-01 §2; "al primer match" queda solo como fallback
para tenders históricos sin checklist)

**Rama A — datos estructurados disponibles (si A1 resulta positivo):**
- Fuente: `guarantee_required/amount`, `type`, tramo de monto, plazos del
  tender + `admissibility_raw`.
- Cruce con el perfil del usuario donde aplique (ej. garantía vs rango de
  montos → ✗ "Garantía de $X requerida" como barrera clara).

**Rama B — degradación (si A1 resulta pobre):**
- Set documental estándar POR TIPO de proceso (L1/LE/LP/LQ/CA), semilla
  LicitaLAB: RUT legalizado · declaración jurada · vigencia de sociedad ·
  boletín comercial · certificado de quiebras · presentación comercial.
- `checklists.degraded=true` → UI muestra encabezado **"Guía general para
  este tipo de licitación"** + link a bases oficiales. JAMÁS presentada
  como verificación específica.

**Estados por ítem (contrato del jsonb, spec-01):**
- ✓ cumple según datos · ✗ barrera clara con detalle · ? "Verifica en las
  bases" — la incertidumbre NUNCA disfrazada de certeza (regla dura).

**Reglas de negocio:**
- Tier declarativo/PN: checklist completo sin gate desde el match #1
  (spec-03 §2.3 — vale más para el novato).
- El mini-checklist (card y digest) muestra 3-4 ítems: primero los ✗,
  luego ?, luego ✓ (la barrera es lo accionable).
- Ítems personales (✓ del usuario: "ya tengo mi declaración jurada") =
  v1.1, NO construir.

## 3. Requisitos 21.719 embebidos

| Req | Implementación |
|---|---|
| Digest opt-in (§2.2) | El job solo envía con `digest_enabled=true` (default false, spec-02); toggle en config (spec-04) |
| Canal ARCO público (§2.3) | Pie del digest y /tus-datos publican datos@usaconviene.cl; formulario público /tus-datos/solicitud (sin login: un titular PN no-usuario puede ejercer derechos). **Protecciones (Δ F14):** rate limit 5/día por IP + honeypot + **confirmación en dos pasos**: el envío crea la solicitud en `pendiente_verificacion` y manda email con link de confirmación; solo al confirmar pasa a `pendiente` y corre el plazo legal (anti-spam + prueba de control del email). **Identidad para acceso/rectificación sobre RUT PN:** la respuesta con datos se envía tras revisión manual del dueño, solo si el solicitante acredita relación con el RUT (declaración simple; criterio documentado en `docs/legal/`). La **oposición** (opt_out) tiene barra más baja: email confirmado + RUT bastan (excluir del matching no expone datos). Flujo en `docs/legal/tus-datos-contenido.md` |
| Minimización en email | El digest contiene solo lo del template; nunca datos de terceros identificables (los factores usan conteos del propio historial) |

## 4. Telemetría del bloque

`digest_sent` (n_items, tipo: diario/vacío/semanal) · `digest_opened` ·
`digest_clicked` (posición, score — mide si el ranking acierta) ·
`digest_unsub` · `digest_bounced` · `checklist_item_viewed` ·
`push_early_close_sent`. Métricas PRD §8: apertura D7/D30 calculada de aquí.

## 5. Criterios de aceptación

1. Usuario opt-in con 7 matches ≥70 → email con 5 + "y 2 más"; posiciones
   registradas en `digests.items`.
2. Usuario día 10 sin matches → email vacío honesto; usuario día 20 sin
   matches → no envía.
3. 3 bounces → pausa + aviso en radar; re-activación manual posible.
4. Unsubscribe sin login → radar intacto, `digest_unsub` emitido.
5. Tender sin datos estructurados → checklist degradado con encabezado
   "guía general"; jamás ✓/✗ inventados.
6. Mini-checklist ordena ✗ → ? → ✓.
7. Cierre adelantado de ⭐ → push individual único; segunda modificación
   del mismo tender NO re-envía.
8. Render del template verificado en Gmail web/móvil y Outlook (litmus
   manual o capturas en PR).
9. Formulario ARCO público inserta en `arco_requests` sin autenticación y
   envía acuse.
10. Grep léxico: pie fijo presente; cero claims de resultado.
11. Re-ejecutar el job de las 07:30 del mismo día → cero emails duplicados
    (unique en `digests`, Δ F12).
12. Job con `matching_run` incompleta → reintentos + `digest_delayed` (Δ C12).
13. Solicitud ARCO sin confirmar email → nunca pasa a `pendiente` (Δ F14).
14. `digests.items` conserva el checklist personalizado tal como se envió,
    aunque el checklist base cambie después (Δ C4).

## 6. Decisiones nuevas en esta spec (para tu visto bueno)

1. **Push de cierre adelantado = email individual, no push nativo** (no
   hay app móvil en MVP); "máx 1 por tender" para no spamear con
   modificaciones sucesivas.
2. **Digest semanal se envía los lunes** (el Blueprint decía "semanal" sin
   día); lunes = inicio de ciclo de decisión de la pyme.
3. **Orden del mini-checklist ✗→?→✓:** interpretación de "la barrera es lo
   accionable"; el Blueprint no fijaba orden.
4. **Formulario ARCO público sin login:** el 06 §2.3 exige canal para
   titulares no-usuarios (PN del espejo); lo materializo como formulario
   en /tus-datos/solicitud además del email.
5. **TL;DR como primera línea del cuerpo** (patrón verificado 05 §3.3
   "lo más importante arriba") — micro-decisión de template.
6. **(v1.1)** Idempotencia mecánica de envío (Δ F12) · gating al matching
   (Δ C12) · digest semanal con contenido definido (Δ F7) · rama B
   adelantada al Bloque 4 (Δ C5) · protecciones + verificación del
   formulario ARCO (Δ F14) · checklist congelado en items (Δ C4).
