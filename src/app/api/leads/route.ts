import { NextResponse } from "next/server";
import { createLead, readDB } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/types";

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

  const status = LEAD_STATUSES.includes(body.status) ? body.status : "New";
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
