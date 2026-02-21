"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

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
  error?: string;
};

const COMPANY_NAME = "Yadhurtech";
const COMPANY_TAGLINE = "Empowering business with smart digital and solutions.";
const COMPANY_ADDRESS = "7-8/2 vgp lane, Dharmaraja koil street, Saidapet, Chennai-600015.";
const COMPANY_PHONE = "9176002530";
const COMPANY_EMAIL = "info@yadhurtech.com";
const COMPANY_WEBSITE = "yadhurtech.com";

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

const costSplit: Record<SoftwareType, CostItem[]> = {
  "Web Application": [
    { item: "Discovery & Planning", percent: 10 },
    { item: "UI/UX Design", percent: 15 },
    { item: "Frontend Development", percent: 25 },
    { item: "Backend Development", percent: 25 },
    { item: "Testing & QA", percent: 12 },
    { item: "Deployment & Handover", percent: 8 },
    { item: "Project Management", percent: 5 },
  ],
  "Mobile Application": [
    { item: "Discovery & Planning", percent: 10 },
    { item: "UI/UX Design", percent: 15 },
    { item: "Mobile App Development", percent: 35 },
    { item: "Backend & APIs", percent: 20 },
    { item: "Testing & QA", percent: 10 },
    { item: "Store Release & Handover", percent: 6 },
    { item: "Project Management", percent: 4 },
  ],
  "SaaS Platform": [
    { item: "Discovery & Product Strategy", percent: 12 },
    { item: "UI/UX Design", percent: 12 },
    { item: "Frontend Application", percent: 20 },
    { item: "Backend & Architecture", percent: 28 },
    { item: "Security, QA & Compliance", percent: 14 },
    { item: "Deployment & DevOps", percent: 9 },
    { item: "Project Management", percent: 5 },
  ],
  "E-commerce": [
    { item: "Discovery & Catalog Planning", percent: 10 },
    { item: "UI/UX Design", percent: 14 },
    { item: "Storefront Development", percent: 24 },
    { item: "Checkout, Payment & Logistics", percent: 22 },
    { item: "Admin Panel & Reports", percent: 14 },
    { item: "Testing & Launch", percent: 10 },
    { item: "Project Management", percent: 6 },
  ],
  "CRM / ERP": [
    { item: "Business Process Mapping", percent: 14 },
    { item: "UI/UX Design", percent: 12 },
    { item: "Core Modules Development", percent: 32 },
    { item: "Integrations & Automation", percent: 18 },
    { item: "Testing & User Training", percent: 12 },
    { item: "Deployment & Support Setup", percent: 7 },
    { item: "Project Management", percent: 5 },
  ],
  Custom: [
    { item: "Discovery & Planning", percent: 12 },
    { item: "UI/UX Design", percent: 12 },
    { item: "Core Development", percent: 33 },
    { item: "Integrations", percent: 15 },
    { item: "Testing & QA", percent: 12 },
    { item: "Launch & Handover", percent: 10 },
    { item: "Project Management", percent: 6 },
  ],
};

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
  targetUsers: "",
  keyFeatures: "",
  projectFlow: "",
  integrations: "",
  timelineWeeks: 12,
  budget: 12000,
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
    return costSplit[input.softwareType].map((entry) => ({
      ...entry,
      amount: Math.round((input.budget * entry.percent) / 100),
    }));
  }, [input.budget, input.softwareType]);

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

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || !payload.ok || !payload.ai) {
        throw new Error(payload.error ?? "AI generation failed");
      }

      setAiProposal(payload.ai);
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

  return (
    <main className="proposal-shell">
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
                    <th>Workstream</th>
                    <th>Share</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>{row.percent}%</td>
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
              <h3>Assumptions & Risks</h3>
              <div className="two-col">
                <div>
                  <h4>Assumptions</h4>
                  <ul>
                    {(aiProposal?.assumptions ?? [
                      "Client will provide timely feedback each sprint.",
                      "Scope is aligned with approved feature list.",
                    ]).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Risks</h4>
                  <ul>
                    {(aiProposal?.risks ?? [
                      "Third-party integration dependencies may affect timeline.",
                      "Late scope changes can impact budget.",
                    ]).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </article>
        </section>
      )}
    </main>
  );
}
