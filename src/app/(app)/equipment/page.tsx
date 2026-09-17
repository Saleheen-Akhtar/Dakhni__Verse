import { requireAuth } from '@/lib/auth/helpers';
import { getEquipment } from '@/lib/queries/equipment';
import { PageHeader } from '@/components/ui/page-header';
import { EquipmentList } from '@/components/equipment/equipment-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function EquipmentPage() {
  await requireAuth();
  const equipment = await getEquipment();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Equipment" description="Studio inventory" />
        <Button asChild>
          <Link href="/equipment/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Link>
        </Button>
      </div>
      <EquipmentList equipment={equipment} />
    </div>
  );
}
