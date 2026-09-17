"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils/format';

import { SearchInput } from '@/components/ui/search-input';

interface ReleaseListProps {
  releases: any[];
  artists: any[];
  initialSearch?: string;
  initialStatus?: string;
  initialArtist?: string;
  currentPage?: number;
  pageSize?: number;
}

export function ReleaseList({
  releases,
  artists,
  initialSearch = '',
  initialStatus = 'all',
  initialArtist = 'all',
  currentPage = 1,
  pageSize = 50,
}: ReleaseListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [artistFilter, setArtistFilter] = useState(initialArtist);

  const updateFilters = (newSearch: string, newStatus: string, newArtist: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newStatus && newStatus !== 'all') params.set('status', newStatus);
    if (newArtist && newArtist !== 'all') params.set('artist_id', newArtist);
    if (newPage > 1) params.set('page', String(newPage));
    const qs = params.toString();
    router.replace(`/releases${qs ? `?${qs}` : ''}`);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateFilters(val, statusFilter, artistFilter, 1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    updateFilters(search, val, artistFilter, 1);
  };

  const handleArtistChange = (val: string) => {
    setArtistFilter(val);
    updateFilters(search, statusFilter, val, 1);
  };

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'Planned': return 'secondary';
      case 'Scheduled': return 'warning';
      case 'Released': return 'success';
      default: return 'outline';
    }
  };

  const columns = [
    { header: 'Title', accessorKey: 'title' },
    { 
      header: 'Artist', 
      accessorKey: 'artist.stage_name', 
      cell: ({ row }: any) => row.original.artist?.stage_name || row.original.artist?.name || '-' 
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }: any) => <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge>
    },
    { 
      header: 'Release Date', 
      accessorKey: 'release_date',
      cell: ({ row }: any) => row.original.release_date ? formatDate(row.original.release_date) : '-'
    },
    { header: 'Distributor', accessorKey: 'distributor', cell: ({ row }: any) => row.original.distributor || '-' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          placeholder="Search releases..."
          value={search}
          onChange={(val: any) => handleSearchChange(typeof val === 'string' ? val : val?.target?.value || '')}
          className="w-full sm:w-64"
        />
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
          </SelectContent>
        </Select>
        <Select value={artistFilter} onValueChange={handleArtistChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {releases.length === 0 ? (
        <EmptyState title="No releases yet" description="Releases matching your filters will appear here once added." />
      ) : (
        <DataTable 
          columns={columns} 
          data={releases} 
          onRowClick={(row) => router.push(`/releases/${row.id}`)}
          serverPagination={{
            currentPage,
            pageSize,
            onPageChange: (newPage) => updateFilters(search, statusFilter, artistFilter, newPage),
          }}
        />
      )}
    </div>
  );
}
