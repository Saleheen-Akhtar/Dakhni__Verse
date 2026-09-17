'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActivityLog } from '@/types';

export async function getRecentActivity(limit: number = 20) {
  const supabase = await createClient();
  
  // NOTE: Assuming there's a user table linked, but using standard structure
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
  
  return data;
}

export async function logActivity(userId: string, action: string, entityType: string, entityId: string | null, description: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('activity_logs')
    .insert([{
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description
    }]);

  if (error) {
    console.error('Error logging activity:', error);
  }
}
