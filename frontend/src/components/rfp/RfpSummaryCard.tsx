import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldBox } from '@/components/common/FieldBox';
import { RfpItemsTable } from './RfpItemsTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Rfp, RfpStructured } from '@/types';
import { FileText } from 'lucide-react';
import { formatCurrencySafe } from '@/lib/formatUtils';
import { safeGet, safeString } from '@/lib/errorUtils';

interface RfpSummaryCardProps {
  rfp: Rfp | RfpStructured;
  showStatus?: boolean;
}

function isRfp(rfp: Rfp | RfpStructured): rfp is Rfp {
  return 'id' in rfp && 'status' in rfp;
}

export function RfpSummaryCard({ rfp, showStatus = false }: RfpSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{safeGet(rfp, 'title', 'Untitled RFP')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{safeGet(rfp, 'summary', 'No description')}</p>
          </div>
        </div>
        {showStatus && isRfp(rfp) && <StatusBadge status={(safeGet(rfp, 'status', 'draft') as 'draft' | 'sent' | 'evaluating' | 'closed' | 'pending' | 'awarded' | 'rejected')} />}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FieldBox 
            label="Budget Cap" 
            value={formatCurrencySafe(safeGet(rfp, 'budget_cap'), safeGet(rfp, 'currency_code'))} 
          />
          <FieldBox 
            label="Delivery Deadline" 
            value={safeGet(rfp, 'deadline_days') ? `${safeGet(rfp, 'deadline_days')} Days` : 'N/A'} 
          />
          <FieldBox 
            label="Payment Terms" 
            value={safeGet(rfp, 'payment_terms', 'N/A')} 
          />
          <FieldBox 
            label="Min Warranty" 
            value={safeGet(rfp, 'min_warranty_months') ? `${safeGet(rfp, 'min_warranty_months')} Month(s)` : 'N/A'} 
          />
        </div>
        
        {'items' in rfp && safeGet(rfp, 'items') && safeGet(rfp, 'items', []).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              Line Items
            </h4>
            <RfpItemsTable items={safeGet(rfp, 'items', [])} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
