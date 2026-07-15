# SPEC 03 — F3: Matching + Puntaje 0-100 justificado · Conviene (Paso 5, Bloque 3)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **v1.1 (post-auditoría integral: C10, C16, refs de schema)** · Modelo: Sonnet 5
**Fuentes:** 04-blueprint.md §3 (flujo 2c) + §7 (léxico) · 01-PRD.md (feature 3) · 06-cumplimiento-ley-21719.md §2.3
**Depende de:** spec-01 (espejo + tabla `matches`) y spec-02 (perfiles/tiers).
**Orden:** tercera. GATE: la construcción de este bloque NO comienza hasta pasar
el gate comercial (15 conversaciones → ≥5 intenciones → ≥2 preventas, PRD §8).
Especificar sí; construir no.

---

## 1. Arquitectura (`lib/matching/`)

Dos etapas, ambas en Postgres (sin embeddings v1, decisión cerrada):

```
tender nuevo/modificado
  → [Etapa 1: candidateo]  filtra companies plausibles (barato, recall alto)
  → [Etapa 2: scorer]      calcula score + factores por (tender, company)
  → upsert en matches (unique tender_code+company_rut)
```

### 1.1 Candidateo grueso (recall sobre precisión)

Un company es candidato para un tender si cumple AL MENOS UNO:
- **ONU exacto:** algún `onu_code` de `tender_items` ∈ rubros del perfil.
- **ONU familia:** coincidencia por 6 o 4 primeros dígitos.
- **FTS:** `tenders.fts @@ websearch_to_tsquery('spanish', keywords_fts del perfil)`
  con `ts_rank ≥ umbral_fts` (constante calibrable, inicial 0.05).

Exclusiones al candidateo:
- `companies.opt_out = true` (21.719 §2.3 — el titular PN que se opuso al
  perfilamiento nunca entra al motor).
- Tenders con `closes_at < now() + interval '2 days'` no generan matches
  NUEVOS (no vale la pena preparar oferta); los existentes se conservan.

### 1.2 Ejecución

- **Batch diario:** al cerrar P2 (spec-01 paso 3) → scoring de tenders
  nuevos/modificados contra todos los perfiles activos. Set-based en SQL
  donde sea posible (candidateo); scorer por pares en worker.
- **On-demand (1 perfil):** para el teaser del aha (spec-02 §A4) y para el
  recálculo tras editar `declared_profile`. Mismo código, input acotado.
- **Presupuesto de cómputo:** el batch corre en Supabase/worker Vercel; si
  la corrida excede 10 min → evento `matching_slow` (síntoma de necesitar
  índices o pre-agregados, no de cambiar arquitectura).

---

## 2. Scorer multifactor (pesos v1, calibrables vía feedback)

Score = Σ aportes, cap 100, floor 0. Umbrales: **≥40 entra al radar · ≥70
destaca en digest** (constantes en config, no hardcodeadas).

### 2.1 Tier pleno (≥8 OC) — 5 factores

| Factor | Peso | Cálculo (contrato) | Justificación (plantilla /lib/copy) |
|---|---|---|---|
| Rubro | 35 | Mejor coincidencia: ONU exacto = 1.0 · familia-6 = 0.7 · familia-4 = 0.5 · solo-FTS = rank normalizado ≤0.4. Multiplicado por frecuencia relativa del rubro en el perfil | "Has vendido {producto} {n} veces" |
| Historial comprador | 20 | OC previas con `buyer_org_code` = 1.0 · con organismos del mismo tipo = 0.4 | "Ya le vendiste {n} veces a este organismo" / "Has trabajado con {tipo}" |
| Monto vs capacidad | 20 | `amount_estimated` ∈ [p10, p90×2] = 1.0 · ∈ (p90×2, p90×5] = 0.4 · fuera = 0 y genera factor EN CONTRA | "Dentro de tu rango habitual" / contra: "{x}× tu OC más grande" |
| Región | 15 | `buyer_region` ∈ regiones del perfil = 1.0 · región vecina = 0.5 (tabla de adyacencia CL fija) | "Operas en esta región" / "Región vecina a tu zona" |
| Señales del proceso | 10 | Suma de sub-señales: plazo ≥5 días hábiles (0.5) · tipo de proceso acorde al rango de monto del perfil (0.3) · sin señal negativa del comprador (0.2) | "Cierra en {n} días — alcanzas a preparar la oferta" |

Sin `amount_estimated` en el tender (frecuente): factor Monto = neutro
(aporte 0, no penaliza) + factor DUDA visible: "Monto no publicado —
revisa las bases".

### 2.2 Tier delgado (3–7 OC)

Rubro 45 · historial-comprador 10 · resto igual. Toda card lleva la línea
fija: "Puntaje basado en historial acotado" (copy §7, no negociable).

### 2.3 Tier declarativo / PN sin historial — modo "primera venta"

**(Δ C10)** Aplica a tier 'declarativo' y 'persona_natural' (PN con <3 OC).
Una PN CON historial puntúa con los pesos de su tier real (pleno/delgado,
§2.1–2.2) — el flag `is_natural_person` restringe display (spec-02 §A4),
no el scoring.

- Pesos: rubro declarado 50 · monto-de-entrada 20 (favorece montos bajos:
  ≤100 UTM = 1.0, decae linealmente hasta 1.000 UTM) · región declarada 15
  · señales 15.
- **Bonus de proceso:** CA y L1 reciben +0.3 en señales (baja barrera, sin
  garantías) — el modo favorece, no filtra: LP altas igual aparecen si el
  rubro coincide.
- Filtro nativo "para empezar" en radar (spec-04 lo renderiza; el flag
  `first_sale_friendly` se calcula AQUÍ: CA o L1 + sin garantía + ≤100 UTM).
- Checklist completo desde el match #1 sin gate (regla de negocio, la
  aplica spec-04/05).
- Señal "% debutantes por comprador": pre-agregado mensual en tabla
  **`buyer_stats`** (spec-01 §1, job mensual del mapa de jobs). **Condición
  de publicación:** solo se muestra si `espejo_depth_months ≥ 12` para ese
  comprador; si no, la señal se omite (no se inventa).
- Primera OC detectada para el RUT (job nocturno de spec-02) → upgrade de
  tier + evento `tier_upgraded` + notificación "tu perfil se enriqueció".

### 2.4 Construcción de `matches.factors` (contrato del jsonb)

```json
[
  { "factor": "rubro", "valor": 0.7, "peso": 35, "aporte": 24.5,
    "texto": "Has vendido insumos dentales 12 veces", "direccion": "favor" },
  { "factor": "monto", "valor": 0, "peso": 20, "aporte": 0,
    "texto": "Monto 10× tu OC más grande", "direccion": "contra" },
  { "factor": "monto_dato", "texto": "Monto no publicado — revisa las bases",
    "direccion": "duda" }
]
```

Reglas duras (AGENTS.md #2-3, se validan aquí porque nacen aquí):
- `factors` NUNCA vacío: mínimo el factor de mayor aporte.
- Selección para UI: 2-3 factores de mayor aporte + SIEMPRE el mayor "contra"
  si existe; si no existe: la UI muestra "Sin señales en contra detectadas"
  (el motor lo indica con flag `no_contra: true`, no inventa un factor).
- Los factores se CONGELAN al calcular (feedback y auditoría comparan contra
  lo que el usuario vio). Re-score → `rescored_at` + factores nuevos, y los
  votos de `feedback` conservan su `factors_snapshot` propio.
- Nunca mono-keyword: si el único factor con aporte > 0 es FTS puro, cap del
  score en 55 y factor duda "Coincidencia por descripción — verifica el
  detalle" (anti techo-Licitados).

---

## 3. Re-score y ciclo de vida

- Tender modificado (via `last_modified_mp`): re-score SOLO si cambió campo
  con peso (monto, cierre, ítems, comprador). Si el score cruza ≥70 hacia
  arriba → `matches.upgraded_since_last_digest = true` (columna real,
  spec-01 §1; spec-05 la consume en el envío y la resetea a false).
- Tender cerrado (`closes_at` pasado o `status` canónico ≠ 'open',
  spec-01 C11): matches → `status='closed'` (job diario del mapa de jobs
  de spec-01 §2, cron 06:00 post-P2). No se borran: insumo de "qué te
  mostramos vs qué pasó" (Fase V precisión).
- Empates de score: orden secundario por `closes_at` ascendente.
- Cero matches del día para un usuario: evento `zero_match_day`; 7 días
  seguidos → flag para sugerir ampliar perfil (spec-04 renderiza la
  sugerencia; spec-05 la incluye en digest).

---

## 4. Requisitos 21.719 embebidos

| Req | Implementación |
|---|---|
| Oposición al perfilamiento (§2.3) | `opt_out` excluye del candidateo (§1.1); ARCO tipo 'oposicion' resuelto → set flag + DELETE de matches del RUT (Δ C16: `feedback.match_id` es `on delete set null` — los votos conservan su `factors_snapshot` para calibración, pierden solo el link) + `pii_access_log` |
| Minimización | El scorer lee agregados del `profile`, nunca re-consulta OC fila a fila; `factors.texto` usa conteos, no detalle de OC de terceros |
| Transparencia del perfilamiento (§2.1) | La página /tus-datos (spec-02 §B3) explica los 5 factores en lenguaje simple. **El texto canónico ya existe** en `docs/legal/tus-datos-contenido.md` (redactado en el paso 5 — corrige el hueco de timing: la página se construye en el Bloque 2, antes que este bloque). Este bloque solo verifica que la implementación coincida con ese texto |

---

## 5. Telemetría del bloque

`match_scored` (tender, company, score, tier, factores) · `score_threshold_crossed`
· `matching_run` (n_tenders, n_candidatos, n_matches, duración, distribución de
scores p10/p50/p90) · `matching_slow` · `zero_match_day` · `tier_upgraded`.
**Alarma anti-score-plano:** si p10 y p90 de la corrida difieren <15 puntos →
evento `flat_scores_alert` (síntoma Licitados 40/40; revisar pesos).

---

## 6. Criterios de aceptación

1. Perfil pleno de prueba + tender con ONU exacto + comprador conocido →
   score reproducible a mano con la tabla §2.1 (test unitario con fixture).
2. Ningún match persiste sin `factors` con ≥1 elemento.
3. Match con factor monto fuera de rango → el "contra" aparece en los
   factores seleccionados para UI.
4. Solo-FTS → score ≤55 + factor duda presente.
5. `opt_out=true` → cero matches generados para ese RUT; los previos
   eliminados al resolver la oposición.
6. Tender modificado sin cambio de campo con peso → NO re-score
   (rescored_at intacto).
7. Corrida de prueba con 3 perfiles distintos → distribución de scores no
   plana (p90-p10 ≥ 15) con dataset de fixture.
8. Strings de justificación provienen de plantillas en /lib/copy; grep
   confirma ausencia de "calza", "match", "probabilidad" en ellas.

---

## 7. Decisiones nuevas en esta spec (para tu visto bueno)

1. **Constantes numéricas de cálculo** (multiplicadores 1.0/0.7/0.5/0.4,
   umbral FTS 0.05, ventana de vecindad regional, decaimiento del
   monto-entrada): el Blueprint definió pesos y lógica; los multiplicadores
   internos los fijé yo como punto de partida calibrable. Van en config,
   no hardcodeados.
2. **Cap 55 para matches solo-FTS:** materializa el "nunca mono-keyword"
   como regla verificable; el número exacto es calibrable.
3. **No generar matches nuevos con cierre <2 días:** regla de utilidad
   práctica (no está en Blueprint); los existentes se conservan.
4. **Condición de ≥12 meses de profundidad para publicar % debutantes:**
   el Blueprint decía "sujeto a profundidad del espejo"; lo convertí en
   umbral operativo.
5. **Tabla de adyacencia regional CL fija:** implementación literal de
   "regiones vecinas a medio puntaje"; es un dato estático que Codex
   incluirá como constante.
