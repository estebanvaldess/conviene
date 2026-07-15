# Política de Privacidad — Conviene

**Estado: BORRADOR — pendiente validación legal pre-lanzamiento** (ver `06-cumplimiento-ley-21719.md` §3)
**Versión:** 1.0 (regenerada 2026-07-15 — reemplaza versión previa no recuperada)
**Fecha de última actualización:** [completar al publicar]

Este texto es un borrador de trabajo. No debe publicarse sin la revisión legal puntual de 2-3 horas descrita en `06-cumplimiento-ley-21719.md` §3. Los campos entre `{...}` son placeholders que el responsable del producto debe completar antes de publicar.

---

## 1. Responsable del tratamiento

**Razón social:** {razón social de la empresa/persona responsable}
**RUT:** {RUT}
**Representante legal:** {nombre}
**Domicilio:** {domicilio}
**Contacto para materias de datos personales:** datos@usaconviene.cl

## 2. Qué datos recopila Conviene

| Dato | Origen | Finalidad |
|---|---|---|
| Email, nombre de cuenta | Registro directo del usuario | Autenticación y comunicación del servicio |
| RUT de la empresa consultada | Ingresado por el usuario | Construcción del perfil de conveniencia |
| Historial de órdenes de compra públicas | Espejo del registro oficial de Mercado Público (ChileCompra) | Cálculo del puntaje de conveniencia y checklist de admisibilidad |
| Preferencias declaradas (rubros, regiones) | Ingresadas por el usuario en onboarding/configuración | Personalización de resultados |
| Eventos de uso (clics, aperturas, votos) | Generados por el uso del producto | Mejora del servicio, soporte, analítica interna |

Conviene **no vende datos a terceros** ni los usa con fines publicitarios ajenos al producto.

## 3. Base legal del tratamiento

- **Datos de cuenta (email, preferencias):** ejecución del contrato de servicio y consentimiento explícito otorgado en el registro.
- **Datos del espejo de compras públicas de personas jurídicas:** el RUT de una empresa no constituye dato personal bajo la Ley 21.719; se trata como información pública de fuente oficial (Ley 19.886).
- **Datos del espejo de compras públicas asociados a proveedores persona natural:** fuente de acceso público (registro estatal) + interés legítimo del servicio, con las mitigaciones descritas en la sección 6.
- **Digest por correo:** consentimiento separado y explícito (casilla de aceptación no premarcada en el registro).

## 4. Cómo se usan los datos

Los datos se usan exclusivamente para:
- Calcular el puntaje de conveniencia (0–100) y el checklist de admisibilidad de licitaciones relevantes al perfil del usuario.
- Enviar el resumen diario (digest) si el usuario lo activó explícitamente.
- Operar funciones de cuenta: guardado de oportunidades, historial, configuración.
- Analítica interna agregada para mejorar el producto (nunca se comparte a nivel individual con terceros).

Conviene **nunca predice ni garantiza probabilidad de adjudicación**. El puntaje refleja fit y admisibilidad documentada, no un pronóstico de resultado.

## 5. Con quién se comparten los datos (encargados de tratamiento)

Los siguientes proveedores procesan datos en nombre de Conviene, bajo acuerdos de tratamiento de datos (DPA) equivalentes al estándar exigido por la Ley 21.719:

| Proveedor | Función | Ubicación de servidores |
|---|---|---|
| Supabase | Base de datos y autenticación | sa-east-1 (São Paulo, Brasil) |
| Vercel | Hosting de la aplicación | Variable según región de despliegue |
| Resend / proveedor de email | Envío del digest y notificaciones | {completar según proveedor final} |
| Lemon Squeezy | Procesamiento de pagos (merchant of record) | {completar} |

Al usar servidores fuera de Chile, existe una transferencia internacional de datos. Todos los proveedores listados cuentan con acuerdos de tratamiento de datos que cubren confidencialidad, subencargados, devolución/destrucción de datos y notificación de brechas, conforme a estándares equivalentes a GDPR.

## 6. Proveedores persona natural en el espejo de compras públicas

Si usted es una persona natural que ha vendido al Estado y su información aparece en el espejo de datos de Conviene proveniente del registro público de Mercado Público, Conviene aplica las siguientes mitigaciones:

- El detalle de su historial no se expone a terceros que consulten su RUT antes de que usted verifique su identidad mediante registro y correo.
- Usted puede oponerse a que su historial sea usado en el cálculo de conveniencia de otros usuarios, excluyendo su RUT del motor de matching (ver sección 8, derecho de oposición).
- El dato bruto público del registro estatal no se elimina de la fuente oficial; el ejercicio de sus derechos aplica a cómo Conviene lo procesa, no al registro original de ChileCompra.

## 7. Retención de datos

- Datos de cuenta activa: mientras la cuenta esté vigente.
- Cuenta eliminada: eliminación efectiva a los 30 días (periodo de arrepentimiento), salvo datos que deban conservarse por obligación legal.
- Eventos de leads anónimos (abandono de registro): retención máxima de 12 meses, luego anonimizados.
- Eventos de uso general: agregados o anonimizados a los 24 meses.

## 8. Sus derechos (ARCO + portabilidad)

Usted tiene derecho a: **A**cceder a sus datos, solicitar su **R**ectificación, pedir su **C**ancelación (supresión) y **O**ponerse a su tratamiento, además del derecho a la **portabilidad** de sus datos.

Puede ejercer estos derechos:
- Desde su cuenta, en Configuración → Tus Datos (acceso, rectificación y descarga directa).
- A través del formulario público en `/tus-datos/solicitud`, disponible sin necesidad de tener cuenta (para proveedores persona natural del espejo que no son usuarios de Conviene).
- Escribiendo a datos@usaconviene.cl.

Toda solicitud recibe un correo de confirmación con un enlace de verificación; el plazo legal de respuesta comienza a correr desde su confirmación. Las solicitudes de oposición (exclusión del matching) se resuelven con una barrera de verificación menor que las de acceso/rectificación sobre historial de terceros, dado que excluir un RUT del análisis no expone datos adicionales.

## 9. Seguridad

Conviene aplica controles de acceso a nivel de fila (RLS) en su base de datos, de forma que ningún usuario puede acceder a datos de otro usuario. El espejo de datos públicos es de solo lectura desde la aplicación. Mantenemos registros de auditoría de acceso a datos personales.

## 10. Notificación de brechas

En caso de una brecha de seguridad que comprometa datos personales, Conviene notificará a la Agencia de Protección de Datos Personales (APDP) y, si el riesgo es alto, a los titulares afectados, sin dilación indebida, conforme a la Ley 21.719.

## 11. Cambios a esta política

Esta política puede actualizarse. Toda nueva versión será fechada y notificada de forma visible; el uso continuado del servicio tras una actualización implica su aceptación, salvo que la ley exija un nuevo consentimiento explícito.

---

*Esta política entra en vigencia junto con la Ley 21.719 (01-12-2026). Este documento es un borrador de trabajo pendiente de validación legal formal antes de su publicación.*
