import { requireRole } from '@/lib/auth/helpers';
import { getArtistOptions } from '@/lib/queries/projects';
import { ProjectForm } from '@/components/projects/project-form';

export default async function NewProjectPage() {
  await requireRole(['Manager']);
  const artists = await getArtistOptions();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Create New Project</h1>
      <ProjectForm artists={artists} />
    </div>
  );
}
