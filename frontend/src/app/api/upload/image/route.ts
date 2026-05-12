import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/profile";
import { ensureAiToken } from "@/lib/ai";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await ensureAiToken();
    
    // We expect a multipart/form-data request
    const formData = await request.formData();
    
    const lectorAiUrl = (process.env.LECTOR_AI_URL || "http://127.0.0.1:6969").trim();
    
    // Forward the request to the Rust backend
    const response = await fetch(`${lectorAiUrl}/upload/image`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
