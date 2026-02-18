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

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [csvInput, setCsvInput] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [mobileStage, setMobileStage] = useState<MobileStage>("All");

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

  const mobileLeads = useMemo(() => {
    if (mobileStage === "All") {
      return leads;
    }
    return leads.filter((lead) => lead.status === mobileStage);
  }, [leads, mobileStage]);

  async function onCreateLead(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      setLoading(false);
      setMessage("Create failed. Name and email are required.");
      return;
    }
    setForm(emptyForm);
    await loadLeads();
    setLoading(false);
    setShowLeadModal(false);
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
    setMessage("Lead deleted and synced.");
  }

  function onExportCsv() {
    window.open("/api/export?format=csv", "_blank");
  }

  async function onSyncGoogleSheets() {
    const response = await fetch("/api/export?toGoogleSheet=1");
    const payload = await response.json();
    if (payload.ok) {
      setMessage("CRM data synced to Google Sheet.");
      return;
    }
    setMessage(payload.reason ?? "Google Sheets is not configured.");
  }

  async function onImportCsv() {
    setLoading(true);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "csv", content: csvInput }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoading(false);
      setMessage(payload.error ?? "Import failed.");
      return;
    }
    setCsvInput("");
    await loadLeads();
    setLoading(false);
    setShowCsvModal(false);
    setMessage(`Imported ${payload.upserted} records.`);
  }

  async function onImportFromSheet() {
    setLoading(true);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "googleSheet" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoading(false);
      setMessage(payload.error ?? "Google Sheet import failed.");
      return;
    }
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

  const totalLeads = leads.length;

  return (
    <main className="app-shell">
      <section className="top-bar">
        <div>
          <h1>Simple CRM</h1>
          <p>Kanban on desktop, stage-filtered list on mobile.</p>
        </div>
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

      {loading ? (
        <p className="loading-text">Loading leads...</p>
      ) : (
        <>
          <section className="kanban desktop-only">
            {LEAD_STATUSES.map((status) => (
              <article key={status} className="column">
                <h3>
                  <span>{status}</span>
                  <span>{grouped[status].length}</span>
                </h3>
                <div className="cards">
                  {grouped[status].map((lead) => (
                    <div key={lead.id} className="card">
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
                onChange={(event) => setMobileStage(event.target.value as MobileStage)}
              >
                <option value="All">All</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <section className="mobile-list">
              {mobileLeads.length === 0 && (
                <p className="empty-state">No leads in this stage.</p>
              )}
              {mobileLeads.map((lead) => (
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
                  <button className="danger-btn" onClick={() => onDeleteLead(lead.id)}>
                    Delete
                  </button>
                </article>
              ))}
            </section>
          </section>
        </>
      )}

      {showLeadModal && (
        <div className="modal-backdrop" onClick={() => setShowLeadModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
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
              <button className="primary-btn" type="submit">
                Save Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="modal-backdrop" onClick={() => setShowCsvModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
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
              <button className="primary-btn" onClick={onImportCsv}>
                Import CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
