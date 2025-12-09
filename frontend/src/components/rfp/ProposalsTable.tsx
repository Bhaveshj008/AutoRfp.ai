import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Proposal } from '@/types';
import { AlertCircle, Award, X } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/formatUtils';
import { safeGet, safeArray, safeNumber, safeCall } from '@/lib/errorUtils';

interface ProposalsTableProps {
  proposals: Proposal[];
  budgetCap?: number | null;
  currencyCode?: string;
  onAward?: (proposal: Proposal) => void;
  onReject?: (proposal: Proposal) => void;
  onViewDetails?: (proposal: Proposal) => void;
  showActions?: boolean;
}

export function ProposalsTable({
  proposals,
  budgetCap,
  currencyCode = 'USD',
  onAward,
  onReject,
  onViewDetails,
  showActions = true,
}: ProposalsTableProps) {
  const safeProposals = safeArray(proposals, []);

  const handleAward = (proposal: Proposal) => {
    safeCall(onAward, [proposal]);
  };

  const handleReject = (proposal: Proposal) => {
    safeCall(onReject, [proposal]);
  };

  const handleViewDetails = (proposal: Proposal) => {
    safeCall(onViewDetails, [proposal]);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Vendor</TableHead>
            <TableHead className="font-semibold">Total Price</TableHead>
            <TableHead className="font-semibold">Delivery</TableHead>
            <TableHead className="font-semibold">Warranty</TableHead>
            <TableHead className="font-semibold">Terms</TableHead>
            <TableHead className="font-semibold text-center">AI Score</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            {showActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeProposals.map((proposal) => {
            const proposalId = safeGet(proposal, 'id', Math.random().toString());
            const vendorName = safeGet(proposal, 'vendor')?.name || 'Unknown Vendor';
            const totalPrice = safeNumber(safeGet(proposal, 'total_price'));
            const deliveryDays = safeGet(proposal, 'delivery_days');
            const warrantyText = safeGet(proposal, 'warranty_text', 'N/A');
            const paymentTerms = safeGet(proposal, 'payment_terms', 'N/A');
            const aiScore = safeNumber(safeGet(proposal, 'ai_score'), 0);
            const status = safeGet(proposal, 'status', 'unknown');
            
            const isOverBudget = budgetCap && totalPrice && totalPrice > budgetCap;
            const isHighScore = aiScore >= 90;
            
            return (
              <TableRow
                key={proposalId}
                className={isHighScore ? 'bg-primary/5' : undefined}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{vendorName}</p>
                    {isHighScore && (
                      <span className="text-xs text-primary font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-mono font-medium">
                    {formatCurrencySafe(totalPrice, currencyCode)}
                    {isOverBudget && (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{deliveryDays ? `${deliveryDays} days` : 'N/A'}</TableCell>
                <TableCell>{warrantyText}</TableCell>
                <TableCell>{paymentTerms}</TableCell>
                <TableCell className="text-center">
                  {aiScore > 0 && (
                    <ScoreBadge score={aiScore} />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={(status as 'draft' | 'sent' | 'evaluating' | 'closed' | 'pending' | 'awarded' | 'rejected')} />
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onViewDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(proposal)}
                        >
                          View
                        </Button>
                      )}
                      {status === 'pending' && (
                        <>
                          {onAward && isHighScore && (
                            <Button
                              size="sm"
                              onClick={() => handleAward(proposal)}
                            >
                              <Award className="h-3 w-3 mr-1" />
                              Award
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(proposal)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
