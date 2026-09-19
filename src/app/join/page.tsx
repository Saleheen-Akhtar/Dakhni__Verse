import { Metadata } from 'next';
import Link from 'next/link';
import { PublicArtistForm } from '@/components/artists/public-artist-form';

export const metadata: Metadata = {
  title: 'Join the Collective | Dakhni Verse Artist Intake',
  description: 'Official artist intake and profile update form for Dakhni Verse recording studio and creative collective.',
};

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top navigation header */}
      <header className="border-b border-neutral-200/80 bg-white/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-square.png" alt="Dakhni Verse" className="w-8 h-8 rounded-lg object-contain bg-[#111111] border border-neutral-800 shadow-xs" />
            <span className="font-bold text-lg tracking-wider font-display text-neutral-950">
              DAKHNI VERSE
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-red-50 text-[#D71920] border border-red-100">
              Artist Intake
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Studio Staff Login →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-6 sm:py-10">
        <PublicArtistForm />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-neutral-800 font-display">DAKHNI VERSE RECORDING COLLECTIVE</p>
          <p>Bengaluru, Karnataka • Dedicated to authentic vernacular hip-hop and audio production.</p>
          <p className="text-neutral-400">© {new Date().getFullYear()} Dakhni Verse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
