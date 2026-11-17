import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
let setup = fs
  .readFileSync("supabase/setup.sql", "utf8")
  .replace("create extension if not exists pgcrypto;", "");
await db.exec(setup);
await db.exec(fs.readFileSync("supabase/patch-operacion-completa.sql", "utf8"));
await db.exec(fs.readFileSync("supabase/patch-ticket-pari.sql", "utf8"));
await db.exec(fs.readFileSync("supabase/patch-ensure-profile.sql", "utf8"));
const organizer = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  buyer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  other = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  eid = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
for (const [id, email] of [
  [organizer, "organizer@test.local"],
  [buyer, "buyer@test.local"],
  [admin, "admin@test.local"],
  [other, "other@test.local"],
])
  await db.query("insert into auth.users(id,email) values($1,$2)", [id, email]);
await db.query("update public.pari_profiles set role='admin' where id=$1", [
  admin,
]);
await db.query("update public.pari_profiles set role='business' where id=$1", [
  organizer,
]);
await db.exec(
  fs.readFileSync("supabase/patch-checkout-organizers.sql", "utf8"),
);
await db.exec(
  "grant select,update on public.pari_profiles to authenticated;grant select on public.pari_venue_members to authenticated;",
);
async function as(id, sql, params = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  return db.query(sql, params);
}
async function denied(id, sql, params = []) {
  await assert.rejects(() => as(id, sql, params));
}
await as(
  organizer,
  `insert into public.pari_events(id,title,organizer_id,city,starts_at,ticket_price,ticket_inventory,status) values($1,'Test Ticket Pari',$2,'Guadalajara',now()+interval '10 days',250,3,'published')`,
  [eid, organizer],
);
assert.equal(
  (await as(null, "select * from public.pari_events where id=$1", [eid])).rows
    .length,
  1,
);
await denied(
  buyer,
  "update public.pari_profiles set role='admin' where id=$1",
  [buyer],
);
await denied(
  buyer,
  "update public.pari_profiles set is_verified=true where id=$1",
  [buyer],
);
await denied(buyer, "select public.pari_set_verified($1,true)", [buyer]);
await as(admin, "select public.pari_set_verified($1,true)", [organizer]);
assert.equal(
  (
    await as(
      null,
      "select organizer_verified from public.pari_events where id=$1",
      [eid],
    )
  ).rows[0].organizer_verified,
  true,
);
await denied(
  buyer,
  "select public.pari_buy_demo_tickets($1,1,'4111111111111111',gen_random_uuid())",
  [eid],
);
const req = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const order = (
  await as(
    buyer,
    "select public.pari_buy_demo_tickets($1,2,'1234123412341234',$2) as result",
    [eid, req],
  )
).rows[0].result;
assert.equal(order.total, 500);
assert.equal(order.is_demo, true);
assert.equal(order.status, "paid");
const retry = (
  await as(
    buyer,
    "select public.pari_buy_demo_tickets($1,2,'1234123412341234',$2) as result",
    [eid, req],
  )
).rows[0].result;
assert.equal(order.id, retry.id);
assert.equal(
  (
    await as(
      null,
      "select ticket_inventory from public.pari_events where id=$1",
      [eid],
    )
  ).rows[0].ticket_inventory,
  1,
);
await denied(
  buyer,
  "select public.pari_buy_demo_tickets($1,2,'1234123412341234',gen_random_uuid())",
  [eid],
);
assert.equal(
  (await as(other, "select * from public.pari_ticket_orders")).rows.length,
  0,
);
assert.equal(
  (await as(organizer, "select * from public.pari_ticket_orders")).rows.length,
  1,
);
await denied(buyer, "select public.pari_check_in($1)", [order.qr_token]);
await as(organizer, "select public.pari_check_in($1)", [order.qr_token]);
await denied(organizer, "select public.pari_check_in($1)", [order.qr_token]);
await denied(
  buyer,
  "insert into public.pari_ticket_orders(user_id,event_id,quantity,unit_price,total,status) values($1,$2,1,0,0,'paid')",
  [buyer, eid],
);
await as(
  organizer,
  "update public.pari_events set status='draft' where id=$1",
  [eid],
);
assert.equal(
  (await as(null, "select * from public.pari_events where id=$1", [eid])).rows
    .length,
  0,
);
assert.equal(
  (await as(other, "select * from public.pari_events where id=$1", [eid])).rows
    .length,
  0,
);
assert.equal(
  (
    await as(
      other,
      "update public.pari_events set title='hacked' where id=$1 returning id",
      [eid],
    )
  ).rows.length,
  0,
);
await denied(
  organizer,
  "update public.pari_events set organizer_id=$1 where id=$2",
  [other, eid],
);
await denied(
  buyer,
  `insert into public.pari_events(title,organizer_id,city,starts_at,status) values('Unauthorized event',$1,'Puebla',now()+interval '10 days','draft')`,
  [buyer],
);
await denied(buyer, "select public.pari_set_organizer($1,true)", [buyer]);
await denied(
  buyer,
  "update public.pari_profiles set role='business' where id=$1",
  [buyer],
);
await as(
  organizer,
  "update public.pari_events set status='published',ticket_inventory=5 where id=$1",
  [eid],
);
const checkoutReq = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const checkoutSql =
  "select public.pari_checkout_demo($1,1,'1234123412341234',$2,$3,$4,$5) as result";
await denied(buyer, checkoutSql, [eid, checkoutReq, "A", "bad-email", ""]);
await denied(buyer, checkoutSql, [
  eid,
  checkoutReq,
  "Asistente de prueba",
  "test@example.invalid",
  "invalid phone",
]);
const details = [
  eid,
  checkoutReq,
  "Asistente de prueba",
  "TEST@example.invalid",
  "+52 5512345678",
];
const checkoutOrder = (await as(buyer, checkoutSql, details)).rows[0].result;
assert.equal(checkoutOrder.attendee_name, "Asistente de prueba");
assert.equal(checkoutOrder.attendee_email, "test@example.invalid");
assert.equal(checkoutOrder.attendee_phone, "+52 5512345678");
assert.equal(
  (await as(buyer, checkoutSql, details)).rows[0].result.id,
  checkoutOrder.id,
);
await denied(buyer, checkoutSql, [
  eid,
  checkoutReq,
  "Otro asistente",
  "test@example.invalid",
  "",
]);
assert.equal(
  (
    await as(
      null,
      "select ticket_inventory from public.pari_events where id=$1",
      [eid],
    )
  ).rows[0].ticket_inventory,
  4,
);
assert.equal(
  (
    await as(other, "select * from public.pari_ticket_orders where id=$1", [
      checkoutOrder.id,
    ])
  ).rows.length,
  0,
);
await as(admin, "select public.pari_set_organizer($1,false)", [organizer]);
assert.equal(
  (await as(organizer, "select * from public.pari_ticket_orders")).rows.length,
  0,
);
assert.equal(
  (
    await as(
      organizer,
      "update public.pari_events set title='Revoked' where id=$1 returning id",
      [eid],
    )
  ).rows.length,
  0,
);
await denied(organizer, "select public.pari_check_in($1)", [
  checkoutOrder.qr_token,
]);
await as(admin, "select public.pari_set_organizer($1,true)", [organizer]);
assert.equal(
  (
    await as(organizer, "select * from public.pari_ticket_orders where id=$1", [
      checkoutOrder.id,
    ])
  ).rows.length,
  1,
);
await denied(admin, "select public.pari_set_organizer($1,false)", [admin]);
console.log(
  "PASS: curated organizer permissions, admin grants/revocation, attendee validation, saved checkout data and retry consistency",
);
// Simulate a pre-existing Auth account whose Pari profile was never created.
await db.exec("reset role");
await db.query("select set_config('request.jwt.claim.sub','',false)");
const legacy = "abababab-abab-4bab-8bab-abababababab";
await db.query(
  `insert into auth.users(id,email,raw_user_meta_data) values($1,'legacy@example.invalid','{"full_name":"Cuenta anterior","phone":"5512345678","role":"admin","is_verified":true}')`,
  [legacy],
);
await db.query("delete from public.pari_profiles where id=$1", [legacy]);
const repaired = (
  await as(legacy, "select public.pari_ensure_my_profile() as profile")
).rows[0].profile;
assert.equal(repaired.id, legacy);
assert.equal(repaired.full_name, "Cuenta anterior");
assert.equal(repaired.role, "client");
assert.equal(repaired.is_verified, false);
assert.equal(
  (await as(legacy, "select public.pari_ensure_my_profile() as profile"))
    .rows[0].profile.id,
  legacy,
);
assert.equal(
  (
    await as(
      legacy,
      "select count(*)::integer as n from public.pari_profiles where id=$1",
      [legacy],
    )
  ).rows[0].n,
  1,
);
await denied(null, "select public.pari_ensure_my_profile()");
const adminRecovered = (
  await as(admin, "select public.pari_ensure_my_profile() as profile")
).rows[0].profile;
assert.equal(adminRecovered.role, "admin");
const organizerRecovered = (
  await as(organizer, "select public.pari_ensure_my_profile() as profile")
).rows[0].profile;
assert.equal(organizerRecovered.role, "business");
assert.equal(organizerRecovered.is_verified, true);
console.log(
  "PASS: missing-profile recovery, idempotency, own-account-only access and preservation of trusted roles",
);
console.log(
  "PASS: migration, public catalog, ownership, role protection, verification, payment validation, stock, idempotency, order privacy, check-in and duplicate-entry rejection",
);
await db.close();
