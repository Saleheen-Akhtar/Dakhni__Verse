import { getArtistOptions } from '@/lib/queries/releases';
import { getProjects } from '@/lib/queries/projects';
import { ReleaseForm } from '@/components/releases/release-form';

export default async function NewReleasePage() {
  const [artists, projects] = await Promise.all([
    getArtistOptions(),
    getProjects(),
  ]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Add New Release</h1>
      <ReleaseForm artists={artists} projects={projects} />
    </div>
  );
}
