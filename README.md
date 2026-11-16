# Ticket Pari

Plataforma de eventos y boletos sobre las tablas existentes `pari_`. Monorepo Vite + React con tres aplicaciones:

- `apps/client`: catálogo, filtros por ciudad/categoría/fecha, cuentas, perfiles y boletos.
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

Agrega propietario de evento, ciudad, categoría, zona horaria, verificación y campos de compras de prueba. Las cuentas con membresías anteriores pueden seguir administrando los eventos de sus lugares; cualquier cuenta puede crear eventos nuevos sin tener un antro.

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
