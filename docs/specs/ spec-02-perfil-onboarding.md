# SPEC 02 — F1: Perfil por RUT + Onboarding · Conviene (Paso 5, Bloque 2)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **v1.1 (post-auditoría integral: C6, C8, C9, C10, C15, F3, F4, F8)** · Modelo: Sonnet 5
**Fuentes:** 04-blueprint.md §1 (flujo 2a) + §3 (tiers) + §7 (léxico/microcopy) · 05-direccion-diseno.md §1, §3.2 · 06-cumplimiento-ley-21719.md §2.1, §2.2, §2.4
**Depende de:** spec-01 (espejo poblado + schema). **Orden:** segunda en construcción.
**Dos mitades:** backend de perfil (2.A) + flujo de onboarding (2.B). Codex las construye en ese orden.

---

## 2.A — Backend: construcción del perfil (`lib/profile/`)

### A1. Entrada y salida

- **Entrada:** RUT normalizado (sin puntos, con guión, DV mayúscula; validación DV módulo 11).
- **Salida:** registro en `companies` con `tier` + `profile` jsonb + `oc_count_24m`.

### A2. Algoritmo de construcción (desde el espejo, nunca la API en vivo)

```
1. SELECT purchase_orders WHERE supplier_rut = $rut
   AND cancelled_at IS NULL                      -- OC canceladas excluidas
   AND created_at_mp >= now() - interval '24 months'
2. oc_count_24m = count(*)
3. Derivar profile jsonb:
   - rubros: onu_code de items agrupados por familia (4 y 6 dígitos)
     con frecuencia y monto acumulado; top ordenado por frecuencia
   - compradores: buyer_org_code + nombre + n_oc + último contacto
   - regiones: buyer_region con frecuencia (la región del COMPRADOR
     define dónde opera, no la del domicilio del proveedor)
   - rango_montos: [p10, p90] de total por OC
   - keywords_fts: términos representativos de product_name/spec_text
     (top-N por frecuencia, stopwords español fuera) — insumo del
     candidateo FTS en F3
4. Asignar tier — **SIEMPRE por conteo, también para PN (Δ C10):**
   - oc_count_24m >= 8  → 'pleno'
   - 3–7               → 'delgado'
   - < 3               → 'declarativo'
   El toggle PN setea `companies.is_natural_person = true` (flag separado,
   ya en schema), que gobierna REGLAS DE DISPLAY y 21.719 — no el scoring.
   Una PN verificada con historial real puntúa con su historial (la promesa
   del producto aplica a todo titular); solo cambia cuánto detalle se
   muestra y cuándo (§A4). Tier 'persona_natural' del check de schema se
   reserva para PN sin historial (<3 OC): equivale a declarativo con
   enfoque Compra Ágil <100 UTM.
5. Persistencia (Δ C8 — regla dura): el upsert en `companies` ocurre SOLO
   si (a) el RUT pertenece a un usuario registrado/registrándose, o
   (b) es persona jurídica. **Lookup anónimo de RUT PN: el perfil se
   calcula on-the-fly, se responde y NO se persiste** (evita almacenar
   perfiles derivados de terceros PN gatillados por cualquiera — exposición
   nueva no cubierta por el inventario del 06 §1). El evento `rut_submitted`
   registra el lookup (retención 12m per spec-01 §4). Al registrarse, el
   perfil PN se construye y persiste normalmente.
```

**Reglas:**
- Historial solo antiguo (>24m pero con OC previas): tier `delgado` + flag
  `stale_history` en profile → copy "tu actividad reciente es baja".
- `declared_profile` (chips del usuario) se **mergea** con `profile` en
  lectura; jamás sobreescribe el histórico (Blueprint §6).
- `opt_out = true` (21.719 §2.3): la construcción se salta y el RUT queda
  excluido de matching. El dato bruto del espejo se conserva (registro
  histórico público).

### A3. Recalculo y backfill dirigido

- **Job nocturno** (paso 4 del cron de spec-01): recalcular `profile` solo
  para RUTs de `companies` cuyo set de OC cambió en la ingesta del día.
- **Backfill dirigido:** si un RUT consultado no está (o está pobre) en el
  espejo → crear perfil provisional con lo disponible + encolar job que
  consulta la API por códigos de OC faltantes (respetando guardrail, cuenta
  contra el presupuesto diario) → al completar, recalcular + notificación
  "tu perfil se enriqueció" (evento `profile_enriched`).

### A4. Endpoint del lookup (server-only)

`POST /api/profile/lookup` (route handler, service role — el cliente jamás
toca el espejo, RLS de spec-01):
- **Input:** `{ rut, is_natural_person }` + session_id.
- **Rate limit (Δ C15):** 10 lookups/hora **por IP** (clave primaria — la
  sesión la genera el cliente y es rotable, no sirve como bucket) + tope
  3 por session_id como capa secundaria. Anti-scraping del espejo: sin
  esto, el endpoint sería una API pública gratuita de perfilamiento.
- **Output:** SIEMPRE agregados, nunca filas de OC:
  `{ tier, oc_count_24m, rubros_top3 (nombres), regiones, rango_montos,
     n_compradores, teaser: { n_matches_hoy, top2: [{nombre_tender, puntaje, linea_justificacion}] } }`
- **Rama PN (21.719 §2.4 — regla dura, Δ C9):** si `is_natural_person`,
  el output pre-registro se reduce a **agregados no sensibles**:
  `{ n_matches_hoy, rubros_genericos (familia ONU, sin detalle) }`. Sin
  conteo de OC, sin montos, sin compradores, sin regiones.
  **Post-registro:** la verificación de email NO prueba titularidad del
  RUT (cualquiera puede registrarse con su correo y un RUT ajeno). Por
  eso, en v1 las cuentas PN ven: sus matches con puntaje y factores
  (conteos agregados) + chips de perfil — pero **NUNCA el detalle a nivel
  de OC** (fechas, montos por orden, compradores individuales). Ese
  detalle queda tras verificación fuerte de titularidad (Clave Única —
  backlog 06 §2.4). Los factores para PN usan solo agregados ("Has vendido
  este rubro N veces"), coherente con minimización (spec-03 §4). Toda
  lectura de perfil PN se registra en `pii_access_log`
  (action: `view_pn_profile`). **Escalado a revisión legal (06 §3.2):**
  confirmar que agregados+matches sin detalle de OC es suficiente; es la
  pregunta #1 de esa revisión.
- Nota — **modo pre-F3 del teaser (Δ C6, contrato exacto, no TODO):**
  mientras el motor de F3 no exista (Bloques 2 y gate comercial), el aha
  funciona en "modo demo capa 1":
  - `n_matches_hoy` = conteo de tenders abiertos que cumplen el candidateo
    de spec-03 §1.1 (ONU exacto/familia O FTS con `ts_rank ≥ 0.05`) —
    mismas reglas, sin scorer. Nada de "conteo grueso" indefinido.
  - top2 = los 2 candidatos con mejor coincidencia ONU, mostrados **SIN
    puntaje numérico** y con 1 línea de justificación derivable del perfil
    sin scorer: "Piden {producto} — se lo has vendido {n} veces al Estado"
    (overlap ONU + frecuencia, datos que el perfil ya tiene).
  - El bloque visual del puntaje no se renderiza en este modo (no se
    muestra un número inventado ni un placeholder que lo simule).
  - Al conectar F3 (prompt 3), el modo demo se reemplaza por el scoring
    on-demand real (motor invocado síncrono para 1 perfil).

---

## 2.B — Flujo de onboarding (app/(marketing) → app/(app))

### B1. Pantallas (flujo principal, valor antes de registro)

**1. Landing** — input único "Ingresa tu RUT de empresa" + toggle
Empresa/Persona Natural. Sub: "Vemos lo que le has vendido al Estado — no
lo que declaras." Sin más campos. Header: link discreto **"Iniciar
sesión"** (Δ F3). Footer permanente: "Datos vía API oficial de ChileCompra
· Sin afiliación gubernamental · Próxima actualización 06:00" + links a
Política de Privacidad y /tus-datos (21.719 §2.1).

**2. Loading (2-5 s)** — narrativa secuencial: "Leyendo tus órdenes de
compra…" → "Detectando tus rubros…" → "Buscando qué te conviene hoy…".
Revelación con `--reveal`; bajo `prefers-reduced-motion` los textos rotan
sin animación. Si el lookup responde <1.5 s, mantener mínimo 1.5 s (la
narrativa comunica trabajo real; menos se siente falso) — máx 8 s, luego
timeout con retry.

**3. Aha-moment (sin registro)** — momento Neka (05 §1): número
protagonista con `--font-editorial` y `--score-size`:
- "Le has vendido al Estado **12 veces** en 2 años" + rubros top 3,
  regiones, rango de montos, N compradores (chips informativos).
- Teaser: "**7 licitaciones abiertas** te convienen hoy" + top 2 con
  puntaje de conveniencia y 1 línea de justificación; resto blurreado
  (blur real de contenido genérico placeholder — NO enviar los datos
  reales blurreados al cliente: se pueden inspeccionar).
- Rama PN: versión reducida (solo agregados §A4). El bloque de puntaje
  sigue la regla del modo pre-F3 si aplica.
- **Modo pre-F3 (Δ C6):** el aha muestra el resumen de perfil completo
  (capa 1 del foso — esto Licitados no lo puede mostrar) + teaser sin
  puntaje según §A4. Es la variante que sirve de demo en el gate.

**4. Gate de registro** — "Crea tu cuenta gratis para ver las 7" →
email/Google (Supabase Auth). Sin tarjeta. Debajo del CTA (21.719 §2.2):
- ☐ Checkbox NO pre-marcado: "Acepto la Política de Privacidad" (link).
  Bloquea el submit; al aceptar se guarda `policy_version_accepted` +
  `policy_accepted_at` en `users`.
- ☐ Checkbox separado NO pre-marcado: "Quiero recibir mi resumen de la
  mañana por correo" → `digest_enabled`. Opcional: no bloquea registro.

**5. Refinamiento (1 pantalla, skippeable)** — chips editables del perfil
autodetectado (rubros, regiones, monto máx) → `declared_profile`.
Encabezado: "Esto es lo que detectamos. Ajústalo si quieres." CTA "Activar
mi radar" + link "Saltar por ahora". Tier delgado: este paso es
**obligatorio** (sin skip) con copy "historial acotado — afina tu perfil".

**6. Destino** — radar poblado (nunca empty state: los matches del aha ya
existen) + digest programado si opt-in. Evento `onboarding_completed`.

### B2. Ramas y degradación (tabla de contrato)

| Caso | Comportamiento |
|---|---|
| ≥8 OC/24m (pleno) | Flujo completo B1 |
| 3–7 OC (delgado) | Mismo flujo; copy "historial acotado"; paso 5 obligatorio |
| <3 OC (declarativo) | **Secuencia completa (Δ F8):** el paso 3 (aha) se reemplaza por: mensaje "Aún no encontramos historial tuyo en Mercado Público. Cuéntanos qué vendes y te mostramos por dónde empezar." → **selector de rubros** (chips buscables desde `onu_taxonomy`, spec-01; multi-select, máx 5) + selector de regiones → teaser de oportunidades por rubro declarado (modo pre-F3 si aplica) → gate de registro (paso 4). Los chips declarados viven en **estado de cliente** durante la sesión anónima y se envían en el payload del signup → se persisten en `companies.declared_profile` recién al crear la cuenta (coherente con Δ C8: nada se persiste anónimo). Abandono → chips se pierden (solo queda el lead en `events`). NUNCA "no tienes experiencia" |
| Persona Natural | Rama reducida §A4; post-registro verifica email antes de mostrar detalle; enfoque Compra Ágil <100 UTM |
| RUT inválido | Error inline asociado al campo, con formato de ejemplo ("12.345.678-9"); validación DV en cliente Y servidor |
| RUT de organismo público | "Este RUT es de un organismo comprador" + redirect a landing |
| Espejo caído/incompleto | Fallback declarativo + banner "estamos cargando el histórico; tu perfil se enriquecerá solo". NUNCA bloquear registro |
| RUT ya registrado | Permitir (N cuentas por RUT en v1); evento `duplicate_rut_signup` |
| Abandono en gate | Guardar RUT+session_id en `events` (lead anónimo — insumo Fase V; retención 12 meses per spec-01 §4) |

### B2b. Sesión de retorno (Δ F3)

- **`/login`:** email (magic link de Supabase) o Google. Mismo layout
  mínimo de la landing. Errores asociados al campo.
- Usuario autenticado que visita la landing → redirect a `/radar`.
- **Deep links** (digest, push): cualquier ruta de `app/(app)` sin sesión
  → `/login?next={ruta}` y retorno a la ruta original tras autenticar
  (el loop email→radar nunca pierde el destino).
- Cerrar sesión: en el menú de usuario del shell (spec-04 §0).
- Cuenta soft-deleted (spec-04 §6): login bloqueado con mensaje de
  recuperación dentro de los 30 días (copy en `07-inventario-copy.md`).

### B3. Página "Tus datos" + configuración de cuenta (21.719 §2.1–2.3, parcial)

Se construye EN este bloque (es parte del registro/cuenta); las acciones
ARCO completas (export/eliminar) se cablean en el Bloque 4 (radar/config)
pero el schema y las rutas quedan definidos aquí:
- `/tus-datos` (pública): qué datos usa Conviene (espejo público MP + datos
  de cuenta), para qué, base legal de cada uno, cómo ejercer derechos,
  contacto datos@usaconviene.cl. Contenido versionado junto a la política.
- `/politica-privacidad` (pública, versionada, fecha visible, link en
  footer de TODAS las vistas).
- **Contenido (Δ F4):** los textos de ambas páginas NO los redacta Codex.
  Existen como borradores versionados en `docs/legal/`
  (`politica-privacidad-BORRADOR.md`, `tus-datos-contenido.md`),
  generados en el paso 5 y marcados "pendiente validación legal
  pre-lanzamiento" (06 §3). Codex los renderiza tal cual. El texto
  explicativo de los 5 factores (spec-03 §4) ya está incluido en
  `tus-datos-contenido.md` — se redactó AHORA, no en el Bloque 3.
- Config de cuenta: editar email (rectificación §2.3) desde día 1.

### B4. Accesibilidad del flujo (criterios, no anexo — 05 §4)

- Input RUT: label persistente, error asociado (`aria-describedby`),
  formato aceptado con y sin puntos.
- Toggle Empresa/PN operable por teclado, estado visible sin color solo.
- Aha: la revelación secuencial no oculta contenido a lectores de
  pantalla (contenido completo en DOM, animación solo visual).
- Gate: checkboxes con labels clicables; foco visible en todo el flujo.

### B5. Léxico (recordatorio de contrato — /lib/copy)

Todos los strings de B1/B2 salen de `/lib/copy` exactamente como están
escritos aquí (fuente: Blueprint §7). Prohibiciones de AGENTS.md #1 aplican.
En particular: "Tu historial con el Estado" (nunca "perfil comercial"),
"te convienen" (nunca "calzan"/"match").

---

## 3. Telemetría del bloque

Funnel completo: `rut_submitted` → `profile_built` (payload: tier) →
`aha_viewed` → `signup_completed` → `profile_refined` → `radar_activated`.
Extras: `duplicate_rut_signup`, `profile_enriched`, `lookup_rate_limited`.
La métrica de activación del PRD (≥1 puntaje ≥70 en 24h) se calcula desde
este funnel + `match_scored` (F3).

---

## 4. Criterios de aceptación (para los evaluadores)

1. RUT pleno de prueba → aha con datos correctos vs espejo; teaser nunca
   expone filas de OC en el payload de red.
2. Rama PN pre-registro: payload de red contiene SOLO agregados no
   sensibles (inspección de la respuesta del endpoint).
3. Checkbox de política no pre-marcado; submit bloqueado sin él; versión
   y timestamp registrados en `users`.
4. Digest es opt-in: `digest_enabled=false` por defecto, true solo con
   check explícito.
5. Registro nunca bloqueado por espejo caído (fallback declarativo).
6. 11 lookups en 1 hora desde misma sesión → 429 con mensaje amable.
7. `declared_profile` editado no altera `profile` (histórico intacto).
8. Flujo completo operable solo con teclado; blur del teaser no filtra
   datos reales en el DOM.
9. Ningún string de UI hardcodeado fuera de `/lib/copy` (grep del
   evaluador técnico).
10. Lookup anónimo de RUT PN → cero filas nuevas en `companies` (Δ C8).
11. Cuenta PN registrada: la UI y los payloads jamás contienen filas de
    OC individuales (fechas/montos/compradores por orden) — solo
    agregados y matches (Δ C9).
12. RUT PN con 10 OC en el espejo → tier 'pleno' en scoring; flag
    `is_natural_person` true; reglas de display PN activas (Δ C10).
13. Deep link con sesión expirada → login → retorno a la ruta original
    (Δ F3).
14. Modo pre-F3: el aha no renderiza ningún número de puntaje (Δ C6).

---

## 5. Decisiones tomadas en esta spec (nuevas, para tu visto bueno)

1. **Rate limit del lookup (10/hora/IP+sesión):** no estaba en el Blueprint;
   sin él, el aha pre-registro es una API de perfilamiento gratuita y un
   riesgo 21.719 en la rama PN. Valor calibrable.
2. **Blur del teaser = placeholder, no datos reales:** decisión técnica
   anti-inspección; consecuencia del principio "matches gateados hasta
   registro".
3. **Loading mínimo 1.5 s:** decisión UX menor (credibilidad de la
   narrativa); revisable en tablero.
4. **Región del perfil = región del comprador** (no del domicilio del
   proveedor): interpreta "dónde operas" como dónde has vendido. Coherente
   con el factor Región de F3 ("Operas en esta región").
5. **(v1.1)** PN puntúa por historial con display restringido (Δ C9/C10) ·
   lookup anónimo PN no persiste (Δ C8) · rate limit por IP (Δ C15) ·
   modo pre-F3 con contrato exacto (Δ C6) · secuencia declarativa completa
   con taxonomía autopoblada (Δ F8) · login/retorno (Δ F3).
