export const DEFAULT_STAGES = [
  "New",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
];

export type LeadStatus = string;

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
  stages: string[];
};
