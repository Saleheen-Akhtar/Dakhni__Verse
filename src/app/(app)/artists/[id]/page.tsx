import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtistById, getArtistStats } from '@/lib/queries/artists';
import { getArtistKPIs } from '@/lib/calculations/artist-kpi';
import { getLinkedUserForArtist } from '@/lib/auth/artist-login-actions';
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

  const [stats, kpis, linkedUser] = await Promise.all([
    getArtistStats(id),
    getArtistKPIs(id),
    getLinkedUserForArtist(id),
  ]);
  
  const isManager = user?.role === 'Manager';
  const canEdit = isManager || user?.artist_id === artist.id;
  const canDelete = isManager;

  return (
    <ArtistProfile 
      artist={artist} 
      stats={stats} 
      kpis={kpis} 
      canEdit={canEdit}
      canDelete={canDelete}
      isManager={isManager}
      linkedUser={linkedUser}
    />
  );
}
