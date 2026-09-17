import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { getProjects, getArtistOptions } from '@/lib/queries/projects';
import { PageHeader } from '@/components/ui/page-header';
import { ProjectList } from '@/components/projects/project-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function ProjectsPage() {
  await requireAuth();
  const user = await getCurrentUserProfile();
  const isManager = user?.role === 'Manager';
  const projects = await getProjects();
  const artists = await getArtistOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Projects" description="Track music production" />
        {isManager && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Link>
          </Button>
        )}
      </div>
      <ProjectList projects={projects} artists={artists} />
    </div>
  );
}
