# Pari

Monorepo separado desde el inicio:

- `apps/client` — app de usuarios; preparada para Capacitor después.
- `apps/business` — panel de antros con Supabase Auth.
- `apps/admin` — panel administrativo.
- `supabase/setup.sql` — esquema inicial, RLS, seeds y asignación de negocios.

## Supabase

Este proyecto está preparado para compartir una base con otros sistemas: **todas las tablas, funciones, trigger y policies propias de Pari usan el prefijo `pari_`**. No crea tablas genéricas como `venues`, `events` o `profiles`. El esquema `auth` sigue siendo el nativo de Supabase.


1. Crea un proyecto en Supabase.
2. Abre SQL Editor y ejecuta completo `supabase/setup.sql`.
3. En Authentication > Users crea estas cuentas con **Auto Confirm User**:
   - `annua@pari.mx`
   - `faunna@pari.mx`
   - `janis@pari.mx`
4. Usa las contraseñas que tú elijas. No se guardan contraseñas en SQL.

El SQL preasigna esos correos a Annua, Faunna Rooftop y Janis. Si los usuarios ya existían, el bloque final también los sincroniza.

## Variables en Vercel

Agrega las mismas dos variables en los tres proyectos Vercel:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

Root directories recomendados:

- Cliente: `apps/client`
- Negocios: `apps/business`
- Admin: `apps/admin`

Framework: Vite. Build: `npm run build`. Output: `dist`.

## Qué ya está conectado

### Cliente
- Lee `pari_venues` reales de Supabase.
- Lee `pari_events` publicados reales de Supabase.
- Si faltan las ENV o hay un error, conserva los datos demo para que la interfaz no se rompa.

### Negocios
- Login real con Supabase Auth.
- Detecta el antro asignado usando `pari_venue_members`.
- Lee reservaciones y eventos del antro autenticado.
- Annua/Faunna/Janis quedan aislados por RLS.

### Admin
- Lee negocios y eventos visibles desde Supabase para comprobar la conexión.

## Siguiente etapa

Falta conectar Auth del cliente, creación real de reservas, compra de boletos, muro, uploads de imágenes y acciones de edición desde el panel de negocios.


## Cliente real (Auth / reservaciones / planes)
Si ya habías corrido `supabase/setup.sql` antes de esta versión, corre también `supabase/patch-client-real.sql` para actualizar el trigger de nuevos usuarios y guardar nombre/celular desde Auth.
