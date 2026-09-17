import { requireRole } from '@/lib/auth/helpers';
import { getProducers, getTargets } from '@/lib/queries/settings';
import { SettingsPage } from '@/components/settings/settings-page';

export default async function SettingsRoute() {
  await requireRole(['Manager']);
  const [producers, targets] = await Promise.all([
    getProducers(),
    getTargets(),
  ]);

  return <SettingsPage producers={producers} initialTargets={targets} />;
}
