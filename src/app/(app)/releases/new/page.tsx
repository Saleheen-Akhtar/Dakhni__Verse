import { requireRole } from '@/lib/auth/helpers';
import { getArtistOptions } from '@/lib/queries/releases';
import { getProjectOptions } from '@/lib/queries/projects';
import { ReleaseForm } from '@/components/releases/release-form';

export default async function NewReleasePage() {
  await requireRole(['Manager']);
  const [artists, projects] = await Promise.all([
    getArtistOptions(),
    getProjectOptions(),
  ]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Add New Release</h1>
      <ReleaseForm artists={artists} projects={projects} />
    </div>
  );
}
