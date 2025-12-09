import { cn } from '@/lib/utils';

interface TagProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'muted';
}

export function Tag({ children, className, variant = 'default' }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-secondary text-secondary-foreground border border-border',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}

interface TagListProps {
  tags: string[];
  className?: string;
}

export function TagList({ tags, className }: TagListProps) {
  if (!tags.length) return null;
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
    </div>
  );
}
