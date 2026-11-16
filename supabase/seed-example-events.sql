-- Four explicitly fictional public examples. No real event or charge is represented.
-- Existing administrators manage these sample events. Stable IDs prevent duplicate seeds.
begin;
insert into public.pari_events
(id,title,description,venue_name,address,city,image_url,starts_at,ends_at,ticket_price,ticket_inventory,type,status,category,time_zone,organizer_name,organizer_verified)
values
('ea000001-2026-4000-8000-000000000001','Neón Sessions · Rooftop Party',
'[Evento de ejemplo]
Una noche de house, luces y buenos amigos, con una terraza como escenario. Puertas 20:00 · warm-up 20:30 · DJ set principal 22:00.

El acceso general incluye entrada al evento. Bebidas no incluidas. Evento ilustrativo para mayores de 18 años; identificación requerida en un evento real.

Esta ficha es una demostración de Ticket Pari: el lugar, la dirección y la programación son ficticios. La imagen es ilustrativa. Puedes probar la compra sin cargos reales con la tarjeta 1234123412341234.',
'Azotea Pari Roma','Dirección de ejemplo · colonia Roma Norte','Ciudad de México',
'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85',
'2026-11-21 20:00:00-06','2026-11-22 02:00:00-06',350,180,'party','published','Fiestas','America/Mexico_City','Ticket Pari · Ejemplos',false),
('ea000002-2026-4000-8000-000000000002','Sin Filtro · Noche de Stand Up',
'[Evento de ejemplo]
Tres comediantes, un micrófono y muchas historias que no deberían contarse en voz alta. Un show de comedia para desconectar y reír con tus amigos.

Puertas 19:30 · show 20:30 · duración aproximada 90 minutos. Acceso general sin asiento asignado; llega con anticipación. Consumo de alimentos y bebidas por separado. Mayores de 18 años.

Esta ficha es una demostración de Ticket Pari: el recinto y el elenco son ficticios; la imagen es ilustrativa. La compra solo simula un pago y no genera un acceso a un evento real.',
'Foro Pari Americana','Dirección de ejemplo · colonia Americana','Guadalajara',
'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=85',
'2026-11-27 20:30:00-06','2026-11-27 22:00:00-06',220,90,'other','published','Stand up','America/Mexico_City','Ticket Pari · Ejemplos',false),
('ea000003-2026-4000-8000-000000000003','Indie al Atardecer · Live Sessions',
'[Evento de ejemplo]
Guitarras, canciones nuevas y un escenario íntimo para descubrir tu próxima banda favorita. Tres proyectos independientes comparten una tarde de música en vivo.

Puertas 17:00 · primera banda 18:00 · cierre 22:00. El boleto incluye entrada general a todos los sets. No incluye alimentos, bebidas ni estacionamiento. Acceso para mayores de 16 años; menores acompañados de un adulto.

Evento ficticio para mostrar Ticket Pari. Los artistas, el foro y la dirección son de ejemplo; la foto es ilustrativa. No se realizan cargos reales al probar la compra.',
'Patio Pari Barrio Antiguo','Dirección de ejemplo · Barrio Antiguo','Monterrey',
'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85',
'2026-11-28 18:00:00-06','2026-11-28 22:00:00-06',280,240,'other','published','Música','America/Mexico_City','Ticket Pari · Ejemplos',false),
('ea000004-2026-4000-8000-000000000004','Pari Fest · Música y Experiencias',
'[Evento de ejemplo]
Un sábado para descubrir música, probar algo nuevo y hacer recuerdos. Dos escenarios, sets en vivo, zona de comida y espacios para descansar entre tus shows favoritos.

Apertura 15:00 · música desde 16:00 · cierre 23:00. Acceso general a escenarios y áreas comunes; alimentos y bebidas se pagan por separado. Evento al aire libre: lleva ropa cómoda. Mayores de 18 años.

Este festival es ficticio y se publica únicamente como ejemplo. El recinto, la dirección y la programación son ilustrativos. Puedes recorrer el proceso de compra sin cargos reales.',
'Jardín Pari Cholula','Dirección de ejemplo · zona de Cholula','Puebla',
'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85',
'2026-12-05 15:00:00-06','2026-12-05 23:00:00-06',590,500,'festival','published','Festivales','America/Mexico_City','Ticket Pari · Ejemplos',false)
on conflict (id) do nothing;
commit;
select title,city,category,ticket_price,ticket_inventory from public.pari_events where id in ('ea000001-2026-4000-8000-000000000001','ea000002-2026-4000-8000-000000000002','ea000003-2026-4000-8000-000000000003','ea000004-2026-4000-8000-000000000004') order by starts_at;
