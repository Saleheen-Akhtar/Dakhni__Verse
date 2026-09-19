import { requireRole } from '@/lib/auth/helpers';
import { getArtistOptions } from '@/lib/queries/sessions';
import { getProjectOptions } from '@/lib/queries/projects';
import { SessionForm } from '@/components/sessions/session-form';

export default async function NewSessionPage() {
  await requireRole(['Manager', 'Producer']);
  const [artists, projects] = await Promise.all([
    getArtistOptions(),
    getProjectOptions(),
  ]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Log New Session</h1>
      <SessionForm artists={artists} projects={projects} />
    </div>
  );
}
