import assert from "node:assert/strict";
import { utcFromLocal, localInZone } from "../apps/shared/time.mjs";
assert.equal(
  utcFromLocal("2026-12-01T20:00", "America/Mexico_City"),
  "2026-12-02T02:00:00.000Z",
);
assert.equal(
  utcFromLocal("2026-12-01T20:00", "America/Tijuana"),
  "2026-12-02T04:00:00.000Z",
);
assert.equal(
  localInZone("2026-12-02T02:00:00Z", "America/Cancun"),
  "2026-12-01T21:00",
);
assert.throws(() => utcFromLocal("2027-03-14T02:30", "America/New_York"));
console.log(
  "PASS: city time zones, local-date conversion and nonexistent DST time rejection",
);
