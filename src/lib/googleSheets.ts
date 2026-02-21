import { google } from "googleapis";
import { CrmDB, DeletedLead, Lead, DEFAULT_STAGES } from "@/lib/types";

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

function getSheetsClient(config: SheetConfig, readonly = false) {
  const auth = new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: readonly
      ? ["https://www.googleapis.com/auth/spreadsheets.readonly"]
      : ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function normalizeLeadRow(row: string[]): Lead {
  const now = new Date().toISOString();
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    email: row[2] ?? "",
    phone: row[3] ?? "",
    company: row[4] ?? "",
    status: (row[5] as Lead["status"]) ?? "New",
    notes: row[6] ?? "",
    createdAt: row[7] ?? now,
    updatedAt: row[8] ?? now,
  };
}

function normalizeDeletedRow(row: string[]): DeletedLead {
  const now = new Date().toISOString();
  const lead = normalizeLeadRow(row);
  return {
    ...lead,
    deletedAt: row[9] ?? now,
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

export async function readGoogleSheetsDB(): Promise<CrmDB | null> {
  const config = getConfig();
  if (!config) {
    return null;
  }

  const sheets = getSheetsClient(config, true);
  const [leadsResponse, deletedResponse] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: `${config.leadsTab}!A2:I`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: `${config.deletedTab}!A2:J`,
    }),
  ]);

  const leads = (leadsResponse.data.values ?? [])
    .map((row) => normalizeLeadRow(row))
    .filter((lead) => Boolean(lead.email));
  const deletedLeads = (deletedResponse.data.values ?? [])
    .map((row) => normalizeDeletedRow(row))
    .filter((lead) => Boolean(lead.email));

  return { leads, deletedLeads, stages: DEFAULT_STAGES };
}

export async function syncToGoogleSheets(leads: Lead[], deletedLeads: DeletedLead[]) {
  const config = getConfig();
  if (!config) {
    return { ok: false, reason: "Google Sheets credentials are not configured." };
  }

  const sheets = getSheetsClient(config);

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

  const sheets = getSheetsClient(config, true);
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
