import { NextResponse } from "next/server";
import { createLead, readDB } from "@/lib/db";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const db = await readDB();
  const status = db.stages.includes(body.status) ? body.status : db.stages[0];
  const lead = await createLead({
    name: String(body.name),
    email: String(body.email),
    phone: String(body.phone ?? ""),
    company: String(body.company ?? ""),
    notes: String(body.notes ?? ""),
    status,
  });

  return NextResponse.json(lead, { status: 201 });
}
