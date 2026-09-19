"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDuration } from '@/lib/utils/format';
import { StudioCalendar } from '@/components/sessions/studio-calendar';
import { SessionReminderDialog } from '@/components/sessions/session-reminder-dialog';
import { SessionDeleteDialog } from '@/components/sessions/session-delete-dialog';
import {
  CalendarDays,
  LayoutList,
  MessageCircle,
  User,
  Music,
  Calendar,
  X,
  Ban,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';

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

function computePresetDates(preset: string): { from: string; to: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'this_week') {
    const curr = new Date(now);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: monday.toISOString().split('T')[0],
      to: sunday.toISOString().split('T')[0],
    };
  }
  if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: firstDay.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0],
    };
  }
  if (preset === 'upcoming') {
    return { from: todayStr, to: '' };
  }
  return { from: '', to: '' };
}

function detectDatePreset(from: string, to: string): string {
  if (!from && !to) return 'all';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (from === todayStr && to === todayStr) return 'today';

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  if (from === firstDay && to === lastDay) return 'this_month';

  const curr = new Date(now);
  const day = curr.getDay();
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff)).toISOString().split('T')[0];
  const sunday = new Date(new Date(monday).setDate(new Date(monday).getDate() + 6)).toISOString().split('T')[0];
  if (from === monday && to === sunday) return 'this_week';

  if (from === todayStr && !to) return 'upcoming';

  return 'custom';
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
  const [datePreset, setDatePreset] = useState<string>(() => detectDatePreset(initialFrom, initialTo));
  const [showCustomDates, setShowCustomDates] = useState(datePreset === 'custom');
  const [view, setView] = useState<'calendar' | 'table'>('calendar');
  const [reminderSession, setReminderSession] = useState<any | null>(null);
  const [actionSession, setActionSession] = useState<any | null>(null);

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

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomDates(true);
      return;
    }
    setShowCustomDates(false);
    const { from, to } = computePresetDates(preset);
    setDateFrom(from);
    setDateTo(to);
    updateFilters(artistFilter, typeFilter, from, to, 1);
  };

  const handleCustomFromChange = (val: string) => {
    setDateFrom(val);
    updateFilters(artistFilter, typeFilter, val, dateTo, 1);
  };

  const handleCustomToChange = (val: string) => {
    setDateTo(val);
    updateFilters(artistFilter, typeFilter, dateFrom, val, 1);
  };

  const handleClearAllFilters = () => {
    setArtistFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setDatePreset('all');
    setShowCustomDates(false);
    updateFilters('all', 'all', '', '', 1);
  };

  const activeFilterCount =
    (artistFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (dateFrom || dateTo || (datePreset !== 'all' && datePreset !== 'custom') ? 1 : 0);

  const columns = [
    { 
      header: 'Date & Time', 
      accessorKey: 'session_date', 
      cell: ({ row }: any) => {
        const isCancelled = row.original.notes?.includes('[CANCELLED]');
        return (
          <div className={isCancelled ? 'opacity-60 line-through' : ''}>
            <p className="font-semibold text-neutral-900">{formatDate(row.original.session_date || row.original.date)}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.start_time?.substring(0, 5)} - {row.original.end_time?.substring(0, 5)}
            </p>
          </div>
        );
      }
    },
    {
      header: 'Status',
      id: 'status',
      cell: ({ row }: any) => {
        const isCancelled = row.original.notes?.includes('[CANCELLED]');
        return isCancelled ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Ban className="h-3 w-3" />
            Cancelled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      }
    },
    { 
      header: 'Artist', 
      accessorKey: 'artist.stage_name', 
      cell: ({ row }: any) => (
        <span className="font-medium text-neutral-900">
          {row.original.artist?.stage_name || row.original.artist?.name || '-'}
        </span>
      )
    },
    { 
      header: 'Project', 
      accessorKey: 'project.title', 
      cell: ({ row }: any) => row.original.project?.title || '-' 
    },
    { 
      header: 'Type', 
      accessorKey: 'session_type',
      cell: ({ row }: any) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
          {row.original.session_type}
        </span>
      )
    },
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
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: any) => {
        const session = row.original;
        const isCancelled = session.notes?.includes('[CANCELLED]');
        return (
          <div className="flex items-center gap-2">
            {!isCancelled && (
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
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActionSession(session);
              }}
              title={isCancelled ? "Restore or Delete Session" : "Cancel or Delete Session"}
              className={`inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-semibold border transition-colors ${
                isCancelled
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300"
                  : "bg-neutral-50 text-neutral-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border-neutral-200"
              }`}
            >
              {isCancelled ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-500" />
                  <span>Cancel</span>
                </>
              )}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Ultra-Clean Single Line Filter Bar */}
      <div className="bg-white rounded-xl border border-border px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between gap-2.5 overflow-x-auto">
          {/* Left: Filters strictly side by side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Artist Filter */}
            <Select value={artistFilter} onValueChange={handleArtistChange} className="w-auto shrink-0">
              <SelectTrigger className="w-[145px] h-8 text-xs font-medium bg-neutral-50 hover:bg-neutral-100 border-neutral-200">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Artists" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artists</SelectItem>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.stage_name || a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Session Type Filter */}
            <Select value={typeFilter} onValueChange={handleTypeChange} className="w-auto shrink-0">
              <SelectTrigger className="w-[135px] h-8 text-xs font-medium bg-neutral-50 hover:bg-neutral-100 border-neutral-200">
                <div className="flex items-center gap-1.5 truncate">
                  <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {['Recording', 'Mixing', 'Writing', 'Production', 'Mastering', 'Rehearsal', 'Other'].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Preset Filter */}
            <Select value={datePreset} onValueChange={handlePresetChange} className="w-auto shrink-0">
              <SelectTrigger className="w-[145px] h-8 text-xs font-medium bg-neutral-50 hover:bg-neutral-100 border-neutral-200">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Dates" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear All Filters Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-8 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 rounded-md transition-colors shrink-0"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reset ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Right: View Toggle */}
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-muted-foreground shrink-0 border border-neutral-200/80">
            <button
              onClick={() => setView('calendar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                view === 'calendar'
                  ? 'bg-white text-foreground shadow-xs'
                  : 'hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#D71920]" />
              Calendar View
            </button>
            <button
              onClick={() => setView('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                view === 'table'
                  ? 'bg-white text-foreground shadow-xs'
                  : 'hover:text-foreground'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Table View
            </button>
          </div>
        </div>

        {/* Expandable Custom Date Range Selector */}
        {showCustomDates && (
          <div className="pt-2 border-t border-dashed border-neutral-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-neutral-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#D71920]" />
              Custom Range:
            </span>
            <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-200">
              <span className="text-neutral-500 font-medium">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleCustomFromChange(e.target.value)}
                className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <span className="text-neutral-500 font-medium ml-1">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleCustomToChange(e.target.value)}
                className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => handlePresetChange('all')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 ml-1 rounded hover:bg-neutral-200/50"
                  title="Clear custom dates"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main View Area */}
      {view === 'calendar' ? (
        <StudioCalendar
          sessions={sessions}
          artists={artists}
          selectedArtist={artistFilter}
          selectedType={typeFilter}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions recorded"
          description="No studio sessions match the selected filters."
        />
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

      {/* Cancel or Delete Session Modal */}
      <SessionDeleteDialog
        session={actionSession}
        open={Boolean(actionSession)}
        onOpenChange={(open) => !open && setActionSession(null)}
        onSuccess={() => {
          setActionSession(null);
          router.refresh();
        }}
      />
    </div>
  );
}
