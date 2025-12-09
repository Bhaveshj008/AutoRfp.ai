import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listRfps, 
  getRfpDetails, 
  analyzeRfpPreview, 
  createRfp,
  sendRfpToVendors,
  listProposals,
  awardProposal,
  rejectProposal,
  parseProposals,
  listEmails,
  fetchEmails,
} from '@/lib/api';
import { Rfp, RfpStructured, Proposal, Email } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';

export function useRfps(status?: string) {
  return useQuery({
    queryKey: ['rfps', status],
    queryFn: async () => {
      const response = await listRfps({ status });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data?.items || [];
    },
  });
}

export function useRfpDetails(rfpId: string | undefined) {
  return useQuery({
    queryKey: ['rfp', rfpId],
    queryFn: async () => {
      if (!rfpId) return null;
      const response = await getRfpDetails(rfpId);
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data?.rfp || null;
    },
    enabled: !!rfpId,
  });
}

export function useAnalyzeRfp() {
  const [structuredData, setStructuredData] = useState<RfpStructured | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await analyzeRfpPreview({ prompt });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data?.structured as RfpStructured;
    },
    onSuccess: (data) => {
      setStructuredData(data);
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  return {
    analyze: mutation.mutate,
    isAnalyzing: mutation.isPending,
    structuredData,
    setStructuredData,
    reset: () => setStructuredData(null),
  };
}

export function useCreateRfp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ prompt, structured }: { prompt: string; structured: RfpStructured }) => {
      const response = await createRfp({ prompt, structured });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfps'] });
      toast({
        title: 'RFP Created',
        description: 'Your RFP has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create RFP',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useSendRfp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfpId, vendorIds }: { rfpId: string; vendorIds: string[] }) => {
      const response = await sendRfpToVendors({ rfp_id: rfpId, vendor_ids: vendorIds });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: (data, { rfpId }) => {
      queryClient.invalidateQueries({ queryKey: ['rfps'] });
      queryClient.invalidateQueries({ queryKey: ['rfp', rfpId] });
      toast({
        title: 'RFP Sent',
        description: `RFP sent to ${data?.invited_count || 'selected'} vendors.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Send RFP',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useProposals(rfpId: string | undefined) {
  return useQuery({
    queryKey: ['proposals', rfpId],
    queryFn: async () => {
      if (!rfpId) return [];
      const response = await listProposals({ rfp_id: rfpId });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data?.proposals || [];
    },
    enabled: !!rfpId,
  });
}

export function useParseProposals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rfpId: string) => {
      const response = await parseProposals({ rfp_id: rfpId });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data as Proposal[];
    },
    onSuccess: (_, rfpId) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', rfpId] });
      toast({
        title: 'Proposals Parsed',
        description: 'AI has analyzed the incoming proposals.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Parsing Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useAwardProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfpId, vendorId }: { rfpId: string; vendorId: string }) => {
      const response = await awardProposal({ rfp_id: rfpId, vendor_id: vendorId });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: (_, { rfpId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', rfpId] });
      queryClient.invalidateQueries({ queryKey: ['rfp', rfpId] });
      queryClient.invalidateQueries({ queryKey: ['rfps'] });
      toast({
        title: 'Contract Awarded',
        description: 'The vendor has been notified.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Award',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useRejectProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rfpId, vendorId }: { rfpId: string; vendorId: string }) => {
      const response = await rejectProposal({ rfp_id: rfpId, vendor_id: vendorId });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: (_, { rfpId }) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', rfpId] });
      toast({
        title: 'Proposal Rejected',
        description: 'The proposal has been rejected.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Reject',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useEmails(rfpId: string | undefined) {
  return useQuery({
    queryKey: ['emails', rfpId],
    queryFn: async () => {
      if (!rfpId) return [];
      const response = await listEmails({ rfp_id: rfpId });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data || [];
    },
    enabled: !!rfpId,
  });
}

export function useFetchEmails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetchEmails();
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast({
        title: 'Emails Synced',
        description: 'New emails have been fetched and synced successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Fetch Emails',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}
