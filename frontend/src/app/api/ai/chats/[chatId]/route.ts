import { NextRequest, NextResponse } from "next/server";

import { deleteAiChat } from "@/lib/ai";
import { getCurrentUser } from "@/lib/profile";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ chatId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await context.params;

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  try {
    const result = await deleteAiChat(chatId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI service is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

