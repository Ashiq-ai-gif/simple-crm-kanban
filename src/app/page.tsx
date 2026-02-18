"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { LEAD_STATUSES, Lead, LeadStatus } from "@/lib/types";

type DbPayload = {
  leads: Lead[];
  deletedLeads: Lead[];
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  status: "New" as LeadStatus,
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [csvInput, setCsvInput] = useState("");

  async function loadLeads() {
    const response = await fetch("/api/leads");
    const payload = (await response.json()) as DbPayload;
    setLeads(payload.leads);
  }

  useEffect(() => {
    async function init() {
      try {
        await loadLeads();
      } catch {
        setMessage("Failed to load CRM data.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const grouped = useMemo(() => {
    return LEAD_STATUSES.reduce(
      (acc, status) => {
        acc[status] = leads.filter((lead) => lead.status === status);
        return acc;
      },
      {} as Record<LeadStatus, Lead[]>,
    );
  }, [leads]);

  async function onCreateLead(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      setMessage("Create failed. Name and email are required.");
      return;
    }
    setLoading(true);
    setForm(emptyForm);
    await loadLeads();
    setLoading(false);
    setMessage("Lead created.");
  }

  async function onChangeStatus(id: string, status: LeadStatus) {
    setLoading(true);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadLeads();
    setLoading(false);
  }

  async function onDeleteLead(id: string) {
    setLoading(true);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    await loadLeads();
    setLoading(false);
    setMessage("Lead deleted and deletion log synced.");
  }

  async function onExportCsv() {
    window.open("/api/export?format=csv", "_blank");
  }

  async function onSyncGoogleSheets() {
    const response = await fetch("/api/export?toGoogleSheet=1");
    const payload = await response.json();
    if (payload.ok) {
      setMessage("CRM data synced to Google Sheet.");
      return;
    }
    setMessage(
      payload.reason ??
        "Google Sheets credentials are missing. Configure env vars first.",
    );
  }

  async function onImportCsv() {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "csv", content: csvInput }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Import failed.");
      return;
    }
    setLoading(true);
    setCsvInput("");
    await loadLeads();
    setLoading(false);
    setMessage(`Imported ${payload.upserted} records.`);
  }

  async function onImportFromSheet() {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "googleSheet" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Google Sheet import failed.");
      return;
    }
    setLoading(true);
    await loadLeads();
    setLoading(false);
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

  return (
    <main className="app-shell">
      <section className="top">
        <h1>Simple CRM</h1>
        <p>Desktop: Kanban board. Mobile: list view. Backend includes import/export APIs.</p>
      </section>

      <section className="controls">
        <button onClick={onExportCsv}>Export CSV</button>
        <button onClick={onSyncGoogleSheets}>Export to Google Sheet</button>
        <button onClick={onImportFromSheet}>Import from Google Sheet</button>
      </section>

      <section className="panel form-panel">
        <h2>Add Lead</h2>
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
          <button type="submit">Create Lead</button>
        </form>
      </section>

      <section className="panel import-panel">
        <h2>Import CSV</h2>
        <input type="file" accept=".csv" onChange={onCsvFileChange} />
        <textarea
          value={csvInput}
          onChange={(event) => setCsvInput(event.target.value)}
          placeholder="Paste CSV here. Required columns: name,email. Optional: phone,company,status,notes"
        />
        <button onClick={onImportCsv}>Import CSV</button>
      </section>

      {message && <p className="message">{message}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="kanban desktop-only">
            {LEAD_STATUSES.map((status) => (
              <article key={status} className="column">
                <h3>
                  {status} <span>{grouped[status].length}</span>
                </h3>
                <div className="cards">
                  {grouped[status].map((lead) => (
                    <div key={lead.id} className="card">
                      <h4>{lead.name}</h4>
                      <p>{lead.company || "No company"}</p>
                      <p>{lead.email}</p>
                      <p>{lead.phone}</p>
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
                      <button onClick={() => onDeleteLead(lead.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="mobile-list mobile-only">
            {leads.map((lead) => (
              <article key={lead.id} className="list-item">
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
                <button onClick={() => onDeleteLead(lead.id)}>Delete</button>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
