import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagList } from '@/components/common/Tag';
import { BulkVendorImport } from '@/components/rfp/BulkVendorImport';
import { formatRatingSafe } from '@/lib/formatUtils';
import { Vendor } from '@/types';
import { Check, Plus, Send, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSend: () => void;
  onAddVendor: (vendor: { name: string; email: string; tags: string }) => void;
  isSending?: boolean;
}

export function VendorSelector({
  vendors,
  selectedIds,
  onSelectionChange,
  onSend,
  onAddVendor,
  isSending = false,
}: VendorSelectorProps) {
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', email: '', tags: '' });

  const toggleVendor = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((v) => v !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleAddVendor = () => {
    if (!newVendor.name || !newVendor.email) return;
    onAddVendor(newVendor);
    setNewVendor({ name: '', email: '', tags: '' });
    setIsAddingVendor(false);
  };

  const handleBulkImport = async (importedVendors: Array<{ name: string; email: string; tags: string }>) => {
    for (const vendor of importedVendors) {
      onAddVendor(vendor);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-4">
        <CardTitle className="text-lg">Select Vendors</CardTitle>
        <div className="flex items-center gap-3 w-full justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2 items-center">
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold mb-1">Bulk Import Vendors</span>
              <BulkVendorImport onVendorsImported={handleBulkImport} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingVendor(!isAddingVendor)}
            >
              {isAddingVendor ? (
                <>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" /> Add Vendor
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Vendor Form */}
        {isAddingVendor && (
          <div className="p-4 bg-muted rounded-lg border border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Vendor Name</Label>
                <Input
                  id="vendor-name"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-email">Email Address</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  placeholder="contact@acme.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-tags">Tags (comma separated)</Label>
              <Input
                id="vendor-tags"
                value={newVendor.tags}
                onChange={(e) => setNewVendor({ ...newVendor, tags: e.target.value })}
                placeholder="e.g. Premium, Fast, Hardware"
              />
            </div>
            <Button
              onClick={handleAddVendor}
              disabled={!newVendor.name || !newVendor.email}
            >
              <Plus className="h-4 w-4 mr-1" /> Save & Select Vendor
            </Button>
          </div>
        )}

        {/* Vendor List */}
        <div className="border border-border rounded-lg divide-y divide-border max-h-[400px] overflow-y-auto">
          {vendors.map((vendor) => {
            const isSelected = selectedIds.includes(vendor.id);
            return (
              <div
                key={vendor.id}
                onClick={() => toggleVendor(vendor.id)}
                className={cn(
                  'flex items-center justify-between p-4 cursor-pointer transition-colors',
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-input bg-background'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{vendor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TagList tags={vendor.tags} />
                  {vendor.rating !== null && vendor.rating !== undefined && (
                    <div className="flex items-center gap-1 text-sm font-medium text-warning bg-warning/10 px-2 py-1 rounded">
                      <Star className="h-3 w-3 fill-current" />
                      {formatRatingSafe(vendor.rating, 1)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Send Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={onSend}
            disabled={selectedIds.length === 0 || isSending}
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            Send RFP to {selectedIds.length} Vendor{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
