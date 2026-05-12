"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

function getMissingEnvMessage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return "Не заданы NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Для Docker передайте их при сборке (см. docker-compose.local.yml → build.args) или используйте npm run dev с frontend/.env.local.";
  }
  return null;
}

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);

    const missing = getMissingEnvMessage();
    if (missing) {
      setError(missing);
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`
        }
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      setError("Не удалось получить ссылку на вход. Проверьте провайдер Google в Supabase.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "stretch" }}>
      <button
        className="primary-button"
        disabled={busy}
        onClick={() => void handleSignIn()}
        type="button"
      >
        {busy ? "Переход к Google…" : "Войти через Google"}
      </button>
      {error ? (
        <p className="alert-box" style={{ margin: 0, fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
