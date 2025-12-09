import { cn } from '@/lib/utils';

interface FieldBoxProps {
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
}

export function FieldBox({ label, value, className }: FieldBoxProps) {
  return (
    <div className={cn('bg-muted p-3 rounded-lg border border-border', className)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
        {label}
      </p>
      <p className="text-foreground font-medium">
        {value}
      </p>
    </div>
  );
}
