import { NextResponse } from "next/server";
import { listFormulas, addFormula } from "@/lib/ai";
import { getCurrentUser } from "@/lib/profile";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get("grade");
  const gradeNum = grade ? parseInt(grade) : undefined;

  try {
    const formulas = await listFormulas(gradeNum);
    return NextResponse.json(formulas);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch formulas";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await addFormula(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add formula";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
