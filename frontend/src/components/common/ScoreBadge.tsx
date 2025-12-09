import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number | string | null | undefined;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  // Convert Decimal or string to number
  const numScore = score === null || score === undefined 
    ? 0 
    : typeof score === 'number' 
      ? score 
      : parseFloat(String(score));

  if (isNaN(numScore)) return null;

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
        getScoreStyle(numScore),
        className
      )}
    >
      {Math.round(numScore)}
    </div>
  );
}
