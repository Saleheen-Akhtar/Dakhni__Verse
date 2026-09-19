import { getEquipment } from '@/lib/queries/equipment';
import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { PageHeader } from '@/components/ui/page-header';
import { EquipmentList } from '@/components/equipment/equipment-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<{ owner_type?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [equipment, profile] = await Promise.all([
    getEquipment({
      owner_type: params?.owner_type,
      search: params?.search,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 25,
    }),
    getCurrentUserProfile(),
  ]);

  const isManager = profile?.role === 'Manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Equipment" description="Studio inventory" />
        {isManager && (
          <Button asChild>
            <Link href="/equipment/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Link>
          </Button>
        )}
      </div>
      <EquipmentList 
        equipment={equipment} 
        initialSearch={params?.search || ''}
        initialOwnerType={params?.owner_type || 'all'}
        currentPage={params?.page ? Number(params.page) : 1}
      />
    </div>
  );
}
