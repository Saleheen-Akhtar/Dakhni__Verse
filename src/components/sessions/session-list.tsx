"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDuration } from '@/lib/utils/format';

interface SessionListProps {
  sessions: any[];
  artists: any[];
  initialArtist?: string;
  initialType?: string;
  initialFrom?: string;
  initialTo?: string;
}

export function SessionList({
  sessions,
  artists,
  initialArtist = 'all',
  initialType = 'all',
  initialFrom = '',
  initialTo = '',
}: SessionListProps) {
  const router = useRouter();
  const [artistFilter, setArtistFilter] = useState(initialArtist);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);

  const updateFilters = (newArtist: string, newType: string, newFrom: string, newTo: string) => {
    const params = new URLSearchParams();
    if (newArtist && newArtist !== 'all') params.set('artist_id', newArtist);
    if (newType && newType !== 'all') params.set('session_type', newType);
    if (newFrom) params.set('from', newFrom);
    if (newTo) params.set('to', newTo);
    const qs = params.toString();
    router.push(`/sessions${qs ? `?${qs}` : ''}`);
  };

  const handleArtistChange = (val: string) => {
    setArtistFilter(val);
    updateFilters(val, typeFilter, dateFrom, dateTo);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    updateFilters(artistFilter, val, dateFrom, dateTo);
  };

  const handleFromChange = (val: string) => {
    setDateFrom(val);
    updateFilters(artistFilter, typeFilter, val, dateTo);
  };

  const handleToChange = (val: string) => {
    setDateTo(val);
    updateFilters(artistFilter, typeFilter, dateFrom, val);
  };

  const filtered = sessions.filter(s => {
    const sDate = s.session_date || s.date;
    if (artistFilter !== 'all' && s.artist_id !== artistFilter) return false;
    if (typeFilter !== 'all' && s.session_type !== typeFilter) return false;
    if (dateFrom && sDate && sDate < dateFrom) return false;
    if (dateTo && sDate && sDate > dateTo) return false;
    return true;
  });

  const columns = [
    { 
      header: 'Date', 
      accessorKey: 'session_date', 
      cell: ({ row }: any) => formatDate(row.original.session_date || row.original.date) 
    },
    { 
      header: 'Artist', 
      accessorKey: 'artist.stage_name', 
      cell: ({ row }: any) => row.original.artist?.stage_name || row.original.artist?.name || '-' 
    },
    { 
      header: 'Project', 
      accessorKey: 'project.title', 
      cell: ({ row }: any) => row.original.project?.title || '-' 
    },
    { header: 'Type', accessorKey: 'session_type' },
    { 
      header: 'Duration', 
      accessorKey: 'duration_minutes', 
      cell: ({ row }: any) => formatDuration(row.original.duration_minutes || 0) 
    },
    { 
      header: 'Engineer', 
      accessorKey: 'engineer.stage_name', 
      cell: ({ row }: any) => row.original.engineer?.stage_name || row.original.engineer?.name || '-' 
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={artistFilter} onValueChange={handleArtistChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['Recording', 'Mixing', 'Writing', 'Production', 'Mastering', 'Rehearsal', 'Other'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={dateFrom} 
            onChange={e => handleFromChange(e.target.value)} 
            className="w-[150px]" 
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input 
            type="date" 
            value={dateTo} 
            onChange={e => handleToChange(e.target.value)} 
            className="w-[150px]" 
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No sessions recorded" description="Studio activity matching your filters will appear here." />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}
