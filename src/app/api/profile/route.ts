import { NextResponse } from "next/server";

import { getCurrentProfile, getCurrentUser, syncProfileFromUser } from "@/lib/profile";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = (await getCurrentProfile()) ?? (await syncProfileFromUser());

  return NextResponse.json({ profile });
}
