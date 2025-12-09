import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RfpItem } from '@/types';

interface RfpItemsTableProps {
  items: RfpItem[];
}

export function RfpItemsTable({ items }: RfpItemsTableProps) {
  return (
    <div className="bg-muted rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Item</TableHead>
            <TableHead className="font-semibold">Specifications</TableHead>
            <TableHead className="text-right font-semibold">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{item.label}</TableCell>
              <TableCell className="text-muted-foreground">{item.specs}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
