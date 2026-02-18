export const LEAD_STATUSES = [
  "New",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DeletedLead = Lead & {
  deletedAt: string;
};

export type CrmDB = {
  leads: Lead[];
  deletedLeads: DeletedLead[];
};
