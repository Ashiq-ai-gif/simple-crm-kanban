"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { LEAD_STATUSES, Lead, LeadStatus } from "@/lib/types";

type DbPayload = {
  leads: Lead[];
  deletedLeads: Lead[];
};

type MobileStage = "All" | LeadStatus;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  status: "New" as LeadStatus,
};

const ADMIN_PASSWORD = "Admin@6282";
const AUTH_KEY = "bch-crm-auth";
const CACHE_KEY = "bch-crm-leads-cache";
const CACHE_TTL_MS = 60_000;

function readCache() {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { at: number; leads: Lead[] };
    if (Date.now() - parsed.at > CACHE_TTL_MS) {
      return null;
    }
    return parsed.leads;
  } catch {
    return null;
  }
}

function writeCache(leads: Lead[]) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), leads }));
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [csvInput, setCsvInput] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [mobileStage, setMobileStage] = useState<MobileStage>("All");
  const [mobileAnimKey, setMobileAnimKey] = useState(0);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");

  async function loadLeads(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      setLoading(true);
    }
    const response = await fetch("/api/leads", { cache: "no-store" });
    const payload = (await response.json()) as DbPayload;
    setLeads(payload.leads);
    writeCache(payload.leads);
    setLoading(false);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const token = sessionStorage.getItem(AUTH_KEY);
      if (token === "ok") {
        setIsAuthed(true);
      }
      setAuthChecked(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }

    async function init() {
      const cached = readCache();
      if (cached && cached.length > 0) {
        setLeads(cached);
        setLoading(false);
        loadLeads({ quiet: true }).catch(() => {
          setMessage("Using cached data. Refresh failed.");
        });
        return;
      }

      try {
        await loadLeads();
      } catch {
        setMessage("Failed to load CRM data.");
        setLoading(false);
      }
    }

    void init();
  }, [isAuthed]);

  const grouped = useMemo(() => {
    return LEAD_STATUSES.reduce(
      (acc, status) => {
        acc[status] = leads.filter((lead) => lead.status === status);
        return acc;
      },
      {} as Record<LeadStatus, Lead[]>,
    );
  }, [leads]);

  const mobileLeads = useMemo(() => {
    if (mobileStage === "All") {
      return leads;
    }
    return leads.filter((lead) => lead.status === mobileStage);
  }, [leads, mobileStage]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      setMessage("Invalid password");
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "ok");
    setIsAuthed(true);
    setPassword("");
    setMessage("");
  }

  async function onCreateLead(event: FormEvent) {
    event.preventDefault();
    setActionBusy(true);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setActionBusy(false);
      setMessage("Create failed. Name and email are required.");
      return;
    }

    const created = (await response.json()) as Lead;
    const nextLeads = [created, ...leads];
    setLeads(nextLeads);
    writeCache(nextLeads);
    setForm(emptyForm);
    setShowLeadModal(false);
    setActionBusy(false);
    setMessage("Lead created.");
    loadLeads({ quiet: true }).catch(() => undefined);
  }

  async function onChangeStatus(id: string, status: LeadStatus) {
    const previous = leads;
    setUpdatingLeadId(id);
    const optimistic = leads.map((lead) =>
      lead.id === id ? { ...lead, status, updatedAt: new Date().toISOString() } : lead,
    );
    setLeads(optimistic);
    writeCache(optimistic);

    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setLeads(previous);
      writeCache(previous);
      setMessage("Stage update failed.");
    }

    setTimeout(() => setUpdatingLeadId(null), 260);
  }

  async function onDeleteLead(id: string) {
    const previous = leads;
    const optimistic = leads.filter((lead) => lead.id !== id);
    setLeads(optimistic);
    writeCache(optimistic);

    const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setLeads(previous);
      writeCache(previous);
      setMessage("Delete failed.");
      return;
    }

    setMessage("Lead deleted and synced.");
  }

  function onExportCsv() {
    window.open("/api/export?format=csv", "_blank");
  }

  async function onSyncGoogleSheets() {
    setActionBusy(true);
    const response = await fetch("/api/export?toGoogleSheet=1");
    const payload = await response.json();
    setActionBusy(false);
    if (payload.ok) {
      setMessage("CRM data synced to Google Sheet.");
      return;
    }
    setMessage(payload.reason ?? "Google Sheets is not configured.");
  }

  async function onImportCsv() {
    setActionBusy(true);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "csv", content: csvInput }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setActionBusy(false);
      setMessage(payload.error ?? "Import failed.");
      return;
    }

    await loadLeads({ quiet: true });
    setCsvInput("");
    setShowCsvModal(false);
    setActionBusy(false);
    setMessage(`Imported ${payload.upserted} records.`);
  }

  async function onImportFromSheet() {
    setActionBusy(true);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "googleSheet" }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setActionBusy(false);
      setMessage(payload.error ?? "Google Sheet import failed.");
      return;
    }

    await loadLeads({ quiet: true });
    setActionBusy(false);
    setMessage(`Imported ${payload.upserted} records from Google Sheet.`);
  }

  function onCsvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCsvInput(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  }

  function onMobileStageChange(value: MobileStage) {
    setMobileStage(value);
    setMobileAnimKey((prev) => prev + 1);
  }

  const totalLeads = leads.length;

  if (!authChecked) {
    return null;
  }

  if (!isAuthed) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>BCH CRM</h1>
          <form onSubmit={onLogin} className="login-form">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button className="primary-btn" type="submit">
              Login
            </button>
          </form>
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="top-bar">
        <h1>BCH CRM</h1>
        <div className="count-chip">{totalLeads} Leads</div>
      </section>

      <section className="controls">
        <button className="primary-btn" onClick={() => setShowLeadModal(true)}>
          + New Lead
        </button>
        <button className="primary-btn" onClick={() => setShowCsvModal(true)}>
          + Import CSV
        </button>
        <button className="secondary-btn" onClick={onExportCsv}>
          Export CSV
        </button>
        <button className="secondary-btn" onClick={onImportFromSheet}>
          Import from Sheet
        </button>
        <button className="secondary-btn" onClick={onSyncGoogleSheets}>
          Sync to Sheet
        </button>
      </section>

      {message && <p className="message">{message}</p>}
      {loading && <p className="loading-text">Loading leads...</p>}

      <section className="kanban desktop-only">
        {LEAD_STATUSES.map((status) => (
          <article key={status} className="column">
            <h3>
              <span>{status}</span>
              <span>{grouped[status].length}</span>
            </h3>
            <div className="cards">
              {grouped[status].map((lead) => (
                <div
                  key={lead.id}
                  className={`card card-animate ${updatingLeadId === lead.id ? "card-updating" : ""}`}
                >
                  <div className="card-head">
                    <h4>{lead.name}</h4>
                    <button className="danger-btn" onClick={() => onDeleteLead(lead.id)}>
                      Delete
                    </button>
                  </div>
                  <p>{lead.company || "No company"}</p>
                  <p>{lead.email}</p>
                  {lead.phone && <p>{lead.phone}</p>}
                  <select
                    value={lead.status}
                    onChange={(event) =>
                      onChangeStatus(lead.id, event.target.value as LeadStatus)
                    }
                  >
                    {LEAD_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mobile-only mobile-list-wrap">
        <div className="mobile-filter-bar">
          <label htmlFor="stage-filter">Stage</label>
          <select
            id="stage-filter"
            value={mobileStage}
            onChange={(event) => onMobileStageChange(event.target.value as MobileStage)}
          >
            <option value="All">All</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <section key={mobileAnimKey} className="mobile-list mobile-animate">
          {mobileLeads.length === 0 && <p className="empty-state">No leads in this stage.</p>}
          {mobileLeads.map((lead) => (
            <article
              key={lead.id}
              className={`list-item ${updatingLeadId === lead.id ? "card-updating" : ""}`}
            >
              <div>
                <h4>{lead.name}</h4>
                <p>{lead.company || "No company"}</p>
                <small>{lead.email}</small>
              </div>
              <select
                value={lead.status}
                onChange={(event) =>
                  onChangeStatus(lead.id, event.target.value as LeadStatus)
                }
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="danger-btn" onClick={() => onDeleteLead(lead.id)}>
                Delete
              </button>
            </article>
          ))}
        </section>
      </section>

      {showLeadModal && (
        <div className="modal-backdrop" onClick={() => setShowLeadModal(false)}>
          <div className="modal modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>New Lead</h2>
              <button className="text-btn" onClick={() => setShowLeadModal(false)}>
                Close
              </button>
            </div>
            <form onSubmit={onCreateLead} className="lead-form">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
              <input
                placeholder="Email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
              <input
                placeholder="Company"
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as LeadStatus })
                }
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
              <button className="primary-btn" type="submit" disabled={actionBusy}>
                Save Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="modal-backdrop" onClick={() => setShowCsvModal(false)}>
          <div className="modal modal-animate" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Import CSV</h2>
              <button className="text-btn" onClick={() => setShowCsvModal(false)}>
                Close
              </button>
            </div>
            <div className="csv-modal-body">
              <input type="file" accept=".csv" onChange={onCsvFileChange} />
              <textarea
                value={csvInput}
                onChange={(event) => setCsvInput(event.target.value)}
                placeholder="Required columns: name,email. Optional: phone,company,status,notes"
              />
              <button className="primary-btn" onClick={onImportCsv} disabled={actionBusy}>
                Import CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
