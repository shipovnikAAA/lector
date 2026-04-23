import { NextResponse } from "next/server";

import { askAi } from "@/lib/ai";
import { getCurrentUser } from "@/lib/profile";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    chatId?: string | null;
    question?: string;
  };

  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const result = await askAi(question, body.chatId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI service is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
