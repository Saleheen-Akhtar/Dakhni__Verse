"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils/format';

export function ReleaseList({ releases, artists }: { releases: any[]; artists: any[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [artistFilter, setArtistFilter] = useState('all');

  const filtered = releases.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (artistFilter !== 'all' && r.artist_id !== artistFilter) return false;
    return true;
  });

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
    { header: 'Artist', accessorKey: 'artist.name', cell: ({ row }: any) => row.original.artist?.stage_name || row.original.artist?.name || '-' },
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
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
          </SelectContent>
        </Select>
        <Select value={artistFilter} onValueChange={setArtistFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No releases yet" description="Releases will appear here once added." />
      ) : (
        <DataTable 
          columns={columns} 
          data={filtered} 
          onRowClick={(row) => router.push(`/releases/${row.id}`)}
        />
      )}
    </div>
  );
}
