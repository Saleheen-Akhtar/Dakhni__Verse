"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { generateArtistLogin, type LinkedArtistUser } from '@/lib/auth/artist-login-actions';
import {
  Key,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface GenerateArtistLoginDialogProps {
  artist: {
    id: string;
    stage_name: string;
    email?: string | null;
    phone?: string | null;
  };
  initialLinkedUser?: LinkedArtistUser | null;
  className?: string;
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let result = 'DV@';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function GenerateArtistLoginDialog({
  artist,
  initialLinkedUser,
  className,
}: GenerateArtistLoginDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [linkedUser, setLinkedUser] = useState<LinkedArtistUser | null>(initialLinkedUser || null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Artist' | 'Producer'>('Artist');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    role: string;
    loginUrl: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize fields on open
  useEffect(() => {
    if (isOpen) {
      setEmail(linkedUser?.email || artist.email || '');
      setPassword(generateSecurePassword());
      setRole((linkedUser?.role as any) || 'Artist');
      setError(null);
      setCreatedCredentials(null);
      setShowPassword(true);
    }
  }, [isOpen, artist, linkedUser]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard.`,
    });
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCopyFullMessage = () => {
    if (!createdCredentials) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dakhniverse.com';
    const message = `🎵 *Welcome to Dakhni Verse Creative Collective!*\n\n` +
      `Your artist portal account has been created by studio management. You can now log in to view your releases, studio sessions, and projects:\n\n` +
      `🔗 *Login Portal:* ${origin}/login\n` +
      `✉️ *Email:* ${createdCredentials.email}\n` +
      `🔑 *Temporary Password:* ${createdCredentials.password}\n\n` +
      `Please keep your credentials safe. See you at the studio! 🎙️`;

    handleCopy(message, 'Complete Invitation Message');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await generateArtistLogin({
        artistId: artist.id,
        email,
        password,
        role,
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dakhniverse.com';

      setCreatedCredentials({
        email: result.email,
        password: result.password,
        role: result.role,
        loginUrl: `${origin}/login`,
      });

      setLinkedUser({
        id: 'generated',
        email: result.email,
        name: artist.stage_name,
        role: result.role,
        artist_id: artist.id,
      });

      toast({
        title: 'Login Credentials Generated!',
        description: `Login account created and linked to ${artist.stage_name}.`,
        variant: 'success',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate login access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {linkedUser ? (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={`border-emerald-200 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/70 text-xs font-semibold flex items-center gap-1.5 ${className}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Login Active</span>
        </Button>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className={`bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm ${className}`}
        >
          <Key className="h-3.5 w-3.5 text-[#D71920]" />
          <span>Generate Login Access</span>
        </Button>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#D71920]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-neutral-950">
                    Artist Login Access
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate private credentials for <strong className="text-neutral-900">{artist.stage_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* If Credentials Were Just Created: Success Card */}
            {createdCredentials ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-left space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Credentials Ready to Share</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    The account for <strong>{artist.stage_name}</strong> is now live. Share these credentials with the artist so they can log into the portal.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
                    <span className="text-neutral-500 font-sans font-medium">Portal URL:</span>
                    <span className="font-semibold text-neutral-900 truncate max-w-[200px]">
                      {createdCredentials.loginUrl}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
                    <span className="text-neutral-500 font-sans font-medium">Login Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{createdCredentials.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdCredentials.email, 'Email')}
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Copy email"
                      >
                        {copiedField === 'Email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-sans font-medium">Temporary Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                        {createdCredentials.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdCredentials.password, 'Password')}
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Copy password"
                      >
                        {copiedField === 'Password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleCopyFullMessage}
                    className="w-full bg-[#D71920] hover:bg-red-700 text-white font-medium text-xs flex items-center justify-center gap-2 py-2.5"
                  >
                    {copiedField === 'Complete Invitation Message' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied Invitation Message!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Complete WhatsApp / Email Invitation</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-xs text-neutral-700"
                  >
                    Done / Close
                  </Button>
                </div>
              </div>
            ) : (
              /* Generation Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {linkedUser && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Account Already Linked</p>
                      <p className="text-amber-800 mt-0.5">
                        Currently linked to <strong>{linkedUser.email}</strong> with role <strong>{linkedUser.role}</strong>. Submitting will update credentials or assign a new password.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs leading-relaxed">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="artist-login-email" className="text-xs font-semibold text-neutral-800">
                    Artist Email Address
                  </Label>
                  <Input
                    id="artist-login-email"
                    type="email"
                    required
                    placeholder="artist@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This email will serve as the artist's login username.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="artist-login-password" className="text-xs font-semibold text-neutral-800">
                      Temporary Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateSecurePassword())}
                      className="text-[11px] text-[#D71920] hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="artist-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-xs pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 6 characters. You will be able to copy and send this to the artist.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="artist-login-role" className="text-xs font-semibold text-neutral-800">
                    Portal Role
                  </Label>
                  <select
                    id="artist-login-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-md bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#D71920]"
                  >
                    <option value="Artist">Artist (View own tracks, sessions, and catalog)</option>
                    <option value="Producer">Producer (View production workload and sessions)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-neutral-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#D71920] hover:bg-red-700 text-white font-medium text-xs flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{loading ? 'Creating Account...' : 'Generate Login Access'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
