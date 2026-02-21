import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CrmDB, DeletedLead, Lead, LeadStatus, DEFAULT_STAGES } from "@/lib/types";
import {
  isGoogleSheetsConfigured,
  readGoogleSheetsDB,
  syncToGoogleSheets,
} from "@/lib/googleSheets";

const initialLeads: Lead[] = [
  {
    id: randomUUID(),
    name: "Alicia Khan",
    email: "alicia@example.com",
    phone: "+1 202-555-0145",
    company: "Northgate Academy",
    status: "New",
    notes: "Needs a callback this week.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    name: "Rohit Das",
    email: "rohit@example.com",
    phone: "+1 202-555-0176",
    company: "BluePeak Institute",
    status: "Proposal",
    notes: "Waiting for budget approval.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultDB: CrmDB = {
  leads: initialLeads,
  deletedLeads: [],
  stages: DEFAULT_STAGES,
};

function getDbPath() {
  if (process.env.NODE_ENV === "production") {
    return path.join("/tmp", "simple-crm-db.json");
  }
  return path.join(process.cwd(), "data", "simple-crm-db.json");
}

async function ensureDB() {
  const dbPath = getDbPath();
  await mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(defaultDB, null, 2), "utf8");
  }
  return dbPath;
}

export async function readDB(): Promise<CrmDB> {
  if (isGoogleSheetsConfigured()) {
    const db = await readGoogleSheetsDB();
    if (db) {
      return db;
    }
  }
  const dbPath = await ensureDB();
  const content = await readFile(dbPath, "utf8");
  const parsed = JSON.parse(content) as CrmDB;
  if (!parsed.stages || parsed.stages.length === 0) {
    parsed.stages = DEFAULT_STAGES;
    await writeDB(parsed);
  }
  return parsed;
}

export async function writeDB(db: CrmDB) {
  if (isGoogleSheetsConfigured()) {
    await syncToGoogleSheets(db.leads, db.deletedLeads);
    return;
  }
  const dbPath = await ensureDB();
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export async function createLead(
  input: Omit<Lead, "id" | "createdAt" | "updatedAt">,
) {
  const db = await readDB();
  const now = new Date().toISOString();
  const safeStatus = db.stages.includes(input.status) ? input.status : db.stages[0];
  const lead: Lead = {
    ...input,
    status: safeStatus,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  db.leads.unshift(lead);
  await writeDB(db);
  return lead;
}

export async function updateLead(id: string, data: Partial<Lead>) {
  const db = await readDB();
  const lead = db.leads.find((item) => item.id === id);
  if (!lead) {
    return null;
  }

  const allowed: (keyof Lead)[] = [
    "name",
    "email",
    "phone",
    "company",
    "notes",
    "status",
  ];
  for (const key of allowed) {
    if (typeof data[key] !== "undefined") {
      (lead[key] as string | LeadStatus) = data[key] as string | LeadStatus;
    }
  }
  lead.updatedAt = new Date().toISOString();
  await writeDB(db);
  return lead;
}

export async function deleteLead(id: string) {
  const db = await readDB();
  const index = db.leads.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  const [removed] = db.leads.splice(index, 1);
  const deletedLead: DeletedLead = {
    ...removed,
    deletedAt: new Date().toISOString(),
  };
  db.deletedLeads.unshift(deletedLead);
  await writeDB(db);
  return deletedLead;
}

export async function importLeads(records: Array<Partial<Lead>>) {
  const db = await readDB();
  const now = new Date().toISOString();
  const acceptedStatuses = new Set<LeadStatus>(db.stages);

  let upserted = 0;
  for (const record of records) {
    if (!record.name || !record.email) {
      continue;
    }
    const status = acceptedStatuses.has(record.status as LeadStatus)
      ? (record.status as LeadStatus)
      : db.stages[0];
    const existing = db.leads.find((item) => item.email === record.email);
    if (existing) {
      existing.name = record.name;
      existing.phone = record.phone ?? existing.phone;
      existing.company = record.company ?? existing.company;
      existing.notes = record.notes ?? existing.notes;
      existing.status = status;
      existing.updatedAt = now;
    } else {
      db.leads.unshift({
        id: randomUUID(),
        name: record.name,
        email: record.email,
        phone: record.phone ?? "",
        company: record.company ?? "",
        notes: record.notes ?? "",
        status,
        createdAt: now,
        updatedAt: now,
      });
    }
    upserted += 1;
  }

  await writeDB(db);
  return upserted;
}
