import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { getProjects, getArtistOptions } from '@/lib/queries/projects';
import { PageHeader } from '@/components/ui/page-header';
import { ProjectList } from '@/components/projects/project-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; artist_id?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [user, projects, artists] = await Promise.all([
    getCurrentUserProfile(),
    getProjects({
      search: params?.search,
      status: params?.status,
      artist_id: params?.artist_id,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 50,
    }),
    getArtistOptions(),
  ]);
  const isManager = user?.role === 'Manager';

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
      <ProjectList 
        projects={projects} 
        artists={artists} 
        initialSearch={params?.search || ''}
        initialStatus={params?.status || 'all'}
        initialArtist={params?.artist_id || 'all'}
        currentPage={params?.page ? Number(params.page) : 1}
      />
    </div>
  );
}
