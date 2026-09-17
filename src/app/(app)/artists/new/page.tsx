import { requireRole } from '@/lib/auth/helpers';
import { PageHeader } from '@/components/ui/page-header';
import { AddArtistForm } from '@/components/artists/add-artist-form';

export default async function AddArtistPage() {
  await requireRole(['Manager']);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Add Artist" subtitle="Add a new member to the collective" />
      <AddArtistForm />
    </div>
  );
}
