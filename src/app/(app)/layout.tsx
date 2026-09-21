import { getCurrentUserProfile } from '@/lib/auth/helpers';
import { AppShell } from '@/components/layout/app-shell';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut } from 'lucide-react';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getCurrentUserProfile();

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0d0f11] text-white">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-[#D71920] flex items-center justify-center mb-5 shadow-lg">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold font-display mb-2">
          Account Profile Pending Setup
        </h1>
        <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
          Your credentials are authenticated, but no user profile is currently linked in the Dakhni Verse system. Please contact your manager to complete your account setup.
        </p>
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            className="flex items-center gap-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-medium"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </form>
      </div>
    );
  }

  return <AppShell user={userData}>{children}</AppShell>;
}
