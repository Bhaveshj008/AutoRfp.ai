import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { Proposal } from '@/types';
import { Award, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareCardsProps {
  proposals: Proposal[];
  onAward: (proposal: Proposal) => void;
  onReject: (proposal: Proposal) => void;
}

export function CompareCards({ proposals, onAward, onReject }: CompareCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proposals.map((proposal) => {
        const isAwarded = proposal.status === 'awarded';
        const isRejected = proposal.status === 'rejected';
        const aiScore = proposal.ai_score ?? 0;
        const isHighScore = aiScore >= 90;
        const isPending = proposal.status === 'pending';

        return (
          <Card
            key={proposal.id}
            className={cn(
              'transition-all',
              isAwarded && 'ring-2 ring-success bg-success/5',
              isRejected && 'opacity-50',
              isHighScore && isPending && 'ring-2 ring-primary'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{proposal.vendor?.name || 'Unknown Vendor'}</CardTitle>
                  {isAwarded && (
                    <span className="inline-flex items-center gap-1 text-xs text-success font-semibold mt-1">
                      <Check className="h-3 w-3" /> WINNER
                    </span>
                  )}
                  {isHighScore && isPending && (
                    <span className="text-xs text-primary font-medium mt-1 block">
                      Recommended
                    </span>
                  )}
                </div>
                {proposal.ai_score !== null && (
                  <ScoreBadge score={proposal.ai_score} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.ai_reasoning && (
                <p className="text-sm text-muted-foreground italic">
                  "{proposal.ai_reasoning}"
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Price</p>
                  <p className="font-mono font-semibold">
                    {proposal.total_price ? `$${proposal.total_price.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivery</p>
                  <p className="font-medium">{proposal.delivery_days ? `${proposal.delivery_days} days` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warranty</p>
                  <p className="font-medium">{proposal.warranty_text || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Terms</p>
                  <p className="font-medium">{proposal.payment_terms || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                {isAwarded ? (
                  <div className="py-2 bg-success text-success-foreground font-semibold rounded text-center text-sm">
                    Contract Awarded
                  </div>
                ) : isRejected ? (
                  <div className="py-2 bg-muted text-muted-foreground font-medium rounded text-center text-sm">
                    Proposal Rejected
                  </div>
                ) : isHighScore ? (
                  <Button
                    className="w-full"
                    onClick={() => onAward(proposal)}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Award Contract
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onReject(proposal)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Proposal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
