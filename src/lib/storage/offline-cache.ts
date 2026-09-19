'use client';

/**
 * Client-side offline storage helpers for Dakhni Verse.
 * Persists user session metadata and artist snapshots locally
 * on the user's physical device for instant loading and offline resilience.
 */

const USER_KEY = 'dv_user_profile_v1';
const ARTIST_DASH_PREFIX = 'dv_artist_dash_';

export interface OfflineUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  artistId?: string | null;
  savedAt: number;
}

export function saveUserOfflineProfile(user: { id: string; name: string; email: string; role: string; artist_id?: string | null }) {
  if (typeof window === 'undefined') return;
  try {
    const profile: OfflineUserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      artistId: user.artist_id || null,
      savedAt: Date.now(),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  } catch (e) {
    // LocalStorage quota or access error (e.g. private browsing)
  }
}

export function getUserOfflineProfile(): OfflineUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveArtistDashboardOffline(artistId: string, snapshot: any) {
  if (typeof window === 'undefined' || !artistId) return;
  try {
    localStorage.setItem(
      `${ARTIST_DASH_PREFIX}${artistId}`,
      JSON.stringify({
        data: snapshot,
        savedAt: Date.now(),
      })
    );
  } catch (e) {}
}

export function getArtistDashboardOffline(artistId: string): any | null {
  if (typeof window === 'undefined' || !artistId) return null;
  try {
    const raw = localStorage.getItem(`${ARTIST_DASH_PREFIX}${artistId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch (e) {
    return null;
  }
}

export function clearOfflineDeviceCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ARTIST_DASH_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}
