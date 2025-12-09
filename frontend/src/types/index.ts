import { ReactNode } from "react";

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}

// RFP Types (snake_case to match backend)
export interface RfpItem {
  label: ReactNode;
  item: string;
  specs: string;
  quantity: number;
}

export interface RfpStructured {
  title: string;
  summary: string;
  budget_cap: number;
  currency_code: string;
  deadline_days: number;
  payment_terms: string;
  min_warranty_months: number;
  items?: RfpItem[];
}

export interface Rfp {
  id: string;
  title: string;
  summary: string | null;
  raw_prompt?: string;
  budget_cap: number | null;
  currency_code: string;
  deadline_days: number | null;
  payment_terms: string | null;
  min_warranty_months: number | null;
  status: 'draft' | 'sent' | 'evaluating' | 'closed';
  created_at: string;
  updated_at: string;
}

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  email: string;
  rating: number | string | null; // Can be Decimal object from backend
  total_projects?: number;
  successful_projects?: number;
  average_delivery_days?: number | null;
  on_time_percentage?: number | null;
  average_proposal_score?: number | null;
  rejection_count?: number;
  last_awarded_at?: string | null;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export interface RfpVendor {
  rfp_id: string;
  vendor_id: string;
  invite_status: 'pending' | 'sent' | 'responded';
  invited_at?: string;
}

// Proposal Types
export interface ProposalItem {
  id: string;
  item_name: string;
  specs: string;
  price: number;
  quantity: number;
}

export interface Proposal {
  id: string;
  rfp_id: string;
  vendor_id: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    rating?: number | string | null;
  } | null;
  version: number;
  total_price: number | null;
  currency_code: string;
  delivery_days: number | null;
  warranty_text: string | null;
  payment_terms?: string | null;
  status: 'pending' | 'awarded' | 'rejected';
  ai_score: number | string | null; // Can be Decimal from backend
  ai_reasoning: string | null;
  items: ProposalItem[];
  created_at: string;
  updated_at: string;
}

// Email Types
export interface Email {
  id: string;
  rfp_id: string;
  vendor_id: string;
  vendor_name: string | null;
  vendor_email: string | null;
  direction: 'inbound' | 'outbound';
  subject: string;
  body_text: string;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

// API Response Wrappers
export interface ListRfpsResponse {
  items: Rfp[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ListVendorsResponse {
  vendors: Vendor[];
  page: number;
  limit: number;
  total: number;
}

export interface ListProposalsResponse {
  proposals: Proposal[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AnalyzeRfpPreviewResponse {
  structured: RfpStructured;
}

export interface CreateRfpResponse {
  rfp_id: string;
  structured: RfpStructured;
}

export interface GetRfpDetailsResponse {
  rfp: Rfp;
}

export interface SendRfpResponse {
  rfp_id: string;
  invited_count: number;
}

export interface AwardProposalResponse {
  rfp_id: string;
  vendor_id: string;
  awarded_proposal_id: string;
}

export interface RejectProposalResponse {
  rfp_id: string;
  vendor_id: string;
  proposal_id: string;
  status: string;
}

// API Payloads
export interface AnalyzeRfpPreviewPayload {
  prompt: string;
}

export interface CreateRfpPayload {
  prompt: string;
  structured: RfpStructured;
}

export interface ListRfpsPayload {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SendRfpPayload {
  rfp_id: string;
  vendor_ids: string[];
}

export interface CreateVendorPayload {
  name: string;
  email: string;
  tags: string[];
}

export interface UpdateVendorPayload {
  vendor_id: string;
  name?: string;
  email?: string;
  tags?: string[];
}

export interface ListVendorsPayload {
  search?: string;
  min_rating?: number;
  page?: number;
  limit?: number;
}

export interface ListProposalsPayload {
  rfp_id: string;
  page?: number;
  limit?: number;
}

export interface AwardProposalPayload {
  rfp_id: string;
  vendor_id: string;
}

export interface RejectProposalPayload {
  rfp_id: string;
  vendor_id: string;
}

export interface ParseProposalsPayload {
  rfp_id: string;
}

export interface ListEmailsPayload {
  rfp_id: string;
  page?: number;
  limit?: number;
}
