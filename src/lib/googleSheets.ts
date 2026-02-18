import { google } from "googleapis";
import { DeletedLead, Lead } from "@/lib/types";

type SheetConfig = {
  email: string;
  privateKey: string;
  sheetId: string;
  leadsTab: string;
  deletedTab: string;
};

function getConfig(): SheetConfig | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !privateKey || !sheetId) {
    return null;
  }

  return {
    email,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    sheetId,
    leadsTab: process.env.GOOGLE_SHEET_LEADS_TAB ?? "Leads",
    deletedTab: process.env.GOOGLE_SHEET_DELETED_TAB ?? "Deleted",
  };
}

function toLeadRows(leads: Lead[]) {
  return [
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
    ...leads.map((lead) => [
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
}

function toDeletedRows(deletedLeads: DeletedLead[]) {
  return [
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
      "deletedAt",
    ],
    ...deletedLeads.map((lead) => [
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.status,
      lead.notes,
      lead.createdAt,
      lead.updatedAt,
      lead.deletedAt,
    ]),
  ];
}

export function isGoogleSheetsConfigured() {
  return Boolean(getConfig());
}

export async function syncToGoogleSheets(leads: Lead[], deletedLeads: DeletedLead[]) {
  const config = getConfig();
  if (!config) {
    return { ok: false, reason: "Google Sheets credentials are not configured." };
  }

  const auth = new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `${config.leadsTab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: toLeadRows(leads) },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `${config.deletedTab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: toDeletedRows(deletedLeads) },
  });

  return { ok: true };
}

export async function importFromGoogleSheets() {
  const config = getConfig();
  if (!config) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${config.leadsTab}!A2:I`,
  });

  const rows = response.data.values ?? [];
  return rows.map((row) => ({
    id: row[0] ?? "",
    name: row[1] ?? "",
    email: row[2] ?? "",
    phone: row[3] ?? "",
    company: row[4] ?? "",
    status: row[5] ?? "New",
    notes: row[6] ?? "",
  }));
}
