'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from '@/lib/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center mb-4">
          <Image
            src="/logo.png"
            alt="Dakhni Verse"
            width={128}
            height={128}
            priority
            className="h-32 w-auto object-contain mb-3 drop-shadow-md"
          />
          <h2 className="text-center text-3xl font-bold font-display tracking-wider text-[#111111]">
            DAKHNI VERSE
          </h2>
        </div>
        <h2 className="mt-2 text-center text-xl font-medium text-[#666666]">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[#E5E5E5]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#111111]">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-[#E5E5E5] rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D71920] focus:border-[#D71920] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#111111]">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-[#E5E5E5] rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D71920] focus:border-[#D71920] sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#D71920] font-medium p-3 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D71920] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D71920] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-[#E5E5E5] pt-4">
            <p className="text-xs text-[#888888]">
              Private collective portal. Artist and staff accounts are managed by Dakhni Verse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
