import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtists } from '@/lib/queries/artists';
import { PageHeader } from '@/components/ui/page-header';
import { ArtistDirectory } from '@/components/artists/artist-directory';
import { ShareArtistFormButton } from '@/components/artists/share-artist-form-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ArtistsPage() {
  const [profile, artists] = await Promise.all([
    getCurrentUserProfile(),
    getArtists(),
  ]);

  const actions = (
    <div className="flex items-center gap-3">
      <ShareArtistFormButton />
      {profile?.role === 'Manager' && (
        <Button asChild>
          <Link href="/artists/new">Add Artist</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Artists" subtitle="Manage collective members" actions={actions} />
      <ArtistDirectory artists={artists} userRole={profile?.role} />
    </div>
  );
}
