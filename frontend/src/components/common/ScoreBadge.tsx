import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const getScoreStyle = (score: number) => {
    if (score >= 90) return 'bg-success/10 text-success border-success/20';
    if (score >= 70) return 'bg-primary/10 text-primary border-primary/20';
    if (score >= 50) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border',
        getScoreStyle(score),
        className
      )}
    >
      {score}
    </div>
  );
}
