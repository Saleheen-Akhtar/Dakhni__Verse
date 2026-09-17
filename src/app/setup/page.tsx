'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkUsers() {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('Error checking users:', error);
        setError('Failed to check system status.');
        setChecking(false);
        return;
      }

      if (count && count > 0) {
        router.push('/login');
      } else {
        setChecking(false);
      }
    }
    
    checkUsers();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      let userId: string | null = null;

      // 1. Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        // If already registered in auth, attempt sign-in to get session
        if (authError.message.toLowerCase().includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) throw signInError;
          userId = signInData.user?.id || null;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id || null;
      }
      
      if (!userId) {
        throw new Error('User creation failed');
      }

      // 2. Insert record into users table
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          name,
          email,
          role: 'Manager',
        });

      if (dbError && !dbError.message.includes('duplicate')) {
        console.warn('Database insert note:', dbError);
      }

      // 3. Ensure signed in and redirect
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || checking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-8 h-1.5 bg-[#D71920] mb-2 rounded-sm"></div>
          <h2 className="text-center text-3xl font-bold font-display tracking-wider text-[#111111]">
            DAKHNI VERSE
          </h2>
        </div>
        <h2 className="mt-2 text-center text-xl font-medium text-[#111111]">
          Set up your account
        </h2>
        <p className="mt-2 text-center text-sm text-[#666666]">
          Create the first Manager account to get started.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[#E5E5E5]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#111111]">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-[#E5E5E5] rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D71920] focus:border-[#D71920] sm:text-sm"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-[#E5E5E5] rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D71920] focus:border-[#D71920] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#111111]">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
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
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[#D71920] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
