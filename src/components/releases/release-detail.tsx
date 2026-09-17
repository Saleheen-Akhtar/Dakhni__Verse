"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteRelease } from '@/lib/queries/releases';
import { formatDate } from '@/lib/utils/format';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function ReleaseDetail({ release, isManager }: { release: any; isManager: boolean }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteRelease(release.id);
      toast({ title: 'Release deleted' });
      router.push('/releases');
    } catch (err) {
      toast({ title: 'Error deleting release', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-heading">{release.title}</CardTitle>
          <Badge>{release.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary-text">Artist</p>
              <p className="font-medium">{release.artist?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-text">Project</p>
              <p className="font-medium">{release.project?.title || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-text">Release Date</p>
              <p className="font-medium">{release.release_date ? formatDate(release.release_date) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-text">Distributor</p>
              <p className="font-medium">{release.distributor || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-text">ISRC</p>
              <p className="font-medium">{release.isrc || '-'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border-gray">
            <p className="text-sm text-secondary-text font-medium mb-2">Platform Links</p>
            <div className="flex flex-wrap gap-2">
              {release.spotify_url && <Button variant="outline" size="sm" asChild><a href={release.spotify_url} target="_blank" rel="noreferrer">Spotify</a></Button>}
              {release.apple_music_url && <Button variant="outline" size="sm" asChild><a href={release.apple_music_url} target="_blank" rel="noreferrer">Apple Music</a></Button>}
              {release.youtube_url && <Button variant="outline" size="sm" asChild><a href={release.youtube_url} target="_blank" rel="noreferrer">YouTube</a></Button>}
              {(release.other_platform_url || release.other_url) && <Button variant="outline" size="sm" asChild><a href={release.other_platform_url || release.other_url} target="_blank" rel="noreferrer">Other</a></Button>}
              {!release.spotify_url && !release.apple_music_url && !release.youtube_url && !release.other_platform_url && !release.other_url && <p className="text-sm">No links added.</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-border-gray">
            <p className="text-sm text-secondary-text font-medium mb-2">Notes</p>
            <p className="whitespace-pre-wrap">{release.notes || 'No notes added.'}</p>
          </div>
          
          {isManager && (
            <div className="pt-6 border-t border-border-gray flex justify-end">
              <Button variant="destructive" onClick={() => setIsDeleting(true)}>Delete Release</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog 
        open={isDeleting} 
        onOpenChange={setIsDeleting}
        title="Delete Release?"
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
