// Existing Supabase accounts may predate the Pari profile trigger.
// A missing row is normal; recover only the signed-in user's own profile.
export async function loadOwnProfile(db, userId) {
  const { data: existing, error } = await db
    .from("pari_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  const { data, error: recoveryError } = await db.rpc("pari_ensure_my_profile");
  if (recoveryError) throw recoveryError;
  if (!data || data.id !== userId)
    throw new Error("No se pudo preparar tu perfil.");
  return data;
}
