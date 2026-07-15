# SPEC 06 — Planes, checkout y preventas · Conviene (Paso 5, Bloque 6)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **Origen: auditoría integral (hallazgos F5/F6)** · Modelo: Fable 5
**Fuentes:** 01-PRD.md §6 (v1.3) · 02-analisis-referentes.md §2 · HANDOFF (Lemon Squeezy + transferencia manual)
**Depende de:** spec-04 (config/modal de upgrade) · spec-01 (`users.plan`).
**Orden de construcción:** Bloque 6, tras el Bloque 4 (el modal de upgrade necesita destino). **El procedimiento de preventas (§4) NO requiere construcción — está operativo desde el gate.**

---

## 1. Matriz de planes (contrato — la única fuente; el PRD §6 la resume)

| Capacidad | Free | Fundador $12.990 | Pro $24.990 | Business $49.990 |
|---|---|---|---|---|
| Matches del día con puntaje + justificación + checklist | ✓ **siempre completo** (regla dura #5 — el foso nunca es el gate) | ✓ | ✓ | ✓ |
| Digest diario + push cierre adelantado | ✓ | ✓ | ✓ | ✓ |
| Historial en radar | 7 días | Completo | Completo | Completo |
| Guardadas ⭐ | 10 activas | Ilimitadas | Ilimitadas | Ilimitadas |
| Análisis de precisión ("qué te mostramos vs qué pasó", matches cerrados) | — | ✓ | ✓ | ✓ |
| Export de oportunidades (CSV) | — | ✓ | ✓ | ✓ |
| Usuarios / RUTs | 1 / 1 | 1 / 1 | 1 / 1 | Multi (post-validación, alcance por definir) |

**Regla del plan Fundador:** mismo feature set que Pro, **precio bloqueado de por vida**, cupo **30 clientes** (incluye las preventas del gate). Cerrado el cupo, el plan desaparece de la página de precios (los existentes lo conservan). Fundamento: diferencia temporal/de precio, no de features — evita inventar features que erosionen el foso o compliquen el MVP, y le da urgencia honesta al gate (cupo real, no countdown).

**Reglas duras:**
- Downgrade/impago → Free (nunca lockout total; los matches del día siguen completos).
- El export ARCO (spec-04 §6) es un derecho, NO una feature de plan: disponible en Free.
- Límite de 10 ⭐ en Free: al alcanzarlo, aviso honesto ("Tienes 10 guardadas — archiva una o pasa a un plan pagado"); nunca se borran guardadas existentes por downgrade.

## 2. Página de precios (`/precios`, pública)

- 3 columnas (Free · Fundador mientras haya cupo / Pro · Business "próximamente — escríbenos").
- Desglose **neto + IVA visible** en el checkout (patrón Licitados, 02 §4.1).
- Copy sin FOMO ni countdown; el cupo Fundador se comunica como hecho ("Quedan N cupos Fundador") con el contador real.
- Pie con la regla de mensaje del Blueprint §7. Strings en `07-inventario-copy.md`.

## 3. Checkout y estado de plan (Lemon Squeezy — se configura en este bloque, post-gate)

- Checkout overlay de Lemon Squeezy desde `/precios` y desde el modal de upgrade (spec-04 §4).
- **Webhook `/api/webhooks/lemonsqueezy`** (firma verificada): `subscription_created/updated/cancelled/payment_failed` → actualiza `users.plan` + evento `plan_changed` (payload: from, to, source: 'ls'|'manual'). Impago → gracia 7 días con aviso en radar → Free.
- Config de cuenta (spec-04 §6 "Plan") linkea al portal de cliente de Lemon Squeezy.
- Revisión Flow.cl post-validación se mantiene (02 §2): la capa de webhook se diseña agnóstica (un `PaymentProvider` con implementación LS).

## 4. Preventas y transferencia manual (operativo desde el GATE — sin código)

1. Preventa del gate = transferencia + **carta de compromiso simple** (plantilla en `docs/legal/`): monto, plan Fundador de por vida, fecha estimada de activación, derecho a reembolso si el producto no se lanza en N meses.
2. Activación manual (hasta que exista el Bloque 6): script SQL documentado en `docs/ops/activar-plan.md` — `update users set plan='fundador' where email=…` + insert manual de evento `plan_changed` (source: 'manual'). Ejecuta el dueño; queda registrado.
3. Al construirse el Bloque 6, los planes manuales se registran en Lemon Squeezy como suscripciones comp/legacy o se mantienen con `source: 'manual'` (decisión operativa en ese momento).

## 5. Telemetría

`plan_changed` · `pricing_viewed` · `checkout_started` · `checkout_completed` · `founder_quota_viewed` (N restante).

## 6. Criterios de aceptación

1. Usuario Free con 10 ⭐ → aviso; la #11 no se guarda; nada se borra.
2. Webhook con firma inválida → 401, sin cambio de plan.
3. `payment_failed` → gracia 7 días → Free; matches del día intactos en todo momento.
4. Cupo Fundador en 0 → el plan no aparece en `/precios`; usuarios existentes lo conservan.
5. Grep léxico en `/precios` y checkout: cero FOMO/claims de resultado.

## 7. Decisiones nuevas (para tu visto bueno)

1. **Fundador = Pro a precio de por vida con cupo 30** — resuelve F6 sin inventar features; el cupo exacto es calibrable.
2. **Free con tope de 10 ⭐** — única palanca adicional de upgrade en Free; los matches del día jamás se tocan.
3. **Gracia de 7 días en impago** y downgrade a Free (nunca lockout).
4. **Capa `PaymentProvider` agnóstica** para la revisión Flow.cl pendiente.
