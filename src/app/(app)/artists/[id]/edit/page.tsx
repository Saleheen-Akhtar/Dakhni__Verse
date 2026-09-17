import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { getArtistById } from '@/lib/queries/artists';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { EditArtistForm } from '@/components/artists/edit-artist-form';

export default async function EditArtistPage({
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

  // Authorization check
  const canEdit = user?.role === 'Manager' || user?.artist_id === artist.id;
  if (!canEdit) {
    redirect(`/artists/${id}`);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title={`Edit ${artist.stage_name}`}
        subtitle="Update artist profile, musical attributes, and social links"
      />
      <EditArtistForm artist={artist} />
    </div>
  );
}
