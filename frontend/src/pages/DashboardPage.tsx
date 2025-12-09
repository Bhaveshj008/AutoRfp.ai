import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRfps } from '@/hooks/useRfps';
import { useVendors } from '@/hooks/useVendors';
import { FileText, Users, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { formatCurrencySafe, getSafeLengthSafe } from '@/lib/formatUtils';
import { safeArray, safeGet } from '@/lib/errorUtils';

export default function DashboardPage() {
  const { data: rfps = [], isLoading: rfpsLoading } = useRfps();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();

  const safeRfps = safeArray(rfps, []);
  const safeVendors = safeArray(vendors, []);

  const stats = [
    {
      title: 'Total RFPs',
      value: getSafeLengthSafe(safeRfps, 0),
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Vendors',
      value: getSafeLengthSafe(safeVendors, 0),
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'In Progress',
      value: safeRfps.filter((r) => safeGet(r, 'status') === 'sent' || safeGet(r, 'status') === 'evaluating').length,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Closed',
      value: safeRfps.filter((r) => safeGet(r, 'status') === 'closed').length,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const recentRfps = safeRfps.slice(0, 5);

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back!</h2>
            <p className="text-muted-foreground">
              Here's an overview of your RFP activity.
            </p>
          </div>
          <Button asChild>
            <Link to="/rfps/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New RFP
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">
                      {rfpsLoading || vendorsLoading ? '...' : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent RFPs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent RFPs</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/rfps">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {rfpsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentRfps.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No RFPs yet</p>
                <Button asChild>
                  <Link to="/rfps/new">Create Your First RFP</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRfps.map((rfp) => (
                  <Link
                    key={rfp.id}
                    to={`/rfps/${rfp.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{safeGet(rfp, 'title', 'Untitled RFP')}</p>
                        <p className="text-sm text-muted-foreground">
                          Budget: {formatCurrencySafe(safeGet(rfp, 'budget_cap'), safeGet(rfp, 'currency_code'))}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {safeGet(rfp, 'status', 'unknown')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <Link to="/rfps/new">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Create RFP</p>
                  <p className="text-sm text-muted-foreground">
                    Use AI to draft a new RFP
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <Link to="/vendors">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="font-semibold">Manage Vendors</p>
                  <p className="text-sm text-muted-foreground">
                    View and add vendors
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <Link to="/rfps">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="font-semibold">View All RFPs</p>
                  <p className="text-sm text-muted-foreground">
                    Track your procurement
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
