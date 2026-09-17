import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtists, getPendingApplicationsCount } from '@/lib/queries/artists';
import { PageHeader } from '@/components/ui/page-header';
import { ArtistDirectory } from '@/components/artists/artist-directory';
import { ShareArtistFormButton } from '@/components/artists/share-artist-form-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [profile, artists, pendingCount] = await Promise.all([
    getCurrentUserProfile(),
    getArtists({
      search: params?.search,
      status: params?.status,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 48,
    }),
    getPendingApplicationsCount(),
  ]);

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <ShareArtistFormButton />
      {profile?.role === 'Manager' && (
        <>
          <Button asChild variant="outline" className="relative border-neutral-300 hover:bg-neutral-50">
            <Link href="/artists/review" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#D71920]" />
              <span>Review Applications</span>
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-[#D71920] rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/artists/new">Add Artist</Link>
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Artists" subtitle="Manage collective members" actions={actions} />
      <ArtistDirectory 
        artists={artists} 
        userRole={profile?.role}
        initialSearch={params?.search || ''}
        initialStatus={params?.status || 'All'}
      />
    </div>
  );
}
