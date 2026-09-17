import { requireAuth } from '@/lib/auth/helpers';
import { getSessions, getArtistOptions } from '@/lib/queries/sessions';
import { PageHeader } from '@/components/ui/page-header';
import { SessionList } from '@/components/sessions/session-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function SessionsPage() {
  const [sessions, artists] = await Promise.all([
    getSessions(),
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
      <SessionList sessions={sessions} artists={artists} />
    </div>
  );
}
