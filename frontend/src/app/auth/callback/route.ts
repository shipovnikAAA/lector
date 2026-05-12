import { NextRequest, NextResponse } from "next/server";

import { syncProfileFromUser } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  
  // Используем NEXT_PUBLIC_APP_URL для редиректов, чтобы избежать проблем с 0.0.0.0 в Docker
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", baseUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=google_auth_failed", baseUrl));
  }

  await syncProfileFromUser();

  return NextResponse.redirect(new URL(next, baseUrl));
}
