import { getReleaseById } from '@/lib/queries/releases';
import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { ReleaseDetail } from '@/components/releases/release-detail';
import { notFound } from 'next/navigation';

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, release] = await Promise.all([
    getCurrentUserProfile(),
    getReleaseById(id),
  ]);
  
  if (!release) notFound();

  const isManager = user?.role === 'Manager';

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <ReleaseDetail release={release} isManager={isManager} />
    </div>
  );
}
