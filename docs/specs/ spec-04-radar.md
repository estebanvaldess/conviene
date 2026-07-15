# SPEC 04 — F4: Radar web · Conviene (Paso 5, Bloque 4)

**Estado:** BORRADOR para aprobación · 2026-07-12 · **v1.1 (post-auditoría integral: C4, C5, C7, F2, F9, F10, F11)** · Modelo: Sonnet 5
**Fuentes:** 04-blueprint.md §4 (flujo 2d) + §7 · 05-direccion-diseno.md §1–§5 (card §2 = spec semilla) · 06-cumplimiento-ley-21719.md §2.3
**Depende de:** spec-03 (matches con factors) + spec-01 (checklists) + tokens.css.
**Orden:** cuarta. Superficie principal del producto — `app/(app)/`.
**Incluye (Δ C5):** el builder de checklist **rama B** (set estándar por tipo,
spec-05 §2.1) y su hook en el pipeline de ingesta se construyen EN ESTE
bloque — el radar renderiza "Requisitos" desde el día 1 del bloque; el
Bloque 5 añade la rama A (estructurada, según A1) y el digest.

---

## 0. App shell autenticado (Δ F2 — se construye primero)

Estructura de `app/(app)/`:
- **Topbar:** logo Conviene (link a /radar) · nav: **Radar** ·
  **Guardadas** · **Configuración** · menú de usuario (email visible,
  "Cerrar sesión").
- **Zona de banners** bajo el topbar (slots definidos): transparencia de
  ingesta fallida (spec-01) · digest pausado por bounces (spec-05) ·
  sugerencia zero_match ×7 (§5).
- **Footer en TODAS las vistas** (06 §2.1): Política de Privacidad ·
  /tus-datos · "Datos vía API oficial de ChileCompra · Sin afiliación
  gubernamental" · próxima sincronización.
- Landmarks: `header`/`nav`/`main`/`footer`; skip-link "Ir al contenido".

### Responsive (Δ F11 — el camino principal es email→teléfono)
- Breakpoints de tokens.css: `--bp-sm 640px` · `--bp-md 900px` · `--bp-lg 1200px`.
- **< md:** nav colapsa a menú (botón con label "Menú", no solo ícono);
  cards a ancho completo, una columna; filtros en **sheet inferior**
  (botón "Filtrar" con contador de filtros activos); acciones de la card
  siempre visibles (no gestos ocultos); detalle = página completa (no
  modal).
- **≥ md:** nav horizontal; lista de cards en columna única centrada
  (máx `--container-md`) — el radar es una lista de decisión, no un grid.
- Tablas del detalle ("lo que piden vs lo que has vendido") colapsan a
  pares apilados en < sm.
- Reflow 320px y zoom 200% siguen siendo criterios duros (§7).

## 1. Componente central: `<TenderCard>` (spec semilla 05 §2)

Anatomía obligatoria, de arriba hacia abajo (jerarquía a la decisión:
Oportunidad → Puntaje → A favor → En contra → Requisitos → Acción):

```
[Nombre de la oportunidad]                 h3, --font-editorial, 2 líneas máx + ellipsis
Comprador · Región · Monto · Cierra en N   --ink-secondary; monto "No publicado" si null
────────────────────────────────────────
Conveniencia 82 · Alta                      número --score-size reducido (card) + categoría TEXTO
✓ Has vendido focos LED 12 veces            2-3 factores mayor aporte (matches.factors)
✓ Ya le vendiste 3 veces a esta municipalidad
✗ Exige garantía de $500.000                SIEMPRE el mayor "contra"; si no_contra:
                                            "Sin señales en contra detectadas"
────────────────────────────────────────
Requisitos: cumples 2 de 3                  personalizado en render (ver §1.1); degradado → "guía general"
[Guardar ⭐] [No me interesa] [Ver análisis →]
```

**Reglas duras del componente (AGENTS.md #2–4, testeables):**
1. Render imposible sin ≥1 factor: el componente lanza error en dev si
   `factors` viene vacío (defensa en profundidad; el motor ya lo garantiza).
2. Categoría del puntaje SIEMPRE en texto junto al número: ≥70 "Alta" ·
   40–69 "Media" · <40 no se muestra en radar (umbral spec-03). Color de
   acento solo refuerza; nunca es el único portador.
3. ✓/✗/? con ícono + forma distinta, no solo color (`--factor-favor/contra/duda`).
4. Tier delgado: línea fija "Puntaje basado en historial acotado" bajo el
   número. Tier declarativo: "Basado en tu perfil declarado".
5. Badges de estado sobre la card: "Actualizada" (upgraded_since_last_digest
   o cambio en ⭐) · "Cierra HOY" · "Cerrada" (atenuada).
6. Metadata administrativa (código MP, tipo de proceso) NO va en la card;
   vive en el detalle, nivel secundario (anti portal-estatal).

Estados interactivos: hover eleva sombra mínima; foco visible con outline
de `--accent`; acciones operables por teclado; ninguna acción solo-hover.

### 1.1 Personalización del checklist (Δ C4 — cierra el gap schema↔copy)

`checklists` es **por tender** (spec-01). El "cumples X de Y" es **por
usuario** y se calcula en render/envío, nunca se persiste en `checklists`:

- `evaluateChecklist(checklist, companyProfile)` en `lib/checklist/`:
  recorre `items`; los ítems cuyo estado depende del perfil se re-evalúan
  (v1: garantía vs `rango_montos` → ✗ "Garantía de $X — sobre tu rango
  habitual" o ✓ "No exige garantía"; tramo del proceso vs rango). Ítems
  sin regla personal conservan su estado base.
- "Cumples X de Y": X = ✓ personalizados, Y = total de ítems evaluables
  (los ? no cuentan en Y del titular — la duda no se disfraza en el
  numerador ni el denominador; se muestran aparte).
- Checklist **degradado (rama B)**: NO se personaliza — es guía general;
  la card muestra "Requisitos: guía general" en vez de "cumples X de Y".
- El digest congela el resultado personalizado en `digests.items` al
  enviar (spec-05).

## 2. Vistas

### 2.1 "Hoy" (default)
- Cards por score desc (empate: cierre más próximo, ya ordenado por spec-03).
- Header permanente: "Última actualización HH:MM · próxima sincronización
  06:00" + banner de transparencia si la ingesta del día falló (spec-01).
- Paginación por scroll con "cargar más" (no infinito puro: el fin de la
  lista debe existir — "Eso es todo por hoy" refuerza el silencio honesto).

### 2.2 "Por cierre"
- Grupos: **ESTA SEMANA / PRÓXIMA SEMANA / DESPUÉS** (headers de sección,
  no cards distintas), orden interno por urgencia (closes_at asc).
- Semana = semana calendario CLT (lunes-domingo).

### 2.3 Detalle (`/radar/[tender_code]`)
- Justificación completa: TODOS los factores (favor, contra, duda) con sus
  textos — no solo los 2-3 de la card.
- "Lo que piden vs lo que has vendido": tender_items lado a lado con los
  rubros del perfil que coincidieron (multi-rubro: "cubres el 60% de los
  ítems" — redacción sin "calza", Blueprint §3).
- Checklist completo (todos los ítems con estado y detalle; degradado →
  encabezado "Guía general para este tipo de licitación" + link a bases).
- Fechas clave: publicación, consultas hasta, cierre — con días restantes.
- CTA primario: **"Ver ficha oficial en Mercado Público"** (postular ocurre
  allá) → evento `outbound_click_mp` (la métrica de valor más dura del MVP).
- 👍/👎 sobre la justificación ("¿Te sirvió este análisis?") → `feedback`
  con `factors_snapshot` (lo que el usuario vio, spec-01/03).

## 3. Triage y filtros

- **Guardar ⭐** → `matches.status='saved'`; pestaña/filtro "Guardadas".
- **No me interesa** → `status='discarded'`; recuperable desde filtro
  "Descartadas" (con undo inmediato en snackbar 5 s).
- Etiquetas Participar/Observar = v1.1, NO construir.
- **Filtros v1:** región · monto máx · tipo (Licitación/Compra Ágil) ·
  "para empezar" (flag `first_sale_friendly` de spec-03; visible para todos,
  default ON solo en tier declarativo/PN).
- Los filtros REDUCEN la lista, nunca reordenan: el orden recomendado por
  score se mantiene (patrón Snyk: filtros no sustituyen el juicio).
- Estado de filtros en URL (compartible, back-button correcto).

## 4. Free vs pago

- Free: matches del día SIEMPRE completos (regla dura #5) + historial 7 días.
- Pago: historial completo + (futuro) features Business.
- El gate de historial >7 días: cards visibles en lista pero al abrir →
  modal de upgrade honesto ("El análisis histórico es parte del plan
  pagado"). Sin countdown, sin FOMO, sin "te lo estás perdiendo".

## 5. Estados vacíos y ciclo de vida

| Estado | Comportamiento |
|---|---|
| Cero matches hoy | "Hoy no hay licitaciones que te convengan. Preferimos silencio a inundarte." + últimas 5 vigentes (score ≥40 de días previos) + CTA "Ajustar mi perfil". JAMÁS macro-métricas de relleno (anti-LicitaLAB) |
| `zero_match_day` ×7 (spec-03) | Banner sugerencia: ampliar rubros/regiones (link a chips) |
| Primera visita | Radar poblado desde el aha — nunca empty state de arranque |
| Licitación cerrada | Card "Cerrada" atenuada 48 h → sale a historial. Si estaba ⭐ → notificación in-app "Cerró sin tu oferta" |
| Cambio en ⭐ | Badge "Actualizada" + línea "qué cambió" (diff de campos con peso) |
| Score bajó tras re-score | Reordena sin notificar; solo notifica si ⭐ |

### 5.1 Estados de carga y error por vista (Δ F10 — contrato, no criterio implícito)

| Vista | Carga | Error |
|---|---|---|
| Radar (Hoy/Por cierre) | Skeleton de 3 cards (estructura de la card, sin shimmer agresivo; respeta reduced-motion) | "No pudimos cargar tu radar. Reintentar." + banner si la ingesta del día falló (dato de ayer visible si existe) |
| Detalle | Skeleton de secciones | Tender inexistente/expirado (link viejo de digest): página "Esta licitación ya no está disponible" + estado real si se conoce ("Cerró el {fecha}") + link al radar. NUNCA 404 seco desde un email |
| Configuración | Spinner de sección | Error por sección con reintento, sin perder el resto |
| Export de datos | Botón en estado "Generando…" (disabled, aria-busy) | "No pudimos generar tu archivo. Reintenta o escríbenos a datos@usaconviene.cl" |
| Global | — | 404: "Esta página no existe" + link al radar · 500: "Algo falló de nuestro lado" + reintento. Copys en `07-inventario-copy.md` |

## 6. Configuración de cuenta (vive en el radar — 21.719 §2.3 completo)

`/configuracion` con secciones:
- **Perfil:** chips editables (`declared_profile`) — edición dispara
  re-score on-demand (spec-03 §1.2).
- **Digest:** toggle on/off (opt-in/out en cualquier momento, §2.2) + hora
  fija informada.
- **Perfil — resumen (Δ F9):** la sección abre con los mismos agregados
  del aha ("Le has vendido al Estado N veces en 24 meses", rubros top,
  regiones, rango de montos, N compradores) — el usuario puede re-ver su
  historial resumido en cualquier momento. Cuentas PN: versión agregada
  (spec-02 §A4). Debajo, los chips editables.
- **Tus datos (ARCO §2.3):**
  - "Descargar mis datos" → export JSON+CSV (datos de cuenta, perfil,
    matches, feedback **y eventos propios** — Δ C7, exigido por 06 §2.3)
    generado server-side → `pii_access_log` (action: export) +
    `arco_requests` (tipo: acceso/portabilidad, channel: producto,
    auto-resuelto).
  - "Corregir mis datos" → edición de email y chips (rectificación).
  - "Eliminar mi cuenta" → confirmación en 2 pasos con texto explícito de
    qué se borra (cuenta, matches, feedback, digests), qué se **anonimiza**
    (events: se conservan agregados sin identificador — Δ C7, per 06 §2.3)
    y qué NO se borra (espejo público MP) → soft-delete 30 días
    (`users.deleted_at`, spec-01) + purga por job diario →
    `pii_access_log` + `arco_requests` (tipo: supresión).
  - Nota visible: "Los datos de compras públicas provienen del registro
    oficial del Estado y no se eliminan de la fuente" + link /tus-datos.
- **Plan:** estado de suscripción (Lemon Squeezy portal link).

## 7. Accesibilidad (criterios de aceptación, 05 §4 — no anexo)

- Toda la superficie navegable por teclado; orden de foco = orden visual.
- Reflow 320 px: puntaje y acción primaria siempre visibles, sin scroll
  horizontal; unidades relativas (zoom 200% sin pérdida).
- Cards: heading real (h3) por card; lista con landmarks; filtros con
  labels persistentes; snackbar de undo accesible (role=status).
- `prefers-reduced-motion`: sin transiciones de reorden animadas.
- Checklist ✓/✗/? con texto alternativo ("cumples", "no cumples",
  "verificar en las bases").

## 8. Checklist anti-riesgos para el prototipo (05 §5 — la valida el evaluador UX)

El evaluador UX rechaza el bloque si detecta: escaneo degradado por
minimalismo · sensación distante/premium-frío · espera artificial ·
puntaje protagonista sobre sus explicaciones · factores negativos o
incertidumbre ocultos por "limpieza" · card colapsada a tabla plana o
matriz de alarmas · FOMO/urgencia artificial/claim de resultado.

## 9. Telemetría del bloque

`radar_viewed` (vista, n_cards) · `card_opened` · `card_saved` ·
`card_discarded` (+`card_restored`) · `filter_used` (cuál, valor) ·
`detail_time_spent` · `outbound_click_mp` (posición del match, score) ·
`feedback_voted` · `upgrade_modal_viewed` · `account_export` ·
`account_delete_requested`.

## 10. Criterios de aceptación

1. Card sin factores en payload → error de render en dev, fallback seguro
   en prod (card no se muestra + log).
2. Score 82 en card: número + "Alta" + factores; quitar CSS de color →
   información completa igual.
3. Filtro región aplicado → orden por score intacto dentro del resultado.
4. Usuario Free: matches de hoy completos; item de hace 8 días → modal
   upgrade sin contenido filtrado en el DOM.
5. Descartar → undo en snackbar restaura status.
6. Export de datos: archivo contiene cuenta+perfil+matches+feedback; el
   acceso queda en `pii_access_log`.
7. Eliminar cuenta: tras confirmar, login imposible; datos purgados a los
   30 días (job); espejo intacto.
8. Navegación completa con teclado (test manual guiado incluido en PR).
9. Grep de strings: cero léxico prohibido; todo copy desde /lib/copy.
10. `outbound_click_mp` registra posición y score del match clickeado.
11. Mismo tender, dos usuarios con perfiles distintos → "cumples X de Y"
    distinto; `checklists` sin cambios (Δ C4).
12. Export contiene events propios; eliminación anonimiza events (Δ C7).
13. Link de digest a tender expirado → página "ya no está disponible",
    nunca 404 seco (Δ F10).
14. A 375px: nav accesible, filtros en sheet, acciones de card visibles
    sin scroll horizontal (Δ F11).

## 11. Decisiones nuevas en esta spec (para tu visto bueno)

1. **Categorías del puntaje "Alta/Media"** con cortes 70/40 (alineados a
   los umbrales de spec-03): el Blueprint pedía "número + categoría +
   texto" (05 §2 regla 3) pero no nombraba las categorías. Propongo 2
   niveles, no 3 (un "Baja" visible contradice el filtro ≥40).
2. **Gate de historial Free = modal al abrir, lista visible:** interpreta
   "historial 7 días en Free" de forma menos agresiva que ocultar la lista;
   muestra que el producto sigue trabajando sin regalar el análisis.
3. **Undo de descarte en snackbar (5 s):** materializa "descartadas
   recuperables" con el patrón de menor fricción.
4. **Soft-delete 30 días en eliminación de cuenta:** estándar operativo
   (recuperación ante arrepentimiento/error) compatible con §2.3; el plazo
   se informa al usuario en la confirmación.
5. **Filtro "para empezar" visible para todos** (default ON solo en
   declarativo/PN): el Blueprint lo definía "nativo" del modo primera
   venta; lo generalizo porque un tier pleno también puede querer
   oportunidades de baja barrera. Reversible si prefieres exclusividad.
6. **(v1.1)** Shell + responsive (Δ F2/F11) · checklist personalizado en
   render (Δ C4) · rama B del builder adelantada a este bloque (Δ C5) ·
   export/supresión alineados al 06 (Δ C7) · estados de carga/error como
   contrato (Δ F10) · resumen de perfil re-visible (Δ F9).
