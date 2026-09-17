import { requireAuth } from '@/lib/auth/helpers';
import { getSessions, getArtistOptions } from '@/lib/queries/sessions';
import { PageHeader } from '@/components/ui/page-header';
import { SessionList } from '@/components/sessions/session-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function SessionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ artist_id?: string; project_id?: string; session_type?: string; from?: string; to?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [sessions, artists] = await Promise.all([
    getSessions({
      artist_id: params?.artist_id,
      project_id: params?.project_id,
      session_type: params?.session_type,
      from: params?.from,
      to: params?.to,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 50,
    }),
    getArtistOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Sessions" description="Studio session tracking" />
        <Button asChild>
          <Link href="/sessions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Session
          </Link>
        </Button>
      </div>
      <SessionList 
        sessions={sessions} 
        artists={artists}
        initialArtist={params?.artist_id || 'all'}
        initialType={params?.session_type || 'all'}
        initialFrom={params?.from || ''}
        initialTo={params?.to || ''}
        currentPage={params?.page ? Number(params.page) : 1}
      />
    </div>
  );
}
