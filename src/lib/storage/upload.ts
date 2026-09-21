import { createClient } from '@/lib/supabase/client';

/**
 * Uploads a base64 Data URL to Supabase Storage ('profile-images' bucket)
 * and returns the public CDN URL. If it's already an HTTP URL, it returns it untouched.
 */
export async function uploadProfileImage(dataUrlOrUrl: string | null | undefined, prefix = 'avatar'): Promise<string | null> {
  if (!dataUrlOrUrl) return null;
  if (!dataUrlOrUrl.startsWith('data:image/')) {
    return dataUrlOrUrl; // Already a storage/CDN URL
  }

  try {
    const supabase = createClient();
    const commaIdx = dataUrlOrUrl.indexOf(',');
    const meta = dataUrlOrUrl.substring(0, commaIdx);
    const b64 = dataUrlOrUrl.substring(commaIdx + 1);
    const mime = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';'));
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });

    const fileName = `avatars/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('profile-images').upload(fileName, blob, {
      contentType: mime,
      upsert: false,
    });

    if (error) {
      console.error('Storage upload error:', error.message);
      throw new Error(`Failed to upload profile image: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Storage upload exception:', err?.message);
    throw new Error(err?.message || 'Profile image upload failed. Please try a different image.');
  }
}
