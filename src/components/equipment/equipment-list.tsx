"use client";
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';

import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface EquipmentListProps {
  equipment: any[];
  initialSearch?: string;
  initialOwnerType?: string;
}

export function EquipmentList({ 
  equipment,
  initialSearch = '',
  initialOwnerType = 'all',
}: EquipmentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [ownerFilter, setOwnerFilter] = useState(initialOwnerType);

  const updateFilters = (newSearch: string, newOwner: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newOwner && newOwner !== 'all') params.set('owner_type', newOwner);
    const qs = params.toString();
    router.push(`/equipment${qs ? `?${qs}` : ''}`);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateFilters(val, ownerFilter);
  };

  const handleOwnerChange = (val: string) => {
    setOwnerFilter(val);
    updateFilters(search, val);
  };

  const filtered = equipment.filter(e => {
    if (ownerFilter !== 'all' && e.owner_type !== ownerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = e.name?.toLowerCase().includes(q);
      const matchBrand = e.brand?.toLowerCase().includes(q);
      if (!matchName && !matchBrand) return false;
    }
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
    { 
      header: 'Owner', 
      accessorKey: 'owner.stage_name', 
      cell: ({ row }: any) => row.original.owner?.stage_name || row.original.owner?.name || '-' 
    },
    { header: 'Condition', accessorKey: 'condition' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search equipment..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select value={ownerFilter} onValueChange={handleOwnerChange}>
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
