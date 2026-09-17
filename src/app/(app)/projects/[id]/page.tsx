import { getProjectById, getProjectStatusHistory } from '@/lib/queries/projects';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { ProjectDetail } from '@/components/projects/project-detail';
import { notFound } from 'next/navigation';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, project, history] = await Promise.all([
    getCurrentUserProfile(),
    getProjectById(id),
    getProjectStatusHistory(id),
  ]);
  
  if (!project) notFound();

  const isManager = user?.role === 'Manager';

  return (
    <div className="py-6">
      <ProjectDetail project={project} history={history} isManager={isManager} />
    </div>
  );
}
