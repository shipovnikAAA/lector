import { NextResponse } from "next/server";

import { listAiChats } from "@/lib/ai";
import { getCurrentUser } from "@/lib/profile";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chats = await listAiChats();
    return NextResponse.json({ chats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI service is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
