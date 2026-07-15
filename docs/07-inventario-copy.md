# 07 — INVENTARIO DE COPY TRANSVERSAL (fuente de /lib/copy)

**Estado:** APROBADO junto al cierre de la auditoría integral · 2026-07-12 · **Origen: hallazgo F7**
**Regla:** este documento COMPLETA el léxico del Blueprint §7 (que sigue siendo la fuente de los textos de onboarding, puntaje, checklist, digest y sistema ya definidos allí). Codex implementa /lib/copy desde AMBOS, con los textos EXACTOS. Tono: chileno profesional cercano (tú), cero superlativos, cero urgencia artificial. Léxico prohibido: AGENTS.md #1.

---

## 1. Sesión y autenticación
- Landing header: "Iniciar sesión"
- /login título: "Entra a tu radar" · sub: "Te enviamos un enlace a tu correo — sin contraseñas." · botón: "Enviarme el enlace" · alternativa: "Continuar con Google"
- Magic link enviado: "Revisa tu correo. El enlace vence en 15 minutos."
- Email inválido: "Revisa el formato del correo (ej: nombre@empresa.cl)"
- Sesión expirada (deep link): "Tu sesión expiró. Entra de nuevo y te llevamos donde ibas."
- Cuenta eliminada en ventana de 30 días: "Esta cuenta está en proceso de eliminación. Si te arrepentiste, escríbenos a datos@usaconviene.cl antes del {fecha} y la recuperamos."
- Email de verificación — asunto: "Confirma tu correo para activar tu radar" · cuerpo: enlace + "Si no creaste una cuenta en Conviene, ignora este correo."

## 2. Errores y estados de sistema
- 404: "Esta página no existe." + CTA "Ir a mi radar"
- 500: "Algo falló de nuestro lado. Ya quedó registrado — intenta de nuevo en un momento."
- Radar sin cargar: "No pudimos cargar tu radar." + botón "Reintentar"
- Timeout del lookup (spec-02 §B1.2, >8 s): "Esto está tardando más de lo normal." + botón "Reintentar"
- Rate limit lookup (429): "Has hecho varias consultas seguidas. Espera unos minutos e intenta de nuevo."
- Tender expirado desde link: "Esta licitación ya no está disponible." + si se conoce: "Cerró el {fecha}." + CTA "Ver mi radar"
- Export fallido: "No pudimos generar tu archivo. Reintenta o escríbenos a datos@usaconviene.cl"
- Digest pausado (banner, bounces ×3): "Tu resumen diario está pausado: no pudimos entregar el correo a {email}." + CTA "Reactivar" / "Corregir correo"
- Digest demorado (marca en email, Δ C12): "Estamos terminando de actualizar los datos de hoy — puede haber oportunidades adicionales en tu radar."

## 3. Triage y acciones del radar
- Snackbar descarte: "Oportunidad descartada." + acción "Deshacer" (5 s)
- Restaurada: "De vuelta en tu radar."
- Notificación cierre sin oferta (⭐): "Cerró sin tu oferta: {nombre}. La guardamos en tu historial."
- Badge "qué cambió": "Actualizada: {campo} pasó de {antes} a {ahora}"
- Fin de lista: "Eso es todo por hoy."
- Tope de guardadas Free (spec-06): "Tienes 10 guardadas — archiva una o pasa a un plan pagado para guardar sin límite."

## 4. Upgrade y planes (sin FOMO — regla dura)
- Modal historial >7 días: título "El análisis histórico es parte del plan pagado" · cuerpo: "En Free ves completo todo lo de los últimos 7 días — puntaje, justificación y requisitos incluidos. El historial anterior y el seguimiento de cerradas viven en los planes pagados." · CTA "Ver planes" · secundario "Seguir en Free"
- /precios intro: "El juicio es gratis todos los días. Pagar compra profundidad." 
- Cupo Fundador: "Quedan {n} cupos Fundador — mismo plan que Pro, precio fijo de por vida."
- Impago (banner, gracia): "No pudimos procesar tu pago. Tienes hasta el {fecha} antes de volver al plan Free — tus matches del día seguirán completos igual."

## 5. Cuenta, datos y ARCO
- Confirmación eliminar cuenta (paso 1): "Vas a eliminar tu cuenta de Conviene." · detalle: "Se borran: tu cuenta, tus oportunidades guardadas, tus votos y tus resúmenes. Tu actividad de uso se conserva solo como estadística anónima. Los datos de compras públicas provienen del registro oficial del Estado y no se eliminan de la fuente." · "Tienes 30 días para arrepentirte escribiéndonos."
- Paso 2 (confirmación): campo "Escribe ELIMINAR para confirmar" + botón "Eliminar mi cuenta definitivamente"
- Export listo: "Tu archivo está listo — incluye tu cuenta, perfil, oportunidades, votos y tu actividad de uso."
- Formulario ARCO /tus-datos/solicitud — título: "Ejerce tus derechos sobre tus datos" · campos: tipo de solicitud (acceso / rectificación / supresión / oposición / portabilidad), RUT del titular, correo de contacto, detalle · envío: "Te enviamos un correo para confirmar tu solicitud. El plazo legal corre desde tu confirmación."
- Acuse ARCO (email) — asunto: "Recibimos tu solicitud sobre tus datos" · cuerpo: tipo, fecha, "Confírmala aquí: {link}. Responderemos dentro del plazo legal." 
- Oposición resuelta (email): "Listo: tu RUT quedó excluido del análisis de oportunidades de Conviene."

## 6. Emails adicionales
- Push cierre adelantado — asunto: "La licitación que guardaste adelantó su cierre" · cuerpo: "{nombre} ahora cierra el {fecha} ({n} días antes). Si vas a postular, revisa los requisitos hoy." + card comprimida + pie fijo del Blueprint §7.
- Digest semanal — asunto: "Tu resumen de la semana" · intro: "Esta semana no hubo oportunidades sobre tu umbral. Esto es lo más cercano a tu perfil:" · cierre: "¿Muy silencioso? Amplía tus rubros o regiones: {link a chips}" + pie fijo.
- Digest día vacío (14 días de hábito): cuerpo 3 líneas — "Hoy no hay nada que te convenga. Preferimos silencio a inundarte. Te avisamos mañana a la misma hora." + pie fijo.

## 7. Onboarding — piezas que faltaban
- Selector declarativo — título: "Cuéntanos qué vendes" · buscador de rubros: placeholder "Busca tu rubro (ej: insumos dentales)" · máx: "Hasta 5 rubros — los que mejor te representen" · regiones: "¿Dónde puedes operar?"
- Chips (refinamiento) — hint: "Esto es lo que detectamos. Ajústalo si quieres." (ya en Blueprint; se repite aquí por completitud del selector)
- Rama PN post-registro (nota fija, Δ C9): "Por protección de datos, mostramos tu historial como totales agregados. La verificación completa de identidad llegará pronto."

## 8. Explicación de los 5 factores (para /tus-datos — texto canónico, spec-03 §4)
Incluido en `docs/legal/tus-datos-contenido.md` §3 (una sola fuente; /lib/copy lo importa desde ahí).

---
**Regla de mantenimiento:** todo string nuevo que un bloque necesite y no esté aquí ni en Blueprint §7 se agrega AQUÍ vía propuesta de Codex + OK del dueño — nunca se inventa inline.
