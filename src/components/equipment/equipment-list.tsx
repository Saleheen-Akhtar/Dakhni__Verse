"use client";
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';

export function EquipmentList({ equipment }: { equipment: any[] }) {
  const [ownerFilter, setOwnerFilter] = useState('all');

  const filtered = equipment.filter(e => {
    if (ownerFilter !== 'all' && e.owner_type !== ownerFilter) return false;
    return true;
  });

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Brand/Model', accessorKey: 'brand', cell: ({ row }: any) => `${row.original.brand || ''} ${row.original.model || ''}`.trim() || '-' },
    { 
      header: 'Owner Type', 
      accessorKey: 'owner_type',
      cell: ({ row }: any) => <Badge variant={row.original.owner_type === 'Dakhni Verse' ? 'default' : 'secondary'}>{row.original.owner_type}</Badge>
    },
    { header: 'Owner', accessorKey: 'owner.name', cell: ({ row }: any) => row.original.owner?.name || '-' },
    { header: 'Condition', accessorKey: 'condition' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            <SelectItem value="Dakhni Verse">Dakhni Verse</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No equipment recorded" description="Add studio equipment to track inventory." />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}
