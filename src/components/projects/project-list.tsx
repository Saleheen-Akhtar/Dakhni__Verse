"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils/format';

interface ProjectListProps {
  projects: any[];
  artists: any[];
  initialSearch?: string;
  initialStatus?: string;
  initialArtist?: string;
}

export function ProjectList({
  projects,
  artists,
  initialSearch = '',
  initialStatus = 'all',
  initialArtist = 'all',
}: ProjectListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [artistFilter, setArtistFilter] = useState(initialArtist);

  const updateFilters = (newSearch: string, newStatus: string, newArtist: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newStatus && newStatus !== 'all') params.set('status', newStatus);
    if (newArtist && newArtist !== 'all') params.set('artist_id', newArtist);
    const qs = params.toString();
    router.push(`/projects${qs ? `?${qs}` : ''}`);
  };

  const filtered = projects.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (artistFilter !== 'all' && p.artist_id !== artistFilter) return false;
    return true;
  });

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'Idea': case 'Writing': return 'secondary';
      case 'Production': case 'Recording': case 'Editing': return 'info';
      case 'Mixing': case 'Mastering': return 'warning';
      case 'Ready': return 'success';
      case 'Released': return 'default';
      case 'On Hold': case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const columns = [
    { header: 'Title', accessorKey: 'title' },
    { 
      header: 'Artist', 
      accessorKey: 'artist.stage_name',
      render: (row: any) => row.artist?.stage_name || row.artist?.name || '-'
    },
    { 
      header: 'Producer', 
      accessorKey: 'producer.stage_name',
      render: (row: any) => row.producer?.stage_name || row.producer?.name || '-'
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }: any) => <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge>
    },
    { 
      header: 'Target Release Date', 
      accessorKey: 'target_release_date',
      cell: ({ row }: any) => row.original.target_release_date ? formatDate(row.original.target_release_date) : '-'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input 
          placeholder="Search by title..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Idea">Idea</SelectItem>
            <SelectItem value="Writing">Writing</SelectItem>
            <SelectItem value="Production">Production</SelectItem>
            <SelectItem value="Recording">Recording</SelectItem>
            <SelectItem value="Editing">Editing</SelectItem>
            <SelectItem value="Mixing">Mixing</SelectItem>
            <SelectItem value="Mastering">Mastering</SelectItem>
            <SelectItem value="Ready">Ready</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={artistFilter} onValueChange={setArtistFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {artists.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.stage_name || a.name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to begin tracking music." />
      ) : (
        <DataTable 
          columns={columns} 
          data={filtered} 
          onRowClick={(row) => router.push(`/projects/${row.id}`)}
        />
      )}
    </div>
  );
}
