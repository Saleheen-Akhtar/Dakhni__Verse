import { requireAuth } from '@/lib/auth/helpers';
import { getReleases, getArtistOptions } from '@/lib/queries/releases';
import { PageHeader } from '@/components/ui/page-header';
import { ReleaseList } from '@/components/releases/release-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function ReleasesPage() {
  const [releases, artists] = await Promise.all([
    getReleases(),
    getArtistOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Releases" description="Track music releases" />
        <Button asChild>
          <Link href="/releases/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Release
          </Link>
        </Button>
      </div>
      <ReleaseList releases={releases} artists={artists} />
    </div>
  );
}
