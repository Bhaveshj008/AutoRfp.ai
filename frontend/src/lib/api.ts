import {
  ApiResponse,
  AnalyzeRfpPreviewPayload,
  AnalyzeRfpPreviewResponse,
  CreateRfpPayload,
  CreateRfpResponse,
  ListRfpsPayload,
  ListRfpsResponse,
  GetRfpDetailsResponse,
  SendRfpPayload,
  SendRfpResponse,
  CreateVendorPayload,
  UpdateVendorPayload,
  ListVendorsPayload,
  ListVendorsResponse,
  ListProposalsPayload,
  ListProposalsResponse,
  AwardProposalPayload,
  AwardProposalResponse,
  RejectProposalPayload,
  RejectProposalResponse,
  ParseProposalsPayload,
  ListEmailsPayload,
  Email,
  Vendor,
  Proposal,
} from '@/types';

const ENV = import.meta.env.VITE_ENVIRONMENT || "LOCAL";

const API_BASE_URL = {
  LOCAL: import.meta.env.VITE_LOCAL_API_BASE_URL,
  TEST: import.meta.env.VITE_TEST_API_BASE_URL,
}[ENV];

if (!API_BASE_URL) {
  throw new Error(`API_BASE_URL not defined for ENV=${ENV}`);
}

type ApiAction =
  | 'AnalyzeRfpPreview'
  | 'CreateRfp'
  | 'ListRfps'
  | 'GetRfpDetails'
  | 'SendRfp'
  | 'CreateVendor'
  | 'UpdateVendor'
  | 'DeleteVendor'
  | 'ListVendors'
  | 'ListProposals'
  | 'AwardProposal'
  | 'RejectProposal'
  | 'ParseProposals'
  | 'ListEmails'
  | 'FetchEmails';

async function apiCall<T>(action: ApiAction, data: object = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });

    const result = await response.json();
    return result as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      error: getErrorMessage(error),
    };
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiResponse;
    if (apiError.error) return apiError.error;
    if (apiError.message) return apiError.message;
    if (apiError.details) return JSON.stringify(apiError.details);
  }
  return 'An unexpected error occurred';
}

// RFP APIs
export async function analyzeRfpPreview(payload: AnalyzeRfpPreviewPayload): Promise<ApiResponse<AnalyzeRfpPreviewResponse>> {
  return apiCall<AnalyzeRfpPreviewResponse>('AnalyzeRfpPreview', payload);
}

export async function createRfp(payload: CreateRfpPayload): Promise<ApiResponse<CreateRfpResponse>> {
  return apiCall<CreateRfpResponse>('CreateRfp', payload);
}

export async function listRfps(payload: ListRfpsPayload = {}): Promise<ApiResponse<ListRfpsResponse>> {
  return apiCall<ListRfpsResponse>('ListRfps', payload);
}

export async function getRfpDetails(rfpId: string): Promise<ApiResponse<GetRfpDetailsResponse>> {
  return apiCall<GetRfpDetailsResponse>('GetRfpDetails', { rfp_id: rfpId });
}

export async function sendRfpToVendors(payload: SendRfpPayload): Promise<ApiResponse<SendRfpResponse>> {
  return apiCall<SendRfpResponse>('SendRfp', payload);
}

// Vendor APIs
export async function createVendor(vendors: CreateVendorPayload[]): Promise<ApiResponse<Vendor[]>> {
  return apiCall<Vendor[]>('CreateVendor', vendors);
}

export async function updateVendor(payload: UpdateVendorPayload): Promise<ApiResponse<Vendor>> {
  return apiCall<Vendor>('UpdateVendor', payload);
}

export async function deleteVendor(vendorId: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiCall<{ deleted: boolean }>('DeleteVendor', { vendor_id: vendorId });
}

export async function listVendors(payload: ListVendorsPayload = {}): Promise<ApiResponse<ListVendorsResponse>> {
  return apiCall<ListVendorsResponse>('ListVendors', payload);
}

// Proposal APIs
export async function listProposals(payload: ListProposalsPayload): Promise<ApiResponse<ListProposalsResponse>> {
  return apiCall<ListProposalsResponse>('ListProposals', payload);
}

export async function awardProposal(payload: AwardProposalPayload): Promise<ApiResponse<AwardProposalResponse>> {
  return apiCall<AwardProposalResponse>('AwardProposal', payload);
}

export async function rejectProposal(payload: RejectProposalPayload): Promise<ApiResponse<RejectProposalResponse>> {
  return apiCall<RejectProposalResponse>('RejectProposal', payload);
}

export async function parseProposals(payload: ParseProposalsPayload): Promise<ApiResponse<Proposal[]>> {
  return apiCall<Proposal[]>('ParseProposals', payload);
}

// Email APIs
export async function listEmails(payload: ListEmailsPayload): Promise<ApiResponse<Email[]>> {
  return apiCall<Email[]>('ListEmails', payload);
}

export async function fetchEmails(): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return apiCall<{ success: boolean; message: string }>('FetchEmails', {});
}
