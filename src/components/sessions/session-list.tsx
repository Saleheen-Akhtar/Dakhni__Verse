"use client";
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDuration } from '@/lib/utils/format';

export function SessionList({ sessions, artists }: { sessions: any[]; artists: any[] }) {
  const [artistFilter, setArtistFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = sessions.filter(s => {
    if (artistFilter !== 'all' && s.artist_id !== artistFilter) return false;
    if (typeFilter !== 'all' && s.session_type !== typeFilter) return false;
    if (dateFrom && new Date(s.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.date) > new Date(dateTo)) return false;
    return true;
  });

  const columns = [
    { header: 'Date', accessorKey: 'date', cell: ({ row }: any) => formatDate(row.original.session_date || row.original.date) },
    { header: 'Artist', accessorKey: 'artist.name', cell: ({ row }: any) => row.original.artist?.stage_name || row.original.artist?.name || '-' },
    { header: 'Project', accessorKey: 'project.title', cell: ({ row }: any) => row.original.project?.title || '-' },
    { header: 'Type', accessorKey: 'session_type' },
    { header: 'Duration', accessorKey: 'duration_minutes', cell: ({ row }: any) => formatDuration(row.original.duration_minutes || 0) },
    { header: 'Engineer', accessorKey: 'engineer.name', cell: ({ row }: any) => row.original.engineer?.stage_name || row.original.engineer?.name || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Select value={artistFilter} onValueChange={setArtistFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['Recording', 'Mixing', 'Writing', 'Production', 'Mastering', 'Rehearsal', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
          <span>to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No sessions recorded" description="Studio activity will appear here." />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}
