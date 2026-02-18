import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { isGoogleSheetsConfigured, syncToGoogleSheets } from "@/lib/googleSheets";

function csvEscape(value: string) {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function toCSV(rows: string[][]) {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const toGoogleSheet = url.searchParams.get("toGoogleSheet") === "1";

  const db = await readDB();
  if (toGoogleSheet) {
    const result = await syncToGoogleSheets(db.leads, db.deletedLeads);
    return NextResponse.json({
      ...result,
      configured: isGoogleSheetsConfigured(),
    });
  }

  if (format === "csv") {
    const rows = [
      [
        "id",
        "name",
        "email",
        "phone",
        "company",
        "status",
        "notes",
        "createdAt",
        "updatedAt",
      ],
      ...db.leads.map((lead) => [
        lead.id,
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.status,
        lead.notes,
        lead.createdAt,
        lead.updatedAt,
      ]),
    ];
    return new NextResponse(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=crm-leads.csv",
      },
    });
  }

  return NextResponse.json(db);
}
