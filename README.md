# Simple CRM (Kanban + Mobile List)

A lightweight CRM built with Next.js:

- Desktop view: Kanban board by lead status.
- Mobile view: compact list.
- Backend API with file-based database (JSON).
- CSV import/export.
- Google Sheets import/export sync.
- Delete actions are tracked and synced to the `Deleted` sheet tab.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Google Sheets setup (optional but supported)

Create `.env.local` with:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEET_LEADS_TAB=Leads
GOOGLE_SHEET_DELETED_TAB=Deleted
```

Share your Google Sheet with the service account email as Editor.

## API endpoints

- `GET /api/leads` -> CRM payload.
- `POST /api/leads` -> create lead.
- `PATCH /api/leads/:id` -> update lead.
- `DELETE /api/leads/:id` -> delete lead + log deleted record.
- `POST /api/import` -> import from CSV/JSON/Google Sheet.
- `GET /api/export?format=csv` -> download CSV.
- `GET /api/export?toGoogleSheet=1` -> push live CRM + deleted logs to Google Sheet.
