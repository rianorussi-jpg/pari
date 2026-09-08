# Pari

Plataforma de descubrimiento y reservaciones para vida nocturna.

## Estructura
- `apps/client`: app para usuarios. Esta es la que después se convertirá con Capacitor.
- `apps/business`: panel para antros/venues.
- `apps/admin`: panel interno de Pari.

## Ejecutar
```bash
npm install
npm run dev:client
```

Luego, para los otros paneles:
```bash
npm run dev:business
npm run dev:admin
```
