import assert from "node:assert/strict";
import { loadOwnProfile } from "../apps/shared/profile.mjs";
function fake({
  existing = null,
  readError = null,
  recovered = { id: "own", role: "client" },
  rpcError = null,
} = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      return {
        select() {
          return {
            eq(column, id) {
              calls.push(["eq", column, id]);
              return {
                maybeSingle: async () => ({ data: existing, error: readError }),
              };
            },
          };
        },
      };
    },
    rpc: async (name) => {
      calls.push(["rpc", name]);
      return { data: recovered, error: rpcError };
    },
  };
}
let db = fake({ existing: { id: "own", role: "admin" } });
assert.equal((await loadOwnProfile(db, "own")).role, "admin");
assert.equal(
  db.calls.some((c) => c[0] === "rpc"),
  false,
);
db = fake();
assert.equal((await loadOwnProfile(db, "own")).id, "own");
assert.deepEqual(db.calls.at(-1), ["rpc", "pari_ensure_my_profile"]);
db = fake({ readError: new Error("database unavailable") });
await assert.rejects(() => loadOwnProfile(db, "own"), /database unavailable/);
assert.equal(
  db.calls.some((c) => c[0] === "rpc"),
  false,
);
await assert.rejects(
  () => loadOwnProfile(fake({ recovered: { id: "someone-else" } }), "own"),
  /perfil/,
);
await assert.rejects(
  () =>
    loadOwnProfile(
      fake({ rpcError: new Error("recovery unavailable") }),
      "own",
    ),
  /recovery unavailable/,
);
console.log(
  "PASS: profile reads tolerate missing rows and recover only the current account",
);
