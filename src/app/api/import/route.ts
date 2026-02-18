import { NextResponse } from "next/server";
import { importLeads, readDB } from "@/lib/db";
import { importFromGoogleSheets, syncToGoogleSheets } from "@/lib/googleSheets";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return {
      name: cells[headers.indexOf("name")] ?? "",
      email: cells[headers.indexOf("email")] ?? "",
      phone: cells[headers.indexOf("phone")] ?? "",
      company: cells[headers.indexOf("company")] ?? "",
      status: cells[headers.indexOf("status")] ?? "New",
      notes: cells[headers.indexOf("notes")] ?? "",
    };
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  let records: Array<Record<string, string>> = [];

  if (body.mode === "csv") {
    records = parseCsv(String(body.content ?? ""));
  } else if (body.mode === "json") {
    records = Array.isArray(body.records) ? body.records : [];
  } else if (body.mode === "googleSheet") {
    const rows = await importFromGoogleSheets();
    if (!rows) {
      return NextResponse.json(
        { error: "Google Sheets credentials are not configured." },
        { status: 400 },
      );
    }
    records = rows;
  } else {
    return NextResponse.json({ error: "Invalid import mode" }, { status: 400 });
  }

  const upserted = await importLeads(records);
  try {
    const db = await readDB();
    await syncToGoogleSheets(db.leads, db.deletedLeads);
  } catch (error) {
    console.error("Google Sheets sync failed:", error);
  }

  return NextResponse.json({ ok: true, upserted });
}
