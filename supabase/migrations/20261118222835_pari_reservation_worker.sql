create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'pari-expire-reservations',
  '* * * * *',
  'select pari_private.expire_reservations()'
);
