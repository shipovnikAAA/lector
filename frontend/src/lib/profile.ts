import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function syncProfileFromUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  const persistedFullName = existingProfile?.full_name?.trim() || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: persistedFullName ?? fullName,
        avatar_url: avatarUrl,
        provider: "google",
        last_sign_in_at: new Date().toISOString()
      },
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
