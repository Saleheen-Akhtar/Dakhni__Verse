'use server';

import { headers } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Server-side rate-limited image upload action for public intakes.
 * Enforces IP rate limiting, size validation, MIME validation, and CSPRNG naming.
 */
export async function uploadApplicantImageAction(
  dataUrl: string,
  applicantName = 'applicant'
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    // If it's already an existing HTTP/CDN URL, return as-is
    if (dataUrl && dataUrl.startsWith('https://')) {
      return dataUrl;
    }
    throw new Error('Invalid image payload format.');
  }

  // 1. IP extraction for rate limiting
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

  // 2. Validate payload length before heavy parsing (3.5MB base64 max)
  if (dataUrl.length > 3.5 * 1024 * 1024) {
    throw new Error('Image file is too large. Maximum size is 2MB.');
  }

  // 3. Extract and validate MIME type
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Malformed image data.');
  }
  const meta = dataUrl.substring(0, commaIdx);
  const b64 = dataUrl.substring(commaIdx + 1);
  const mime = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';')).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
  }

  // 4. Rate-limit check via Supabase Service Client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Server storage configuration error: missing service key.');
  }

  const adminClient = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Limit applicant image uploads to 5 per hour per IP
  const { data: isAllowed, error: rateLimitErr } = await adminClient.rpc('check_rate_limit_rpc', {
    p_key: `upload:${ip}`,
    p_action: 'applicant_upload',
    p_max_requests: 5,
    p_window_seconds: 3600,
  });

  if (rateLimitErr) {
    console.warn('Rate limit RPC warning:', rateLimitErr.message);
  } else if (isAllowed === false) {
    throw new Error('Too many image uploads from your network. Please wait an hour before submitting again.');
  }

  // 5. Convert base64 to buffer and verify byte size
  const buffer = Buffer.from(b64, 'base64');
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image file exceeds the 2MB size limit.');
  }

  // 6. Generate cryptographically random secure path
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const cleanPrefix = applicantName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'applicant';
  const fileName = `avatars/${cleanPrefix}_${crypto.randomUUID()}.${ext}`;

  // 7. Upload to Supabase storage bucket 'profile-images'
  const { error: uploadErr } = await adminClient.storage
    .from('profile-images')
    .upload(fileName, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr.message);
    throw new Error('Failed to save profile image. Please try again.');
  }

  const { data: urlData } = adminClient.storage.from('profile-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}
