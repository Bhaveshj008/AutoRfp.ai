import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listVendors, createVendor, updateVendor, deleteVendor } from '@/lib/api';
import { Vendor } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api';

export function useVendors(search?: string) {
  return useQuery({
    queryKey: ['vendors', search],
    queryFn: async () => {
      const response = await listVendors({ search });
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data?.vendors || [];
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; tags: string[] }) => {
      // Backend expects an array of vendors
      const response = await createVendor([data]);
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      // Returns array, get first
      return (response.data as Vendor[])?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendor Created',
        description: 'The vendor has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Vendor',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useBulkCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vendors: Array<{ name: string; email: string; tags: string[] }>) => {
      // Send all vendors in a single API call
      const response = await createVendor(vendors);
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data as Vendor[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendors Imported',
        description: `Successfully imported ${data.length} vendor${data.length !== 1 ? 's' : ''}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Import Vendors',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { vendor_id: string; name?: string; email?: string; tags?: string[] }) => {
      const response = await updateVendor(data);
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
      return response.data as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendor Updated',
        description: 'The vendor has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Vendor',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await deleteVendor(vendorId);
      if (!response.success) {
        throw new Error(getErrorMessage(response));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendor Deleted',
        description: 'The vendor has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Vendor',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}
