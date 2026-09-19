'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Music,
  Calendar,
  Disc,
  Wallet,
  Wrench,
  Settings,
  Menu,
  X,
  LogOut,
  Smartphone
} from 'lucide-react';
import { signOut } from '@/lib/auth/actions';
import { triggerPwaInstall } from '@/components/pwa/pwa-install-prompt';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Artists', href: '/artists', icon: Users },
  { label: 'Projects', href: '/projects', icon: Music },
  { label: 'Sessions', href: '/sessions', icon: Calendar },
  { label: 'Releases', href: '/releases', icon: Disc },
  { label: 'Finance', href: '/finance', icon: Wallet, roles: ['Manager'] },
  { label: 'Equipment', href: '/equipment', icon: Wrench },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['Manager'] },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  const renderNavItems = () => (
    <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
      {visibleNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenu}
            className={`flex items-center gap-3 px-6 py-3 transition-colors ${
              isActive
                ? 'bg-[#222222] border-l-4 border-l-[#D71920] text-white'
                : 'text-gray-400 hover:bg-[#222222] hover:text-white border-l-4 border-l-transparent'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F4F4]">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#111111] text-white flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-[#D71920]"></div>
          <span className="font-display font-bold text-lg tracking-wider">DAKHNI VERSE</span>
        </div>
        <button onClick={toggleMenu} className="p-2 -mr-2 text-gray-400 hover:text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#111111] text-white flex flex-col transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#222222] shrink-0 mt-4 md:mt-0">
          <div className="flex flex-col">
            <div className="w-6 h-1 bg-[#D71920] mb-1 rounded-sm"></div>
            <span className="font-display font-bold text-lg tracking-wider">DAKHNI VERSE</span>
          </div>
        </div>

        {/* Nav */}
        {renderNavItems()}

        {/* User / Logout */}
        <div className="p-6 border-t border-[#222222] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <div className="flex items-center mt-1">
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-[#222222] text-gray-300 rounded">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              triggerPwaInstall();
            }}
            className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors w-full mb-3 px-2.5 py-2 rounded-md bg-[#1c1c1c] hover:bg-[#252525] border border-neutral-800"
          >
            <Smartphone className="w-4 h-4 text-[#D71920]" />
            <span className="font-medium">Install Mobile App</span>
          </button>
          <form action={signOut}>
            <button 
              type="submit"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full px-1"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white shadow-sm border-l border-[#E5E5E5]">
          {children}
        </div>
      </main>
    </div>
  );
}
