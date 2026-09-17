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
}

export function ArtistDirectory({
  artists,
  userRole,
  initialSearch = '',
  initialStatus = 'All',
}: ArtistDirectoryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const updateUrl = (search: string, status: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'All') params.set('status', status);
    const qs = params.toString();
    router.push(`/artists${qs ? `?${qs}` : ''}`);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    updateUrl(searchQuery, status);
  };

  const filteredArtists = artists.filter((artist) => {
    const matchesSearch = artist.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          artist.legal_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || artist.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', ...ARTIST_STATUSES];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-96">
          <SearchInput 
            value={searchQuery} 
            onChange={(e: any) => {
              const val = typeof e === 'string' ? e : e?.target?.value || '';
              setSearchQuery(val);
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

      {filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtists.map(artist => (
            <ArtistCard key={artist.id} artist={artist} onClick={() => router.push(`/artists/${artist.id}`)} />
          ))}
        </div>
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
