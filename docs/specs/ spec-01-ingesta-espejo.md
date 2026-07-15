# SPEC 01 — F2: Ingesta diaria / Espejo local · Conviene (Paso 5, Bloque 1)

**Estado:** APROBADO en chat · 2026-07-12 · **v1.1 (2026-07-12, post-auditoría integral: hallazgos C2, C3, C5, C11, C12, C16, F8, F13)** · Modelo: Fable 5
**Fuentes:** 04-blueprint.md §2 (flujo 2b) + §6 (modelo de datos) · 06-cumplimiento-ley-21719.md §2.5–2.6
**Orden:** PRIMERA en construcción — cimiento del producto (arquitectura E2).

---

## 1. Modelo de datos completo (migración inicial)

Esta migración crea el schema BASE del producto. **Regla de migraciones
(corrige C3):** las specs posteriores PUEDEN extender el schema mediante
migraciones incrementales versionadas, declaradas en una sección
"Schema delta" propia; lo que sigue prohibido es redefinir o mutar a mano
lo ya creado. Los deltas ya conocidos por la auditoría se incorporaron
directamente a esta migración base (marcados con `-- Δ`).

```sql
-- ESPEJO (solo lectura desde la app; escribe únicamente el pipeline)

create table purchase_orders (
  code text primary key,
  status_code int,
  tender_code text,
  supplier_rut text not null,          -- normalizado: sin puntos, con guión, DV mayúscula
  supplier_name text,
  supplier_mp_code text,
  supplier_region text,
  supplier_activity text,
  supplier_is_natural_person boolean,  -- derivado del RUT (<50M) — flag 21.719
  buyer_org_code text,
  buyer_org_name text,
  buyer_region text,
  buyer_unit_rut text,
  total_net numeric, tax numeric, total numeric, currency text,
  created_at_mp timestamptz, sent_at timestamptz,
  accepted_at timestamptz, cancelled_at timestamptz,
  supplier_rating numeric,             -- PromedioCalificacion; NO entra al score v1
  raw jsonb not null,                  -- seguro anti-re-barrido (aprendizaje A2)
  ingested_at timestamptz default now()
);
create index on purchase_orders (supplier_rut);
create index on purchase_orders (buyer_org_code);

create table purchase_order_items (
  id bigint generated always as identity primary key,
  po_code text references purchase_orders(code) on delete cascade,
  onu_code text, onu_category text,
  product_name text, spec_text text,
  qty numeric, unit_price numeric, total numeric
);
create index on purchase_order_items (onu_code);
create index on purchase_order_items (po_code);

create table tenders (
  code text primary key,
  type text,                           -- L1/LE/LP/LQ/CA…
  status text,
  name text, description text,
  buyer_org_code text, buyer_org_name text, buyer_region text,
  amount_estimated numeric, currency text,
  published_at timestamptz, closes_at timestamptz, questions_until timestamptz,
  last_modified_mp timestamptz,
  guarantee_required boolean,          -- nullable = desconocido (A1)
  guarantee_amount numeric,
  admissibility_raw jsonb,
  items_text text,                     -- Δ C2: agregado de product_name+spec_text de tender_items,
                                       --   actualizado por el pipeline tras upsertear los ítems
  fts tsvector generated always as (
    to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(description,'')
      || ' ' || coalesce(items_text,''))
  ) stored,                            -- Δ C2: FTS ahora cubre nombre+descripción+ÍTEMS (Blueprint §3)
  raw jsonb not null,
  ingested_at timestamptz default now()
);
create index on tenders using gin (fts);
create index on tenders (closes_at) where status = 'open';

-- Δ C11: `tenders.status` usa valores CANÓNICOS, no los códigos crudos de MP:
--   'open' | 'closed' | 'awarded' | 'deserted' | 'revoked' | 'suspended' | 'unknown'
-- El mapeo CodigoEstado-MP → canónico vive en /lib/ingest/status-map.ts (config,
-- no hardcode disperso). Se puebla y VALIDA con datos reales en el Bloque 1
-- (tarea explícita: listar estados observados en la primera semana de ingesta
-- y confirmar el mapeo con el dueño). Estados no mapeados → 'unknown' + evento
-- `unknown_status_seen` (nunca se inventa 'open').

create table tender_items (
  id bigint generated always as identity primary key,
  tender_code text references tenders(code) on delete cascade,
  onu_code text, product_name text, qty numeric, spec_text text
);
create index on tender_items (onu_code);

-- DERIVADAS Y DE USUARIO (specs F1/F3 las llenan; se crean aquí)

create table companies (
  rut text primary key,
  name text,
  tier text check (tier in ('pleno','delgado','declarativo','persona_natural')),
  profile jsonb,            -- derivado del espejo, recalculable
  declared_profile jsonb,   -- chips del usuario; se mergea, nunca pisa el histórico
  oc_count_24m int default 0,
  last_oc_at timestamptz,
  profile_built_at timestamptz,
  opt_out boolean default false,  -- 21.719 §2.3: PN que se opone al perfilamiento
  is_natural_person boolean default false
);

create table users (
  id uuid primary key references auth.users(id),
  email text not null,
  company_rut text references companies(rut),
  plan text default 'free' check (plan in ('free','fundador','pro','business')),
  digest_enabled boolean default false,      -- opt-in explícito (21.719 §2.2)
  digest_email_bounces int default 0,
  policy_version_accepted text,              -- 21.719 §2.2
  policy_accepted_at timestamptz,
  deleted_at timestamptz,                    -- Δ C3: soft-delete (spec-04 §6); purga a 30 días por job
  created_at timestamptz default now()
);

create table matches (
  id bigint generated always as identity primary key,
  tender_code text references tenders(code),
  company_rut text references companies(rut),
  score int check (score between 0 and 100),
  factors jsonb not null,   -- CONGELADO al cálculo: {factor, valor, peso, aporte, texto}
  status text default 'active' check (status in ('active','saved','discarded','closed')),
  upgraded_since_last_digest boolean default false,  -- Δ C3: flag que spec-03 §3 setea y spec-05 §1.1 consume/resetea
  scored_at timestamptz default now(),
  rescored_at timestamptz,
  unique (tender_code, company_rut)
);
create index on matches (company_rut, score desc);

create table checklists (
  tender_code text primary key references tenders(code),
  items jsonb not null,     -- [{req, source: 'api'|'standard', state: 'ok'|'fail'|'unknown', detail}]
  degraded boolean default false,
  built_at timestamptz default now()
);

-- TRANSVERSALES DÍA-1

create table events (
  id bigint generated always as identity,
  user_id uuid,             -- nullable: leads anónimos
  session_id text,
  type text not null,
  payload jsonb,
  created_at timestamptz default now(),
  primary key (id, created_at)
) partition by range (created_at);
-- particiones mensuales desde día-1 (crear 3 adelante + job mensual)
create index on events (type, created_at);
create index on events (user_id, created_at);

create table feedback (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  match_id bigint references matches(id) on delete set null,  -- Δ C16: si un match se borra
  -- (oposición ARCO), el voto conserva su factors_snapshot y pierde solo el link
  vote int check (vote in (1,-1)),
  factors_snapshot jsonb not null,   -- lo que el usuario VIO, no re-score
  comment text,
  created_at timestamptz default now()
);

-- OPERACIONALES

create table ingest_runs (
  id bigint generated always as identity primary key,
  run_date date not null,
  source text check (source in ('api_oc','api_tenders','datos_abiertos')),
  req_count int, ok_count int, fail_count int,
  duration_ms int, cursor text,
  created_at timestamptz default now()
);

create table ingest_retry (
  code text, source text, attempts int default 0,
  next_retry_at timestamptz,
  primary key (code, source)
);

create table digests (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  run_date date not null,              -- Δ F12: fecha CLT del envío
  kind text default 'daily' check (kind in ('daily','empty','weekly','early_close')),
  sent_at timestamptz,
  items jsonb,                         -- incluye posición, score y estado personalizado
                                       -- del checklist CONGELADO al envío (C4)
  opened_at timestamptz,
  clicked jsonb,
  unique (user_id, run_date, kind)     -- Δ F12: idempotencia — re-correr el job no re-envía
);

-- Δ C3/spec-05: dedupe del push de cierre adelantado ("máx 1 por tender")
create table tender_notifications (
  user_id uuid references users(id),
  tender_code text references tenders(code),
  type text check (type in ('early_close')),
  sent_at timestamptz default now(),
  primary key (user_id, tender_code, type)
);

-- Δ C3/spec-03 §2.3: pre-agregado mensual "% debutantes por comprador"
create table buyer_stats (
  buyer_org_code text,
  month date,
  debutant_rate numeric,               -- proporción de supplier_rut cuya 1ª OC histórica es con este organismo
  sample_size int,
  espejo_depth_months int,             -- condición de publicación: ≥12 (spec-03 §2.3)
  primary key (buyer_org_code, month)
);

-- Δ C3/§4 retención: destino de la agregación de events >24m
create table events_summary (
  month date, type text, count bigint,
  primary key (month, type)
);

-- Δ F8: taxonomía de rubros para el selector declarativo (spec-02 §B2).
-- Semilla: DISTINCT (familia-4, onu_category) observados en el espejo
-- (purchase_order_items + tender_items) — se autopuebla con la ingesta;
-- job semanal refresca. Sin dataset externo que mantener.
create table onu_taxonomy (
  family_code text primary key,        -- 4 primeros dígitos ONU
  label text not null,                 -- onu_category más frecuente de la familia
  freq bigint default 0
);

-- 21.719 §2.3
create table arco_requests (
  id bigint generated always as identity primary key,
  requested_at timestamptz default now(),
  type text check (type in ('acceso','rectificacion','supresion','oposicion','portabilidad')),
  subject_rut text,          -- titular (puede no ser usuario)
  channel text,              -- 'producto' | 'email'
  status text default 'pendiente' check (status in ('pendiente','en_proceso','resuelto','rechazado')),
  resolved_at timestamptz,
  notes text
);

-- 21.719 §2.6: log de acceso a datos personales
create table pii_access_log (
  id bigint generated always as identity primary key,
  actor text not null,       -- 'system'|'admin'|user_id
  action text not null,      -- 'export'|'delete'|'view_pn_profile'|'arco_response'
  subject text,              -- rut o user_id afectado
  detail jsonb,
  created_at timestamptz default now()
);
```

### RLS (21.719 §2.6 + Blueprint §6)
- `users`, `matches`, `feedback`, `digests`: policy `user_id = auth.uid()`
  (matches vía join `company_rut` del user).
- Espejo (`purchase_orders`, `tenders`, items, `checklists`, `companies`):
  **sin acceso directo desde el cliente**. El aha pre-registro y el radar leen
  vía route handlers con service role (server-only) — el "espejo de lectura
  interna" nunca expone detalle PN al navegador (coherente con 06 §2.4).
- `events`: insert-only desde server; sin select para clientes.
- `arco_requests`, `pii_access_log`, `ingest_*`, `tender_notifications`,
  `buyer_stats`, `events_summary`: solo service role. `onu_taxonomy`:
  lectura vía route handler (alimenta el selector declarativo).

### Endpoint de telemetría de UI (Δ F13)
Los eventos que nacen en el cliente (`card_opened`, `filter_used`, etc.)
NO insertan directo (RLS insert-only server): `POST /api/events` (route
handler) con allowlist de `type` por taxonomía de las specs, sesión o auth
requerida, rate limit 60/min por sesión, payload validado (zod). Eventos
fuera de la allowlist se descartan con log.

---

## 2. Pipeline diario

**Cron único 06:00 CLT** (Vercel Cron → `/api/cron/ingest`, protegido por `CRON_SECRET`):

```
1. P1 (OC):       GET ordenesdecompra?fecha=AYER → ~500-600 códigos
                  → por código nuevo: GET ?codigo= → upsert PO + items
2. P2 (tenders):  GET licitaciones?fecha=AYER → por código: detalle → upsert
                  (+ actualizar items_text y checklist base) 
                  + re-consulta de abiertas con last_modified_mp cambiado
3. Post-P2:       normalizar status → cerrar matches de tenders vencidos →
                  disparar matching (F3, post-gate) → registrar matching_run
4. Job nocturno:  recalcular profile de companies con OC nuevas (F1)
```

### Mapa único de jobs (Δ C5 — dueño y momento de activación de CADA job)

| Cron (CLT) | Job | Spec dueña | Se activa en |
|---|---|---|---|
| 06:00 diario | P1 espejo OC | esta (§2) | Bloque 1 |
| 06:00 diario | P2 tenders + items_text + status canónico | esta (§2, C11) | Bloque 1 |
| 06:00 diario | Checklist base rama B por tender nuevo/modificado | spec-05 §2 (builder) — **hook del pipeline y builder rama B se construyen en el Bloque 4** (C5: el radar lo renderiza) | Bloque 4 |
| 06:00 diario | Cierre de matches (`closes_at` pasado o status ≠ open → status='closed') | spec-03 §3 | Bloque 3 |
| 06:00 diario | Matching batch + `matching_run` | spec-03 | Bloque 3 (post-gate) |
| 06:00 diario | Recalculo de perfiles con OC nuevas + upgrade de tier | spec-02 §A3 | Bloque 2 |
| 07:30 diario | Digest (diario/vacío/semanal según reglas) — **gateado: verifica `matching_run` del día completada; si no, reintenta cada 10 min, máx 6, luego evento `digest_delayed` y envía con lo disponible marcándolo** (Δ C12) | spec-05 §1 | Bloque 5 |
| Diario | Purga de cuentas soft-deleted >30 días | spec-04 §6 | Bloque 4 |
| Semanal (dom) | Re-sync OC <30 días · refresh `onu_taxonomy` | esta §2 / F8 | Bloque 1 |
| Mensual | Partición de `events` siguiente · retención §4 (leads >12m, events >24m → `events_summary`) · `buyer_stats` | esta §4 / spec-03 §2.3 | Bloque 1 (particiones/retención) · Bloque 3 (buyer_stats) |

### Guardrail (regla dura AGENTS.md #6)
- Contador de requests del día en `events` (`type: 'api_request'`) + total en `ingest_runs`.
- 7.000 → evento `guardrail_alert`. 8.500 → **corta P2** (OC pueden esperar;
  licitaciones no se pierden: fallback a dump Datos Abiertos del día si existe;
  si no, `ingest_retry`).
- Throttle ~2 req/s · backoff exponencial en 429/5xx · máx 3 reintentos →
  `ingest_retry` para el cron siguiente.
- Idempotencia: upsert por `code`; re-correr el día no duplica.

### Edge cases (contrato para Codex)
- API caída total: skip, `ingest_run` con fail, banner transparencia en radar,
  retry siguiente con rango 2 días.
- Feriado/día vacío: 0 nuevos; digest sale igual ("silencio honesto").
- Re-sync semanal de OC <30 días (OC modificada post-ingesta); recálculo de
  perfil solo si cambió su set de OC.
- RUT nuevo no presente en espejo: job de backfill dirigido (spec F1).
- Todo timestamp de negocio en CLT.

---

## 3. Backfill histórico (Datos Abiertos)

- Fuente: dumps mensuales de OC (24 meses) de datosabiertos.chilecompra.cl →
  parser CSV → mismas tablas, `source: 'datos_abiertos'`.
- **Verificación previa al parser (salvedad pendiente — la ejecuta Esteban):**

```bash
# Descargar solo la cabecera del ZIP/CSV mensual y listar columnas:
unzip -p <archivo-OC-mes>.zip | head -1 | tr ';' '\n' | cat -n
# Verificar que exista: columna RUT proveedor explícita (no solo nombre)
# y columna región (del proveedor o de la unidad de compra, derivable)
```

- Si el CSV **no** trae RUT explícito → plan B: backfill vía API por código
  (más lento, respetando guardrail, priorizado por RUTs de usuarios reales) —
  no bloquea el MVP, degrada la velocidad de enriquecimiento.
- Dedupe backfill vs API: upsert por `code`; API (más rica) pisa dump, dump
  no pisa API (`ingested_at` + regla en el upsert).

---

## 4. Requisitos Ley 21.719 embebidos (§2.5–2.6)

| Req | Implementación en esta feature |
|---|---|
| Retención leads anónimos (§2.5) | Job mensual: `events` con `user_id null` y RUT en payload >12 meses → anonimizar payload (hash del RUT) |
| Retención events generales (§2.5) | >24 meses → agregar a tabla resumen y borrar partición (particionado mensual lo hace barato) |
| Espejo solo-lectura (§2.6) | RLS: cero acceso cliente; escritura solo pipeline (service role) |
| Log de acceso PII (§2.6) | `pii_access_log`: toda lectura de perfil PN detallado, export y supresión lo registran |
| Flag PN (06 §1 inventario) | `supplier_is_natural_person` derivado del RUT en ingesta — habilita §2.3/§2.4 sin re-barrer |

---

## 5. Telemetría del bloque

`ingest_run` (fecha, fuente, req_count, ok/fail, duración) · `ingest_retry_queued`
· `guardrail_alert` · dashboard mínimo día-1: requests vs guardrail + cobertura
del espejo (queries SQL documentadas, no UI).

---

## 6. Criterios de aceptación (para el evaluador técnico)

1. Re-ejecutar el cron del mismo día → 0 duplicados.
2. Simular 429 → backoff + retry, fallidos en `ingest_retry`.
3. Contador cruza 8.500 → P2 se detiene, P1 continúa, evento emitido.
4. RUT PN insertado → flag derivado correcto.
5. Cliente anónimo (anon key) no puede leer ninguna tabla del espejo.
6. Partición de `events` del mes existe antes de que llegue el mes.
7. FTS de un tender encuentra términos que solo aparecen en sus ítems
   (items_text operativo — C2).
8. Estado MP no mapeado → status='unknown' + `unknown_status_seen`; jamás
   'open' por defecto (C11).
9. `POST /api/events` rechaza types fuera de allowlist y respeta el rate
   limit (F13).

---

## 7. Advertencia registrada

El umbral RUT <50M para PN es heurística estándar chilena con borde gris
(EIRL con RUT alto que son PJ; empresas antiguas con RUT bajo, rarísimas).
Suficiente para v1; el evaluador de negocio debe conocer esta limitación.
