import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TagList } from '@/components/common/Tag';
import { BulkVendorImport } from '@/components/rfp/BulkVendorImport';
import { LoadingState, Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useVendors, useCreateVendor, useDeleteVendor, useUpdateVendor } from '@/hooks/useVendors';
import { formatRatingSafe } from '@/lib/formatUtils';
import { Users, Plus, Search, Star, Trash2, Mail, Edit } from 'lucide-react';

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', email: '', tags: '' });
  const [editingVendor, setEditingVendor] = useState<{ id: string; name: string; email: string; tags: string } | null>(null);

  const { data: vendors = [], isLoading } = useVendors(searchQuery || undefined);
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const handleAddVendor = async () => {
    if (!newVendor.name || !newVendor.email) return;
    
    // Convert comma-separated tags string to array
    const tagsArray = newVendor.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    
    await createMutation.mutateAsync({
      name: newVendor.name,
      email: newVendor.email,
      tags: tagsArray,
    });
    setNewVendor({ name: '', email: '', tags: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendor({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      tags: vendor.tags?.join(', ') || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor || !editingVendor.name || !editingVendor.email) return;
    
    const tagsArray = editingVendor.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    
    await updateMutation.mutateAsync({
      vendor_id: editingVendor.id,
      name: editingVendor.name,
      email: editingVendor.email,
      tags: tagsArray,
    });
    setEditingVendor(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      deleteMutation.mutate(vendorId);
    }
  };

  const handleBulkImport = async (importedVendors: Array<{ name: string; email: string; tags: string }>) => {
    for (const vendor of importedVendors) {
      const tagsArray = vendor.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      
      await createMutation.mutateAsync({
        name: vendor.name,
        email: vendor.email,
        tags: tagsArray,
      });
    }
  };

  return (
    <AppShell title="Vendors">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Vendor Management</h2>
            <p className="text-muted-foreground">
              Manage your vendor database
            </p>
          </div>
          <div className="flex gap-2">
            <BulkVendorImport onVendorsImported={handleBulkImport} />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                  <DialogDescription>
                    Enter the vendor details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Vendor Name</Label>
                    <Input
                      id="name"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newVendor.email}
                      onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                      placeholder="contact@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={newVendor.tags}
                      onChange={(e) => setNewVendor({ ...newVendor, tags: e.target.value })}
                      placeholder="e.g. Premium, Fast, Hardware"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddVendor}
                    disabled={!newVendor.name || !newVendor.email || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Vendor'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Vendor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>
                Update the vendor details below.
              </DialogDescription>
            </DialogHeader>
            {editingVendor && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Vendor Name</Label>
                  <Input
                    id="edit-name"
                    value={editingVendor.name}
                    onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingVendor.email}
                    onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                    placeholder="contact@acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                  <Input
                    id="edit-tags"
                    value={editingVendor.tags}
                    onChange={(e) => setEditingVendor({ ...editingVendor, tags: e.target.value })}
                    placeholder="e.g. Premium, Fast, Hardware"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateVendor}
                disabled={!editingVendor || !editingVendor.name || !editingVendor.email || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Vendor'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vendors Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Vendors ({vendors.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingState message="Loading vendors..." />
            ) : vendors.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery ? 'No vendors found' : 'No vendors yet'}
                description={
                  searchQuery
                    ? 'Try adjusting your search query'
                    : 'Add your first vendor to get started'
                }
                action={
                  !searchQuery
                    ? {
                        label: 'Add Vendor',
                        onClick: () => setIsAddDialogOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="border-0 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Vendor</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Tags</TableHead>
                      <TableHead className="font-semibold">Rating</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-info/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-info" />
                            </div>
                            <span className="font-medium">{vendor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {vendor.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TagList tags={vendor.tags} />
                        </TableCell>
                        <TableCell>
                          {vendor.rating !== null && vendor.rating !== undefined && (
                            <div className="flex items-center gap-1 text-sm font-medium text-warning">
                              <Star className="h-4 w-4 fill-current" />
                              {formatRatingSafe(vendor.rating, 1)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVendor(vendor)}
                              disabled={updateMutation.isPending}
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVendor(vendor.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
