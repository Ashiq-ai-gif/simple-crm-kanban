import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { DEFAULT_STAGES } from "@/lib/types";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ stages: db.stages ?? DEFAULT_STAGES });
}

export async function POST(request: Request) {
  const body = await request.json();
  const stages = Array.isArray(body.stages)
    ? body.stages.map((stage: unknown) => String(stage).trim()).filter(Boolean)
    : [];

  if (stages.length === 0) {
    return NextResponse.json({ error: "stages required" }, { status: 400 });
  }

  const db = await readDB();
  db.stages = stages;

  const valid = new Set(stages);
  for (const lead of db.leads) {
    if (!valid.has(lead.status)) {
      lead.status = stages[0];
    }
  }

  await writeDB(db);
  return NextResponse.json({ ok: true, stages: db.stages });
}
