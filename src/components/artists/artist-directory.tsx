"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ArtistCard } from '@/components/artists/artist-card';
import { ARTIST_STATUSES } from '@/lib/utils/constants';

interface ArtistDirectoryProps {
  artists: any[];
  userRole?: string;
  initialSearch?: string;
  initialStatus?: string;
  currentPage?: number;
  pageSize?: number;
}

export function ArtistDirectory({
  artists,
  userRole,
  initialSearch = '',
  initialStatus = 'All',
  currentPage = 1,
  pageSize = 24,
}: ArtistDirectoryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const updateUrl = (search: string, status: string, page: number = 1) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'All') params.set('status', status);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(`/artists${qs ? `?${qs}` : ''}`);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    updateUrl(searchQuery, status, 1);
  };

  const statuses = ['All', ...ARTIST_STATUSES];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-96">
          <SearchInput 
            value={searchQuery} 
            onChange={(val: any) => {
              const strVal = typeof val === 'string' ? val : val?.target?.value || '';
              setSearchQuery(strVal);
              updateUrl(strVal, statusFilter);
            }} 
            placeholder="Search artists..." 
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {statuses.map(status => (
            <Button 
              key={status} 
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => handleStatusChange(status)}
              size="sm"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {artists.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map(artist => (
              <ArtistCard key={artist.id} artist={artist} onClick={() => router.push(`/artists/${artist.id}`)} />
            ))}
          </div>

          {(() => {
            const totalCount = (artists as any).totalCount ?? artists.length;
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            const startIdx = artists.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
            const endIdx = Math.min(startIdx + artists.length - 1, totalCount);

            return (currentPage > 1 || totalCount > pageSize) ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
                  <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalCount}</span> artists (Page {currentPage} of {totalPages})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => updateUrl(searchQuery, statusFilter, currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => updateUrl(searchQuery, statusFilter, currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null;
          })()}
        </>
      ) : (
        <EmptyState 
          title="No artists yet" 
          description={
            searchQuery || statusFilter !== 'All' 
              ? "No artists found matching your filters."
              : "Add the first artist to begin building the collective."
          }
        />
      )}
    </div>
  );
}
