"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
      }
    });
  };

  return (
    <button className="primary-button" onClick={handleSignIn} type="button">
      Войти через Google
    </button>
  );
}
