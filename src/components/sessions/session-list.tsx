"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDuration } from '@/lib/utils/format';
import { StudioCalendar } from '@/components/sessions/studio-calendar';
import { SessionReminderDialog } from '@/components/sessions/session-reminder-dialog';
import { CalendarDays, LayoutList, MessageCircle } from 'lucide-react';

interface SessionListProps {
  sessions: any[];
  artists: any[];
  initialArtist?: string;
  initialType?: string;
  initialFrom?: string;
  initialTo?: string;
  currentPage?: number;
  pageSize?: number;
}

export function SessionList({
  sessions,
  artists,
  initialArtist = 'all',
  initialType = 'all',
  initialFrom = '',
  initialTo = '',
  currentPage = 1,
  pageSize = 25,
}: SessionListProps) {
  const router = useRouter();
  const [artistFilter, setArtistFilter] = useState(initialArtist);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [view, setView] = useState<'calendar' | 'table'>('calendar');
  const [reminderSession, setReminderSession] = useState<any | null>(null);

  const updateFilters = (newArtist: string, newType: string, newFrom: string, newTo: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    if (newArtist && newArtist !== 'all') params.set('artist_id', newArtist);
    if (newType && newType !== 'all') params.set('session_type', newType);
    if (newFrom) params.set('from', newFrom);
    if (newTo) params.set('to', newTo);
    if (newPage > 1) params.set('page', String(newPage));
    const qs = params.toString();
    router.replace(`/sessions${qs ? `?${qs}` : ''}`);
  };

  const handleArtistChange = (val: string) => {
    setArtistFilter(val);
    updateFilters(val, typeFilter, dateFrom, dateTo, 1);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    updateFilters(artistFilter, val, dateFrom, dateTo, 1);
  };

  const handleFromChange = (val: string) => {
    setDateFrom(val);
    updateFilters(artistFilter, typeFilter, val, dateTo, 1);
  };

  const handleToChange = (val: string) => {
    setDateTo(val);
    updateFilters(artistFilter, typeFilter, dateFrom, val, 1);
  };

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
    {
      header: 'Reminder',
      id: 'actions',
      cell: ({ row }: any) => {
        const session = row.original;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setReminderSession(session);
            }}
            title="Send WhatsApp Session Reminder"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 transition-colors shadow-2xs"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={artistFilter} onValueChange={handleArtistChange}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Artists" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artists</SelectItem>
              {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.stage_name || a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
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
              className="w-[140px]" 
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={e => handleToChange(e.target.value)} 
              className="w-[140px]" 
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg bg-muted p-1 text-muted-foreground shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              view === 'calendar'
                ? 'bg-white text-foreground shadow-sm'
                : 'hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-4 w-4 text-[#D71920]" />
            Calendar View
          </button>
          <button
            onClick={() => setView('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              view === 'table'
                ? 'bg-white text-foreground shadow-sm'
                : 'hover:text-foreground'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            Table View
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <StudioCalendar
          sessions={sessions}
          artists={artists}
          selectedArtist={artistFilter}
          selectedType={typeFilter}
        />
      ) : sessions.length === 0 ? (
        <EmptyState title="No sessions recorded" description="Studio activity matching your filters will appear here." />
      ) : (
        <DataTable 
          columns={columns} 
          data={sessions} 
          serverPagination={{
            currentPage,
            pageSize,
            totalCount: (sessions as any).totalCount,
            onPageChange: (newPage) => updateFilters(artistFilter, typeFilter, dateFrom, dateTo, newPage),
          }}
        />
      )}

      {/* WhatsApp Session Reminder Modal */}
      <SessionReminderDialog
        session={reminderSession}
        onClose={() => setReminderSession(null)}
      />
    </div>
  );
}
