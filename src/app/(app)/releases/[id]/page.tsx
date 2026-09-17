import { getReleaseById } from '@/lib/queries/releases';
import { requireAuth, getCurrentUserProfile } from '@/lib/auth/helpers';
import { ReleaseDetail } from '@/components/releases/release-detail';
import { notFound } from 'next/navigation';

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const user = await getCurrentUserProfile();
  const release = await getReleaseById(id);
  
  if (!release) notFound();

  const isManager = user?.role === 'Manager';

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <ReleaseDetail release={release} isManager={isManager} />
    </div>
  );
}
