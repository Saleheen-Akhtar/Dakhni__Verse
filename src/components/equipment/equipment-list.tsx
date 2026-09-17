"use client";
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';

import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/ui/search-input';

interface EquipmentListProps {
  equipment: any[];
  initialSearch?: string;
  initialOwnerType?: string;
  currentPage?: number;
  pageSize?: number;
}

export function EquipmentList({
  equipment,
  initialSearch = '',
  initialOwnerType = 'all',
  currentPage = 1,
  pageSize = 50,
}: EquipmentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [ownerFilter, setOwnerFilter] = useState(initialOwnerType);

  const updateFilters = (newSearch: string, newOwner: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newOwner && newOwner !== 'all') params.set('owner_type', newOwner);
    if (newPage > 1) params.set('page', String(newPage));
    const qs = params.toString();
    router.replace(`/equipment${qs ? `?${qs}` : ''}`);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateFilters(val, ownerFilter, 1);
  };

  const handleOwnerChange = (val: string) => {
    setOwnerFilter(val);
    updateFilters(search, val, 1);
  };

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
        <SearchInput
          placeholder="Search equipment..."
          value={search}
          onChange={(val: any) => handleSearchChange(typeof val === 'string' ? val : val?.target?.value || '')}
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

      {equipment.length === 0 ? (
        <EmptyState title="No equipment recorded" description="Add studio equipment to track inventory." />
      ) : (
        <DataTable 
          columns={columns} 
          data={equipment} 
          serverPagination={{
            currentPage,
            pageSize,
            totalCount: (equipment as any).totalCount,
            onPageChange: (newPage) => updateFilters(search, ownerFilter, newPage),
          }}
        />
      )}
    </div>
  );
}
