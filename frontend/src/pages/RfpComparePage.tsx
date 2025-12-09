import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRatingSafe } from '@/lib/formatUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompareCards } from '@/components/rfp/CompareCards';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { LoadingState } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useRfpDetails, useProposals, useAwardProposal, useRejectProposal } from '@/hooks/useRfps';
import { Proposal } from '@/types';
import { ArrowLeft, BarChart3, AlertCircle } from 'lucide-react';

export default function RfpComparePage() {
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
      <AppShell title="Compare Proposals">
        <LoadingState message="Loading comparison data..." />
      </AppShell>
    );
  }

  if (!rfp) {
    return (
      <AppShell title="RFP Not Found">
        <EmptyState
          icon={BarChart3}
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

  if (proposals.length === 0) {
    return (
      <AppShell title="Compare Proposals">
        <EmptyState
          icon={BarChart3}
          title="No proposals to compare"
          description="Wait for vendors to submit their proposals."
          action={{
            label: 'Back to RFP',
            onClick: () => navigate(`/rfps/${id}`),
          }}
        />
      </AppShell>
    );
  }

  const sortedProposals = [...proposals].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
  const recommendedVendor = sortedProposals.find((p) => (p.ai_score ?? 0) >= 90);

  return (
    <AppShell title={`Compare - ${rfp.title}`}>
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
            <h2 className="text-2xl font-bold text-foreground">Proposal Comparison</h2>
            <p className="text-muted-foreground">
              AI has evaluated {proposals.length} responses against your requirements.
            </p>
          </div>
        </div>

        {/* AI Recommendation */}
        {recommendedVendor && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AI Recommendation</p>
                  <p className="text-muted-foreground">
                    Based on analysis, <span className="font-medium text-primary">{recommendedVendor.vendor?.name}</span> offers the best value with a score of {formatRatingSafe(recommendedVendor.ai_score, 0)}/100.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-40">Metric</TableHead>
                    {sortedProposals.map((p) => (
                      <TableHead key={p.id} className="font-semibold text-center min-w-40">
                        {p.vendor?.name || 'Unknown'}
                        {(p.ai_score ?? 0) >= 90 && (
                          <span className="block text-xs text-primary font-normal mt-0.5">
                            Recommended
                          </span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Price</TableCell>
                    {sortedProposals.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        <div className="flex items-center justify-center gap-1 font-mono font-medium">
                          {formatPrice(p.total_price)}
                          {p.total_price && rfp.budget_cap && p.total_price > rfp.budget_cap && (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Delivery</TableCell>
                    {sortedProposals.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {p.delivery_days ? `${p.delivery_days} days` : 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Warranty</TableCell>
                    {sortedProposals.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {p.warranty_text || 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Payment Terms</TableCell>
                    {sortedProposals.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {p.payment_terms || 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">AI Score</TableCell>
                    {sortedProposals.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {p.ai_score !== null && (
                          <div className="flex justify-center">
                            <ScoreBadge score={p.ai_score} />
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-4">AI Analysis & Actions</h3>
          <CompareCards
            proposals={sortedProposals}
            onAward={handleAward}
            onReject={handleReject}
          />
        </div>
      </div>
    </AppShell>
  );
}
