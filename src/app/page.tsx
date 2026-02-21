"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lead } from "@/lib/types";

type SoftwareType =
  | "Web Application"
  | "Mobile Application"
  | "SaaS Platform"
  | "E-commerce"
  | "CRM / ERP"
  | "Custom";

type ProposalInput = {
  clientName: string;
  businessName: string;
  quickPrompt: string;
  businessOverview: string;
  businessActivities: string;
  softwareType: SoftwareType;
  serviceTypes: string[];
  paymentTerms: string;
  targetUsers: string;
  keyFeatures: string;
  projectFlow: string;
  integrations: string;
  timelineWeeks: number;
  budget: number;
};

type CostItem = {
  item: string;
  percent: number;
};

type AiProposal = {
  summary: string;
  businessActivities: string[];
  keyFeatures: string[];
  projectFlow: string[];
  integrations: string[];
  assumptions: string[];
  risks: string[];
  suggestedStack: { layer: string; technology: string }[];
};

type GenerateResponse = {
  ok: boolean;
  proposalId?: number | null;
  ai?: AiProposal;
  extracted?: Partial<ProposalInput> & {
    businessActivities?: string[];
    keyFeatures?: string[];
    projectFlow?: string[];
    integrations?: string[];
    serviceTypes?: string[];
  };
  error?: string;
};

type CrmPayload = {
  leads: Lead[];
  deletedLeads: Lead[];
  stages: string[];
};

const COMPANY_NAME = "Yadhurtech";
const COMPANY_TAGLINE = "Empowering business with smart digital and solutions.";
const COMPANY_ADDRESS = "7-8/2 vgp lane, Dharmaraja koil street, Saidapet, Chennai-600015.";
const COMPANY_PHONE = "9176002530";
const COMPANY_EMAIL = "info@yadhurtech.com";
const COMPANY_WEBSITE = "yadhurtech.com";
const BANK_NAME = "CITY UNION BANK, Saidapet";
const BANK_ACCOUNT_NAME = "S. Kishor";
const BANK_ACCOUNT_NUMBER = "500101013782072";
const BANK_IFSC = "CIUB0000516";
const QUOTE_VALIDITY_DAYS = 15;

const EDGE_FUNCTION_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL ??
  "https://qiqhbpffssgwtzhjsfdh.functions.supabase.co/generate-proposal";

const softwareTypeOptions: SoftwareType[] = [
  "Web Application",
  "Mobile Application",
  "SaaS Platform",
  "E-commerce",
  "CRM / ERP",
  "Custom",
];

const serviceTypeOptions = [
  "Android App",
  "iOS App",
  "PWA",
  "Website",
  "Web Application",
  "Backend/API",
  "Admin Panel",
  "Desktop App",
  "Automation/Workflow",
  "Other",
];

const pricingSplit: CostItem[] = [
  { item: "App / Website", percent: 60 },
  { item: "Admin Portal", percent: 25 },
  { item: "UI/UX", percent: 15 },
];

const stackByType: Record<SoftwareType, { layer: string; technology: string }[]> = {
  "Web Application": [
    { layer: "Frontend", technology: "Next.js + TypeScript" },
    { layer: "Backend", technology: "Node.js + Express/NestJS" },
    { layer: "Database", technology: "PostgreSQL" },
    { layer: "Hosting", technology: "Vercel / AWS" },
    { layer: "Auth", technology: "JWT / OAuth" },
  ],
  "Mobile Application": [
    { layer: "Mobile", technology: "React Native / Flutter" },
    { layer: "Backend", technology: "Node.js / Django" },
    { layer: "Database", technology: "PostgreSQL / Firebase" },
    { layer: "Notifications", technology: "FCM / APNS" },
    { layer: "Hosting", technology: "AWS / GCP" },
  ],
  "SaaS Platform": [
    { layer: "Frontend", technology: "Next.js + TypeScript" },
    { layer: "Backend", technology: "Node.js / Go microservices" },
    { layer: "Database", technology: "PostgreSQL + Redis" },
    { layer: "Infra", technology: "Docker + Kubernetes" },
    { layer: "Analytics", technology: "Metabase / Mixpanel" },
  ],
  "E-commerce": [
    { layer: "Storefront", technology: "Next.js / Shopify Headless" },
    { layer: "Backend", technology: "Node.js Commerce APIs" },
    { layer: "Database", technology: "PostgreSQL" },
    { layer: "Payments", technology: "Stripe / Razorpay" },
    { layer: "Hosting", technology: "Vercel / AWS" },
  ],
  "CRM / ERP": [
    { layer: "Frontend", technology: "Next.js + TypeScript" },
    { layer: "Backend", technology: "Node.js / .NET Core" },
    { layer: "Database", technology: "PostgreSQL / MSSQL" },
    { layer: "Automation", technology: "Queue workers + cron jobs" },
    { layer: "Reporting", technology: "BI dashboards" },
  ],
  Custom: [
    { layer: "Frontend", technology: "Framework based on requirements" },
    { layer: "Backend", technology: "Service architecture by scope" },
    { layer: "Database", technology: "SQL/NoSQL as needed" },
    { layer: "Infra", technology: "Cloud deployment with CI/CD" },
    { layer: "Security", technology: "Role-based access + audit logs" },
  ],
};

const defaultInput: ProposalInput = {
  clientName: "",
  businessName: "",
  quickPrompt: "",
  businessOverview: "",
  businessActivities: "",
  softwareType: "Web Application",
  serviceTypes: [],
  paymentTerms: "40% advance, 40% mid-milestone, 20% on delivery",
  targetUsers: "",
  keyFeatures: "",
  projectFlow: "",
  integrations: "",
  timelineWeeks: 12,
  budget: 12000,
};

const emptyLeadForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  status: "New",
};

function toLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  const [input, setInput] = useState<ProposalInput>(defaultInput);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalId, setProposalId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [quoteIssuedAt, setQuoteIssuedAt] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<"quotation" | "crm">("quotation");

  const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
  const [crmStages, setCrmStages] = useState<string[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmMessage, setCrmMessage] = useState("");
  const [mobileStage, setMobileStage] = useState<string>("All");
  const [stageDraft, setStageDraft] = useState("");
  const [stageList, setStageList] = useState<string[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);
  const [crmSearch, setCrmSearch] = useState("");

  const localFeatureLines = useMemo(() => toLines(input.keyFeatures), [input.keyFeatures]);
  const localActivityLines = useMemo(() => toLines(input.businessActivities), [input.businessActivities]);
  const localFlowLines = useMemo(() => toLines(input.projectFlow), [input.projectFlow]);
  const localIntegrationLines = useMemo(() => toLines(input.integrations), [input.integrations]);

  const featureLines = aiProposal?.keyFeatures?.length ? aiProposal.keyFeatures : localFeatureLines;
  const activityLines = aiProposal?.businessActivities?.length
    ? aiProposal.businessActivities
    : localActivityLines;
  const flowLines = aiProposal?.projectFlow?.length ? aiProposal.projectFlow : localFlowLines;
  const integrationLines = aiProposal?.integrations?.length
    ? aiProposal.integrations
    : localIntegrationLines;
  const stackRows =
    aiProposal?.suggestedStack?.length && aiProposal.suggestedStack[0]?.layer
      ? aiProposal.suggestedStack
      : stackByType[input.softwareType];

  const costRows = useMemo(() => {
    return pricingSplit.map((entry) => ({
      ...entry,
      amount: Math.round((input.budget * entry.percent) / 100),
    }));
  }, [input.budget]);

  function toggleServiceType(value: string) {
    setInput((prev) => {
      const exists = prev.serviceTypes.includes(value);
      const next = exists
        ? prev.serviceTypes.filter((item) => item !== value)
        : [...prev.serviceTypes, value];
      return { ...prev, serviceTypes: next };
    });
  }

  function updateField<K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.quickPrompt.trim() && !input.businessOverview.trim()) {
      setStatusMessage("Please add a quick prompt or business overview.");
      return;
    }
    setIsGenerating(true);
    setStatusMessage("Generating AI proposal...");
    setAiProposal(null);
    setProposalId(null);
    setQuoteIssuedAt(new Date());

    try {
      const useFormData = attachments.length > 0;
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: useFormData ? undefined : { "Content-Type": "application/json" },
        body: useFormData ? buildFormData(input, attachments) : JSON.stringify(input),
      });

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || !payload.ok || !payload.ai) {
        throw new Error(payload.error ?? "AI generation failed");
      }

      setAiProposal(payload.ai);
      if (payload.extracted) {
        setInput((prev) => {
          const next = { ...prev };
          const extracted = payload.extracted ?? {};
          const applyIfEmpty = <K extends keyof ProposalInput>(key: K, value?: ProposalInput[K]) => {
            if (value === undefined || value === null) return;
            const current = prev[key];
            if (
              current === "" ||
              current === 0 ||
              (Array.isArray(current) && current.length === 0)
            ) {
              next[key] = value;
            }
          };
          applyIfEmpty("clientName", extracted.clientName);
          applyIfEmpty("businessName", extracted.businessName);
          applyIfEmpty("softwareType", extracted.softwareType);
          applyIfEmpty("serviceTypes", extracted.serviceTypes);
          applyIfEmpty("targetUsers", extracted.targetUsers);
          applyIfEmpty("businessOverview", extracted.businessOverview);
          applyIfEmpty(
            "businessActivities",
            extracted.businessActivities ? extracted.businessActivities.join("\n") : undefined,
          );
          applyIfEmpty(
            "keyFeatures",
            extracted.keyFeatures ? extracted.keyFeatures.join("\n") : undefined,
          );
          applyIfEmpty(
            "projectFlow",
            extracted.projectFlow ? extracted.projectFlow.join("\n") : undefined,
          );
          applyIfEmpty(
            "integrations",
            extracted.integrations ? extracted.integrations.join("\n") : undefined,
          );
          applyIfEmpty("paymentTerms", extracted.paymentTerms);
          applyIfEmpty("timelineWeeks", extracted.timelineWeeks as ProposalInput["timelineWeeks"]);
          applyIfEmpty("budget", extracted.budget as ProposalInput["budget"]);
          return next;
        });
      }
      setProposalId(payload.proposalId ?? null);
      setStatusMessage("Proposal generated and saved.");
      setIsGenerated(true);
    } catch (error) {
      setStatusMessage(
        `AI unavailable, showing form-based draft. ${
          error instanceof Error ? error.message : ""
        }`,
      );
      setIsGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function onPrintPdf() {
    const originalTitle = document.title;
    const safeClient = input.clientName.trim() || "Client";
    document.title = `${COMPANY_NAME}-Proposal-${safeClient}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 300);
  }

  const quoteValidUntil = useMemo(() => {
    if (!quoteIssuedAt) {
      return null;
    }
    const date = new Date(quoteIssuedAt);
    date.setDate(date.getDate() + QUOTE_VALIDITY_DAYS);
    return date;
  }, [quoteIssuedAt]);

  function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function buildFormData(values: ProposalInput, files: File[]) {
    const formData = new FormData();
    formData.append("clientName", values.clientName);
    formData.append("businessName", values.businessName);
    formData.append("quickPrompt", values.quickPrompt);
    formData.append("businessOverview", values.businessOverview);
    formData.append("businessActivities", values.businessActivities);
    formData.append("softwareType", values.softwareType);
    formData.append("serviceTypes", JSON.stringify(values.serviceTypes));
    formData.append("paymentTerms", values.paymentTerms);
    formData.append("targetUsers", values.targetUsers);
    formData.append("keyFeatures", values.keyFeatures);
    formData.append("projectFlow", values.projectFlow);
    formData.append("integrations", values.integrations);
    formData.append("timelineWeeks", String(values.timelineWeeks));
    formData.append("budget", String(values.budget));
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });
    return formData;
  }

  async function loadCrm() {
    setCrmLoading(true);
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      const payload = (await response.json()) as CrmPayload;
      setCrmLeads(payload.leads ?? []);
      setCrmStages(payload.stages ?? []);
      setStageList(payload.stages ?? []);
      setMobileStage("All");
      setCrmMessage("");
    } catch {
      setCrmMessage("Failed to load CRM data.");
    } finally {
      setCrmLoading(false);
    }
  }

  useEffect(() => {
    if (activeView === "crm") {
      void loadCrm();
    }
  }, [activeView]);

  async function saveStages() {
    if (stageList.length === 0) {
      setCrmMessage("Add at least one stage.");
      return;
    }
    const response = await fetch("/api/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: stageList }),
    });
    if (!response.ok) {
      setCrmMessage("Failed to save stages.");
      return;
    }
    await loadCrm();
  }

  async function onCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadForm),
    });
    if (!response.ok) {
      setCrmMessage("Create failed. Name and email are required.");
      return;
    }
    setLeadForm(emptyLeadForm);
    setShowLeadModal(false);
    await loadCrm();
  }

  async function onDeleteLead(id: string) {
    const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setCrmMessage("Delete failed.");
      return;
    }
    await loadCrm();
  }

  async function onChangeStatus(id: string, status: string) {
    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setCrmMessage("Stage update failed.");
      return;
    }
    await loadCrm();
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Image
            src="/yadhurtech-logo.jpeg"
            alt={`${COMPANY_NAME} logo`}
            className="brand-logo"
            width={52}
            height={52}
          />
          <div>
            <p className="brand-name">{COMPANY_NAME}</p>
            <p className="brand-tagline">{COMPANY_TAGLINE}</p>
          </div>
        </div>
        <nav className="nav-list">
          <button
            type="button"
            className={`nav-item ${activeView === "quotation" ? "active" : ""}`}
            onClick={() => setActiveView("quotation")}
          >
            Quotation
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === "crm" ? "active" : ""}`}
            onClick={() => setActiveView("crm")}
          >
            CRM
          </button>
        </nav>
      </aside>

      <main className="content-area">
        {activeView === "quotation" && (
          <section className="proposal-shell">
            <header className="hero no-print">
        <div className="brand-block">
          <Image
            src="/yadhurtech-logo.jpeg"
            alt={`${COMPANY_NAME} logo`}
            className="brand-logo"
            width={64}
            height={64}
            priority
          />
          <div>
            <p className="brand-name">{COMPANY_NAME}</p>
            <p className="brand-tagline">{COMPANY_TAGLINE}</p>
          </div>
        </div>
        <p className="hero-kicker">Software Agency Quotation Builder</p>
        <h1>Client Discovery to Proposal PDF</h1>
        <p>
          Fill the project details, generate a structured proposal, review budget split and flow
          diagram, then export it as PDF.
        </p>
      </header>

      <section className="card no-print">
        <h2>Project Intake Form</h2>
        <form className="form-grid" onSubmit={onGenerate}>
          <label>
            Client Name
            <input
              value={input.clientName}
              onChange={(event) => updateField("clientName", event.target.value)}
              placeholder="John Mathew"
              required
            />
          </label>

          <label>
            Client Business Name
            <input
              value={input.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
              placeholder="Mathew Retail Group"
              required
            />
          </label>

          <label className="full">
            Quick Prompt (optional, AI will expand it)
            <textarea
              value={input.quickPrompt}
              onChange={(event) => updateField("quickPrompt", event.target.value)}
              placeholder="Example: Build a CRM for real-estate brokers with lead tracking, WhatsApp follow-up, deal pipeline, and reporting."
            />
          </label>

          <label className="full">
            What does the business do?
            <textarea
              value={input.businessOverview}
              onChange={(event) => updateField("businessOverview", event.target.value)}
              placeholder="Describe the business and current challenges."
            />
          </label>

          <label className="full">
            Business Activities (one per line)
            <textarea
              value={input.businessActivities}
              onChange={(event) => updateField("businessActivities", event.target.value)}
              placeholder={"Inventory management\nOrder tracking\nCustomer support"}
            />
          </label>

          <label>
            Software Type
            <select
              value={input.softwareType}
              onChange={(event) => updateField("softwareType", event.target.value as SoftwareType)}
            >
              {softwareTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="full">
            <p className="field-label">Required Platforms / Services</p>
            <div className="checkbox-grid">
              {serviceTypeOptions.map((option) => (
                <label key={option} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={input.serviceTypes.includes(option)}
                    onChange={() => toggleServiceType(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <label>
            Timeline (weeks)
            <input
              type="number"
              min={2}
              max={104}
              value={input.timelineWeeks}
              onChange={(event) => updateField("timelineWeeks", Number(event.target.value) || 2)}
              required
            />
          </label>

          <label>
            Total Budget (INR)
            <input
              type="number"
              min={1000}
              step={500}
              value={input.budget}
              onChange={(event) => updateField("budget", Number(event.target.value) || 1000)}
              required
            />
          </label>

          <label>
            Target Users
            <input
              value={input.targetUsers}
              onChange={(event) => updateField("targetUsers", event.target.value)}
              placeholder="Store managers, admins, delivery team"
            />
          </label>

          <label className="full">
            Key Features (one per line)
            <textarea
              value={input.keyFeatures}
              onChange={(event) => updateField("keyFeatures", event.target.value)}
              placeholder={"User login and roles\nDashboard\nOrder workflow automation"}
            />
          </label>

          <label className="full">
            Software Flow Steps (one per line)
            <textarea
              value={input.projectFlow}
              onChange={(event) => updateField("projectFlow", event.target.value)}
              placeholder={"Home Screen\nLogin\nDashboard\nModule screen\nCheckout / completion"}
            />
          </label>

          <label className="full">
            Integrations Needed (one per line)
            <textarea
              value={input.integrations}
              onChange={(event) => updateField("integrations", event.target.value)}
              placeholder={"Payment gateway\nWhatsApp API\nGoogle Maps"}
            />
          </label>

          <label className="full">
            Payment Terms (editable)
            <input
              value={input.paymentTerms}
              onChange={(event) => updateField("paymentTerms", event.target.value)}
              placeholder="40% advance, 40% mid-milestone, 20% on delivery"
              required
            />
          </label>

          <label className="full">
            Upload Wireframes / Documents (PDF, images, Excel, docs)
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setAttachments(files);
              }}
            />
          </label>

          <div className="actions full">
            <button type="submit" className="primary-btn" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Proposal"}
            </button>
          </div>
        </form>
        {statusMessage && <p className="status-text">{statusMessage}</p>}
      </section>

      {isGenerated && (
        <section className="proposal-output" id="proposal-document">
          <div className="proposal-toolbar no-print">
            <button type="button" className="primary-btn" onClick={onPrintPdf}>
              Export / Print PDF
            </button>
          </div>

          <article className="proposal-paper">
            <header className="paper-head">
              <div className="paper-brand">
                <Image
                  src="/yadhurtech-logo.jpeg"
                  alt={`${COMPANY_NAME} logo`}
                  className="brand-logo"
                  width={64}
                  height={64}
                />
                <div>
                  <p className="brand-name">{COMPANY_NAME}</p>
                  <p className="brand-tagline">{COMPANY_TAGLINE}</p>
                  <div className="company-details">
                    <p>{COMPANY_ADDRESS}</p>
                    <p>Phone: {COMPANY_PHONE}</p>
                    <p>Email: {COMPANY_EMAIL}</p>
                    <p>Website: {COMPANY_WEBSITE}</p>
                  </div>
                </div>
              </div>
              <div className="paper-meta">
                <h2>Software Development Proposal</h2>
                <p>
                  Prepared for <strong>{input.clientName}</strong> ({input.businessName})
                </p>
                <p>Issue Date: {formatDate(quoteIssuedAt)}</p>
                <p>Valid Until: {formatDate(quoteValidUntil)}</p>
                {proposalId && <p>Proposal ID: #{proposalId}</p>}
              </div>
            </header>

            <section>
              <h3>Business Context</h3>
              <p>{aiProposal?.summary ?? input.businessOverview}</p>
            </section>

            <section>
              <h3>Business Activities</h3>
              <ul>
                {activityLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            <section className="two-col">
              <div>
                <h3>Project Overview</h3>
                <table>
                  <tbody>
                    <tr>
                      <th>Software Type</th>
                      <td>{input.softwareType}</td>
                    </tr>
                    <tr>
                      <th>Platforms / Services</th>
                      <td>{input.serviceTypes.length ? input.serviceTypes.join(", ") : "Not specified"}</td>
                    </tr>
                    <tr>
                      <th>Target Users</th>
                      <td>{input.targetUsers}</td>
                    </tr>
                    <tr>
                      <th>Timeline</th>
                      <td>{input.timelineWeeks} weeks</td>
                    </tr>
                    <tr>
                      <th>Total Budget</th>
                      <td>{currency(input.budget)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Key Features</h3>
                <ul>
                  {featureLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h3>Pricing Split</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>{currency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h3>Recommended Tech Stack</h3>
              <table>
                <thead>
                  <tr>
                    <th>Layer</th>
                    <th>Technology</th>
                  </tr>
                </thead>
                <tbody>
                  {stackRows.map((row) => (
                    <tr key={row.layer}>
                      <td>{row.layer}</td>
                      <td>{row.technology}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {integrationLines.length > 0 && (
              <section>
                <h3>Integrations</h3>
                <ul>
                  {integrationLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3>Software Flow Diagram</h3>
              <div className="flow-wrap">
                {flowLines.map((step, index) => (
                  <div className="flow-node" key={`${step}-${index}`}>
                    <span>{step}</span>
                    {index < flowLines.length - 1 && <span className="flow-arrow">→</span>}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3>Delivery Highlights</h3>
              <div className="two-col">
                <div>
                  <h4>Working Style</h4>
                  <ul>
                    <li>Weekly progress updates and demo checkpoints.</li>
                    <li>Transparent backlog and sprint planning.</li>
                    <li>Fast turnarounds on feedback and refinements.</li>
                  </ul>
                </div>
                <div>
                  <h4>Quality & Support</h4>
                  <ul>
                    <li>Structured QA with regression coverage.</li>
                    <li>Secure deployment and handover documentation.</li>
                    <li>Post‑launch support and optimization options.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3>Terms & Conditions</h3>
              <ul>
                <li>Quotation validity: {QUOTE_VALIDITY_DAYS} days from issue date.</li>
                <li>Payment terms: {input.paymentTerms}.</li>
                <li>Project timeline starts after advance payment and confirmation of requirements.</li>
                <li>External services (hosting, VPS, domains, payment gateways, APIs, SMS/email, etc.) are to be purchased by the client and are not included in this quotation.</li>
                <li>Any change in scope will be estimated and billed separately.</li>
                <li>Refunds are not applicable once work has started. If canceled before work begins, refunds (if any) are considered case‑by‑case.</li>
                <li>Source code and deliverables are handed over after final payment.</li>
              </ul>
            </section>

            <section>
              <h3>Bank Account Details</h3>
              <ul>
                <li>Bank: {BANK_NAME}</li>
                <li>Account Name: {BANK_ACCOUNT_NAME}</li>
                <li>Account No: {BANK_ACCOUNT_NUMBER}</li>
                <li>IFSC: {BANK_IFSC}</li>
              </ul>
            </section>
          </article>
        </section>
      )}
          </section>
        )}

        {activeView === "crm" && (
          <section className="crm-shell">
            <header className="crm-header">
              <div>
                <h1>CRM Kanban</h1>
                <p>Manage leads by stage with a desktop kanban and mobile list view.</p>
              </div>
              <button className="primary-btn" onClick={() => setShowLeadModal(true)}>
                + New Lead
              </button>
            </header>

            <section className="crm-toolbar">
              <input
                className="crm-search"
                value={crmSearch}
                onChange={(event) => setCrmSearch(event.target.value)}
                placeholder="Search leads..."
              />
            </section>

            <section className="card crm-card">
              <h2>Stages</h2>
              <div className="stage-editor">
                <input
                  value={stageDraft}
                  onChange={(event) => setStageDraft(event.target.value)}
                  placeholder="Add stage (e.g., Discovery)"
                />
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    const next = stageDraft.trim();
                    if (!next) return;
                    if (stageList.includes(next)) return;
                    setStageList((prev) => [...prev, next]);
                    setStageDraft("");
                  }}
                >
                  Add Stage
                </button>
                <button className="primary-btn" type="button" onClick={saveStages}>
                  Save Stages
                </button>
              </div>
              <div className="stage-chips">
                {stageList.map((stage) => (
                  <span key={stage} className="stage-chip">
                    {stage}
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() =>
                        setStageList((prev) => prev.filter((item) => item !== stage))
                      }
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            </section>

            {crmMessage && <p className="status-text">{crmMessage}</p>}
            {crmLoading && <p className="loading-text">Loading CRM...</p>}

            <section className="kanban desktop-only">
              {crmStages.map((stage) => {
                const filtered = crmLeads.filter((lead) => {
                  const term = crmSearch.trim().toLowerCase();
                  const matchesSearch = term
                    ? [lead.name, lead.email, lead.company, lead.phone, lead.notes]
                        .join(" ")
                        .toLowerCase()
                        .includes(term)
                    : true;
                  return lead.status === stage && matchesSearch;
                });
                const total = crmLeads.length || 1;
                const percent = Math.min(100, Math.round((filtered.length / total) * 100));
                return (
                  <article key={stage} className="column">
                    <div className="column-head">
                      <h3>{stage}</h3>
                      <span className="column-count">{filtered.length}</span>
                    </div>
                    <div className="column-bar">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                    <div className="cards">
                      {filtered.map((lead) => (
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
                            onChange={(event) => onChangeStatus(lead.id, event.target.value)}
                          >
                            {crmStages.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mobile-only mobile-list-wrap">
              <div className="mobile-filter-bar">
                <label htmlFor="stage-filter">Stage</label>
                <select
                  id="stage-filter"
                  value={mobileStage}
                  onChange={(event) => setMobileStage(event.target.value)}
                >
                  <option value="All">All</option>
                  {crmStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <section className="mobile-list">
                {crmLeads
                  .filter((lead) => (mobileStage === "All" ? true : lead.status === mobileStage))
                  .map((lead) => (
                    <article key={lead.id} className="list-item">
                      <div>
                        <h4>{lead.name}</h4>
                        <p>{lead.company || "No company"}</p>
                        <small>{lead.email}</small>
                      </div>
                      <select
                        value={lead.status}
                        onChange={(event) => onChangeStatus(lead.id, event.target.value)}
                      >
                        {crmStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
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
                      value={leadForm.name}
                      onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })}
                      required
                    />
                    <input
                      placeholder="Email"
                      value={leadForm.email}
                      onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })}
                      required
                    />
                    <input
                      placeholder="Phone"
                      value={leadForm.phone}
                      onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })}
                    />
                    <input
                      placeholder="Company"
                      value={leadForm.company}
                      onChange={(event) => setLeadForm({ ...leadForm, company: event.target.value })}
                    />
                    <select
                      value={leadForm.status}
                      onChange={(event) => setLeadForm({ ...leadForm, status: event.target.value })}
                    >
                      {crmStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Notes"
                      value={leadForm.notes}
                      onChange={(event) => setLeadForm({ ...leadForm, notes: event.target.value })}
                    />
                    <button className="primary-btn" type="submit">
                      Save Lead
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
