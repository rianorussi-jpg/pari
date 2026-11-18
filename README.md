# Ticket Pari

Plataforma de eventos y boletos sobre las tablas existentes `pari_`. Monorepo Vite + React con tres aplicaciones:

- `apps/client`: catálogo, filtros por ciudad/categoría/fecha, favoritos en este dispositivo, cuentas, perfiles y checkout separado en tres pasos (boletos, asistente y pago).
- `apps/business`: creación y administración de eventos, ventas y control de acceso.
- `apps/admin`: administración de eventos y verificación de organizadores (requiere `pari_profiles.role = 'admin'`).

La interfaz y lógica compartidas viven en `apps/shared`.

## Desarrollo

Node 24 y npm. Ejecutar desde la raíz:

```sh
npm ci
npm run dev:client
npm run dev:business
npm run dev:admin
npm test
npm run build
```

Configurar en cada aplicación las variables del archivo `.env.example`. Solo se usa la URL del proyecto y la clave pública/publishable de Supabase; nunca `service_role`.

## Base existente

La migración `supabase/migrations/20261116223846_ticket_pari.sql` (también disponible como `supabase/patch-ticket-pari.sql`) se aplica sobre la base que ya tiene `setup.sql`, `patch-client-real.sql` y `patch-operacion-completa.sql`. No volver a ejecutar el setup en una base existente. La migración conserva eventos, perfiles, órdenes y datos de antros anteriores.

Agrega propietario de evento, ciudad, categoría, zona horaria, verificación y campos de compras de prueba. Las cuentas con membresías anteriores pueden seguir administrando los eventos de sus lugares; solo las cuentas autorizadas con rol business o admin pueden crear eventos nuevos. El administrador puede autorizar o retirar ese acceso desde Accesos y verificación.

Cada evento usa una zona horaria explícita. Los horarios se capturan en la hora local del evento y se guardan en UTC. El catálogo permite cualquier ciudad; el filtro muestra las ciudades con eventos futuros publicados.

## Pagos de prueba

La única tarjeta aceptada es **1234123412341234**. No se procesan cobros ni se guardan números de tarjeta. La base valida precio, cantidad, publicación y disponibilidad; genera la orden `paid` con `is_demo = true` y descuenta inventario en una transacción con bloqueo de fila. Un identificador por solicitud evita duplicados al reintentar.

Las órdenes anteriores mantienen sus estados y no se convierten en pagadas. Las cifras del panel incluyen órdenes confirmadas; los pagos nuevos son simulados.

Los boletos muestran un código de acceso por orden/grupo. El organizador introduce ese código en Control de acceso; el ingreso solo se registra una vez. La emisión de QR y escaneo por cámara no están incluidos en esta versión.

La verificación se solicita desde Perfil y la aprueba/revoca un administrador. Un trigger impide a los usuarios cambiar su propio rol o verificación. Los datos privados del perfil no se publican en los eventos.

## Vercel

Proyectos existentes: `pari-client`, `pari-business` y `pari-admin`. Cada proyecto debe usar su directorio `apps/<app>` y permitir incluir archivos fuera de ese directorio (el módulo compartido está en `apps/shared`). Mantener las variables públicas de Supabase existentes. `npm run build` valida las tres aplicaciones desde la raíz.

## Pruebas

`npm test` ejecuta las migraciones contra PostgreSQL embebido (PGlite) y verifica RLS, propietario, acceso anónimo, protección de roles, verificación administrativa, compra simulada, inventario, idempotencia, privacidad de órdenes y rechazo de doble ingreso. También valida conversiones de zona horaria y horarios inexistentes por cambio de horario.

## Checkout y acceso reservado

Aplicar `supabase/migrations/20261116233225_curated_organizers_checkout.sql` (copia: `supabase/patch-checkout-organizers.sql`) después de la migración Ticket Pari. Añade datos de asistente a las órdenes con los mismos permisos de lectura existentes. La función `pari_checkout_demo` valida estos datos y usa la compra transaccional existente. Los reintentos no cambian al asistente ni duplican el inventario.

La aplicación de clientes no ofrece crear eventos ni presenta Organizar en su navegación. Guardados conserva IDs de eventos en localStorage, por cuenta/dispositivo; no sincroniza favoritos entre dispositivos. El panel business requiere una cuenta autorizada. Verificación de identidad y autorización para organizar son controles separados. Las cuentas de asistentes no pueden darse permisos a sí mismas. Retirar el acceso de organizador bloquea administración, órdenes e ingreso de sus eventos. Los datos y eventos existentes se conservan.

## Cuentas anteriores a Pari

Aplicar `supabase/migrations/20261117000845_ensure_own_profile.sql` (copia: `supabase/patch-ensure-profile.sql`). Al entrar, la app tolera que todavía no exista el perfil y lo inicializa mediante `pari_ensure_my_profile`, únicamente para la cuenta autenticada. El perfil nuevo siempre es de asistente; no se toman roles ni verificación de metadatos editables. Los perfiles y permisos existentes se conservan. No se crean perfiles masivamente para cuentas de otros sistemas de la base compartida.

### Administración y transferencias

El panel global está en `/admin`. Los usuarios con eventos asignados pueden abrir `/mis-eventos` desde su perfil. La comisión es un importe fijo en MXN por boleto. Se registra en cada orden al apartar o comprar. Las estadísticas financieras excluyen las órdenes de prueba.

Los comprobantes se guardan en el bucket privado `pari-receipts`. Un apartado sin comprobante vence al primero de estos plazos: 24 horas o el comienzo del evento. Una vez enviado el comprobante, la orden queda pendiente de revisión. La aprobación debe corresponder a un depósito verificado.

#### Avisos de aprobación por correo

La función Edge `pari-order-email` procesa las aprobaciones reales desde `pari_private.email_outbox`. Configura `PARI_SMTP_URL` con SMTP sobre TLS en el puerto 465, `PARI_EMAIL_FROM` con el remitente verificado y `PARI_MAIL_JOB_SECRET` con un secreto aleatorio exclusivo de este trabajo. Guarda el mismo secreto como `pari_mail_job_secret` en Vault. Configura un trabajo de Supabase Cron para invocarla por POST en `/functions/v1/pari-order-email` con el encabezado `x-pari-mail-secret` tomado de Vault. La función usa la conexión de base de datos del entorno de Supabase y procesa un correo por invocación. La entrega depende de las credenciales y del cron.
