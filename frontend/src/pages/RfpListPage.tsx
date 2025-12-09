import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useRfps } from '@/hooks/useRfps';
import { FileText, Plus, Search, Eye } from 'lucide-react';
import { formatCurrencySafe, formatDateSafe } from '@/lib/formatUtils';
import { safeArray, safeGet, safeString } from '@/lib/errorUtils';

export default function RfpListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: rfps = [], isLoading } = useRfps(
    statusFilter !== 'all' ? statusFilter : undefined
  );

  const safeRfps = safeArray(rfps, []);

  const filteredRfps = safeRfps.filter((rfp) => {
    const title = safeGet(rfp, 'title', '');
    return safeString(title).toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AppShell title="RFPs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">RFP List</h2>
            <p className="text-muted-foreground">
              Manage your requests for proposals
            </p>
          </div>
          <Button asChild>
            <Link to="/rfps/new">
              <Plus className="h-4 w-4 mr-2" />
              Create RFP
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFPs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="evaluating">Evaluating</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingState message="Loading RFPs..." />
            ) : filteredRfps.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No RFPs found"
                description={
                  searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first RFP to get started'
                }
                action={
                  !searchQuery && statusFilter === 'all'
                    ? {
                        label: 'Create RFP',
                        onClick: () => window.location.href = '/rfps/new',
                      }
                    : undefined
                }
              />
            ) : (
              <div className="border-0 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Budget</TableHead>
                      <TableHead className="font-semibold">Deadline</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRfps.map((rfp) => (
                      <TableRow key={rfp.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{rfp.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {safeGet(rfp, 'summary', 'No description')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrencySafe(safeGet(rfp, 'budget_cap'), safeGet(rfp, 'currency_code'))}
                        </TableCell>
                        <TableCell>{safeGet(rfp, 'deadline_days') ? `${safeGet(rfp, 'deadline_days')} days` : 'N/A'}</TableCell>
                        <TableCell>
                          <StatusBadge status={(safeGet(rfp, 'status', 'draft') as 'draft' | 'sent' | 'evaluating' | 'closed' | 'pending' | 'awarded' | 'rejected')} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateSafe(safeGet(rfp, 'created_at'))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/rfps/${safeGet(rfp, 'id', '')}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
