import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtistById, getArtistStats } from '@/lib/queries/artists';
import { getArtistKPIs } from '@/lib/calculations/artist-kpi';
import { notFound } from 'next/navigation';
import { ArtistProfile } from '@/components/artists/artist-profile';

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const user = await getCurrentUserProfile();
  
  const artist = await getArtistById(id);
  
  if (!artist) {
    notFound();
  }
  
  const stats = await getArtistStats(id);
  const kpis = await getArtistKPIs(id);
  
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
