import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-foreground">
        {title || 'AutoRFP.ai'}
      </h1>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="gap-2"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4" />
              Light
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Dark
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">Procurement Mgr</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
          PM
        </div>
      </div>
    </header>
  );
}
