import { NextResponse } from "next/server";
import { deleteFormula } from "@/lib/ai";
import { getCurrentUser } from "@/lib/profile";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteFormula(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete formula";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
