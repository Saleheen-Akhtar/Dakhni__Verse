import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtistById, getArtistStats } from '@/lib/queries/artists';
import { getArtistKPIs } from '@/lib/calculations/artist-kpi';
import { notFound } from 'next/navigation';
import { ArtistProfile } from '@/components/artists/artist-profile';

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([
    params,
    getCurrentUserProfile(),
  ]);

  const artist = await getArtistById(id);
  if (!artist) {
    notFound();
  }

  const [stats, kpis] = await Promise.all([
    getArtistStats(id),
    getArtistKPIs(id),
  ]);
  
  const canEdit = user?.role === 'Manager' || user?.artist_id === artist.id;
  const canDelete = user?.role === 'Manager';

  return (
    <ArtistProfile 
      artist={artist} 
      stats={stats} 
      kpis={kpis} 
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
