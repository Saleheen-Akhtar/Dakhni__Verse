import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect('/login');
  }

  return <AppShell user={userData}>{children}</AppShell>;
}
