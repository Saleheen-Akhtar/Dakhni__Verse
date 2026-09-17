import { requireAuth } from '@/lib/auth/helpers';
import { getArtistOptions } from '@/lib/queries/equipment';
import { EquipmentForm } from '@/components/equipment/equipment-form';

export default async function NewEquipmentPage() {
  await requireAuth();
  const artists = await getArtistOptions();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Add Equipment</h1>
      <EquipmentForm artists={artists} />
    </div>
  );
}
