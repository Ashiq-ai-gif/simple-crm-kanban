import { NextResponse } from "next/server";
import { deleteLead, readDB, updateLead } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/types";
import { syncToGoogleSheets } from "@/lib/googleSheets";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  if (body.status && !LEAD_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const updated = await updateLead(id, body);
  if (!updated) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  try {
    const db = await readDB();
    await syncToGoogleSheets(db.leads, db.deletedLeads);
  } catch (error) {
    console.error("Google Sheets sync failed:", error);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteLead(id);
  if (!deleted) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  try {
    const db = await readDB();
    await syncToGoogleSheets(db.leads, db.deletedLeads);
  } catch (error) {
    console.error("Google Sheets sync failed:", error);
  }

  return NextResponse.json({ ok: true, deleted });
}
