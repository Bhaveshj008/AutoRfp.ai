import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RfpSummaryCard } from '@/components/rfp/RfpSummaryCard';
import { VendorSelector } from '@/components/rfp/VendorSelector';
import { ProposalsTable } from '@/components/rfp/ProposalsTable';
import { EmailsList } from '@/components/rfp/EmailsList';
import { LoadingState } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useRfpDetails, useProposals, useSendRfp } from '@/hooks/useRfps';
import { useVendors, useCreateVendor } from '@/hooks/useVendors';
import { FileText, Users, Inbox, Mail, BarChart3, ArrowLeft } from 'lucide-react';

export default function RfpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  const { data: rfp, isLoading: rfpLoading } = useRfpDetails(id);
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals(id);
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  
  const sendRfpMutation = useSendRfp();
  const createVendorMutation = useCreateVendor();

  const handleSendRfp = async () => {
    if (!id || selectedVendorIds.length === 0) return;
    await sendRfpMutation.mutateAsync({ rfpId: id, vendorIds: selectedVendorIds });
    setSelectedVendorIds([]);
  };

  const handleAddVendor = async (vendorData: { name: string; email: string; tags: string }) => {
    // Convert comma-separated tags to array
    const tagsArray = vendorData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    
    const result = await createVendorMutation.mutateAsync({
      name: vendorData.name,
      email: vendorData.email,
      tags: tagsArray,
    });
    if (result) {
      setSelectedVendorIds((prev) => [...prev, result.id]);
    }
  };

  if (rfpLoading) {
    return (
      <AppShell title="RFP Details">
        <LoadingState message="Loading RFP details..." />
      </AppShell>
    );
  }

  if (!rfp) {
    return (
      <AppShell title="RFP Not Found">
        <EmptyState
          icon={FileText}
          title="RFP not found"
          description="The requested RFP could not be found."
          action={{
            label: 'Back to RFPs',
            onClick: () => navigate('/rfps'),
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={rfp.title}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rfps">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{rfp.title}</h2>
            <p className="text-muted-foreground">{rfp.summary}</p>
          </div>
          {proposals.length > 0 && (
            <Button asChild>
              <Link to={`/rfps/${id}/compare`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare Proposals
              </Link>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2">
              <Users className="h-4 w-4" />
              Invite Vendors
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-2">
              <Mail className="h-4 w-4" />
              Emails
              {proposals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {proposals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="gap-2">
              <Inbox className="h-4 w-4" />
              Proposals
              {proposals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {proposals.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <RfpSummaryCard rfp={rfp} showStatus />
          </TabsContent>

          <TabsContent value="vendors">
            {rfp.status === 'closed' ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      This RFP is closed. No further vendors can be invited.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : vendorsLoading ? (
              <LoadingState message="Loading vendors..." />
            ) : (
              <VendorSelector
                vendors={vendors}
                selectedIds={selectedVendorIds}
                onSelectionChange={setSelectedVendorIds}
                onSend={handleSendRfp}
                onAddVendor={handleAddVendor}
                isSending={sendRfpMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="emails">
            <EmailsList rfpId={id} rfpStatus={rfp.status} />
          </TabsContent>

          <TabsContent value="proposals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Received Proposals</CardTitle>
                {proposals.length > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/rfps/${id}/proposals`}>
                      View All Details
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {proposalsLoading ? (
                  <LoadingState message="Loading proposals..." />
                ) : proposals.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No proposals yet"
                    description="Send the RFP to vendors and wait for their responses."
                  />
                ) : (
                  <ProposalsTable
                    proposals={proposals}
                    budgetCap={rfp.budget_cap}
                    currencyCode={rfp.currency_code}
                    showActions={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
