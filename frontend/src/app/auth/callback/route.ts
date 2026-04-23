import { NextRequest, NextResponse } from "next/server";

import { syncProfileFromUser } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=google_auth_failed", request.url));
  }

  await syncProfileFromUser();

  return NextResponse.redirect(new URL(next, request.url));
}
