"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
  let badgeVariant: "success" | "warning" | "secondary" | "default" = "default";
  if (artist.status === 'Active') badgeVariant = "success";
  if (artist.status === 'Inactive') badgeVariant = "warning";
  if (artist.status === 'Left') badgeVariant = "secondary";

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <Avatar 
          src={artist.profile_image_url} 
          fallback={artist.stage_name?.substring(0, 2).toUpperCase()} 
          size="lg" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="font-display font-bold text-lg truncate">{artist.stage_name}</h3>
            <Badge variant={badgeVariant}>{artist.status}</Badge>
          </div>
          <p className="text-sm text-secondary-foreground truncate mb-2">{artist.dakhni_verse_role || 'Artist'}</p>
          {artist.date_joined && (
            <p className="text-xs text-secondary-foreground">Joined {formatDate(artist.date_joined)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
