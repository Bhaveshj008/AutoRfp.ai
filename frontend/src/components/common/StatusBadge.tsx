import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Status = 'draft' | 'sent' | 'evaluating' | 'closed' | 'pending' | 'awarded' | 'rejected';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  evaluating: { label: 'Evaluating', variant: 'outline' },
  closed: { label: 'Closed', variant: 'secondary' },
  awarded: { label: 'Awarded', variant: 'default' },
  pending: { label: 'Pending', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
