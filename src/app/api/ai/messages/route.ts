import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/profile";
import { listAiMessages } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = request.nextUrl.searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  try {
    const messages = await listAiMessages(chatId);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI service is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
