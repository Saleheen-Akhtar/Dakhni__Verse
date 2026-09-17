import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/helpers';
import { getArtistApplications } from '@/lib/queries/artists';
import { ArtistReviewClient } from '@/components/artists/artist-review-client';

export const metadata: Metadata = {
  title: 'Artist Applications Review | Dakhni Verse',
  description: 'Review and manage incoming artist intake applications.',
};

export default async function ArtistReviewPage() {
  await requireRole(['Manager']);

  const [pending, rejected] = await Promise.all([
    getArtistApplications('Pending'),
    getArtistApplications('Rejected'),
  ]);

  return (
    <div className="py-6">
      <ArtistReviewClient
        initialPending={pending}
        initialRejected={rejected}
      />
    </div>
  );
}
