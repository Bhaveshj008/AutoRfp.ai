import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalsTable } from '@/components/rfp/ProposalsTable';
import { LoadingState } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldBox } from '@/components/common/FieldBox';
import { useRfpDetails, useProposals, useAwardProposal, useRejectProposal } from '@/hooks/useRfps';
import { Proposal } from '@/types';
import { ArrowLeft, Inbox, BarChart3 } from 'lucide-react';

export default function RfpProposalsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rfp, isLoading: rfpLoading } = useRfpDetails(id);
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals(id);
  
  const awardMutation = useAwardProposal();
  const rejectMutation = useRejectProposal();

  const handleAward = (proposal: Proposal) => {
    if (!id) return;
    awardMutation.mutate({ rfpId: id, vendorId: proposal.vendor_id });
  };

  const handleReject = (proposal: Proposal) => {
    if (!id) return;
    rejectMutation.mutate({ rfpId: id, vendorId: proposal.vendor_id });
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: rfp.currency_code,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isLoading = rfpLoading || proposalsLoading;

  if (isLoading) {
    return (
      <AppShell title="Proposals">
        <LoadingState message="Loading proposals..." />
      </AppShell>
    );
  }

  if (!rfp) {
    return (
      <AppShell title="RFP Not Found">
        <EmptyState
          icon={Inbox}
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
    <AppShell title={`Proposals - ${rfp.title}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/rfps/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to RFP
            </Link>
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">Proposals</h2>
            <p className="text-muted-foreground">{rfp.title}</p>
          </div>
          {proposals.length > 0 && (
            <Button asChild>
              <Link to={`/rfps/${id}/compare`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare View
              </Link>
            </Button>
          )}
        </div>

        {/* RFP Summary */}
        <div className="grid grid-cols-4 gap-4">
          <FieldBox label="Budget Cap" value={rfp.budget_cap ? `$${rfp.budget_cap.toLocaleString()}` : 'N/A'} />
          <FieldBox label="Delivery Deadline" value={rfp.deadline_days ? `${rfp.deadline_days} Days` : 'N/A'} />
          <FieldBox label="Payment Terms" value={rfp.payment_terms || 'N/A'} />
          <FieldBox label="Min Warranty" value={rfp.min_warranty_months ? `${rfp.min_warranty_months} Month(s)` : 'N/A'} />
        </div>

        {/* Proposals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Proposals ({proposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No proposals received"
                description="Wait for vendors to respond to your RFP."
              />
            ) : (
              <ProposalsTable
                proposals={proposals}
                budgetCap={rfp.budget_cap}
                currencyCode={rfp.currency_code}
                onAward={handleAward}
                onReject={handleReject}
                showActions
              />
            )}
          </CardContent>
        </Card>

        {/* Proposal Details */}
        {proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardHeader>
              <CardTitle className="text-base">{proposal.vendor?.name || 'Unknown Vendor'} - Proposal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.ai_reasoning && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">AI Analysis</p>
                  <p className="text-sm text-muted-foreground italic">
                    "{proposal.ai_reasoning}"
                  </p>
                </div>
              )}

              {proposal.items && proposal.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left font-medium">Item</th>
                          <th className="p-2 text-right font-medium">Unit Price</th>
                          <th className="p-2 text-right font-medium">Qty</th>
                          <th className="p-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{item.item_name}</td>
                            <td className="p-2 text-right font-mono">{formatPrice(item.price)}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right font-mono font-medium">
                              {formatPrice((item.price || 0) * (item.quantity || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
