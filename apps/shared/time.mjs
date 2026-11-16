export const zones = [
  "America/Mexico_City",
  "America/Cancun",
  "America/Tijuana",
  "America/Hermosillo",
  "America/Mazatlan",
  "America/Chihuahua",
  "America/Monterrey",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];
export function dateInZone(iso, zone = "America/Mexico_City") {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zone,
  });
}
export function localInZone(iso, zone = "America/Mexico_City") {
  if (!iso) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function utcFromLocal(local, zone) {
  const target = Date.parse(local + "Z");
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const rendered = Date.parse(
      localInZone(new Date(guess).toISOString(), zone) + "Z",
    );
    const delta = target - rendered;
    if (!delta) break;
    guess += delta;
  }
  const result = new Date(guess).toISOString();
  if (localInZone(result, zone) !== local)
    throw Error(
      "Esa hora no existe por el cambio de horario. Elige otra hora.",
    );
  return result;
}
