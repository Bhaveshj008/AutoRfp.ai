import { NavLink } from '@/components/NavLink';
import { 
  Cpu, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Plus 
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/rfps', icon: FileText, label: 'RFPs' },
  { to: '/rfps/new', icon: Plus, label: 'Create RFP' },
  { to: '/vendors', icon: Users, label: 'Vendors' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-sidebar-border">
        <Cpu className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold tracking-tight">AutoRFP.ai</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted">
          AI-Powered RFP Management
        </p>
      </div>
    </aside>
  );
}
