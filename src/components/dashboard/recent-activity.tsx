"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import {
  UserPlus,
  Music,
  ArrowRight,
  Calendar,
  Disc,
  IndianRupee,
  Receipt,
  Wrench,
  Radio,
} from "lucide-react";

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
  user?: { name: string } | null;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  artist: <UserPlus className="h-4 w-4 text-dv-red" />,
  project: <Music className="h-4 w-4 text-blue-500" />,
  session: <Calendar className="h-4 w-4 text-amber-500" />,
  release: <Disc className="h-4 w-4 text-purple-500" />,
  contribution: <IndianRupee className="h-4 w-4 text-emerald-500" />,
  expense: <Receipt className="h-4 w-4 text-rose-500" />,
  equipment: <Wrench className="h-4 w-4 text-slate-500" />,
};

export function RecentActivityFeed({ activities: initialActivities }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("live-activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        async (payload) => {
          const insertedId = payload.new?.id;
          if (!insertedId) return;

          // Fetch user name and full relation details for the inserted log
          const { data, error } = await supabase
            .from("activity_logs")
            .select("*, user:users!user_id(name)")
            .eq("id", insertedId)
            .single();

          const newActivity: ActivityItem = data || {
            id: payload.new.id,
            action: payload.new.action,
            entity_type: payload.new.entity_type,
            entity_id: payload.new.entity_id,
            description: payload.new.description,
            created_at: payload.new.created_at,
            user: null,
          };

          setActivities((prev) => [newActivity, ...prev.filter((a) => a.id !== newActivity.id)].slice(0, 25));
          setNewlyAddedIds((prev) => new Set(prev).add(newActivity.id));

          // Toast alert for real-time notification
          toast({
            title: "Live Activity",
            description: newActivity.description,
            variant: "default",
          });

          // Clear highlight after 5 seconds
          setTimeout(() => {
            setNewlyAddedIds((prev) => {
              const updated = new Set(prev);
              updated.delete(newActivity.id);
              return updated;
            });
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Activity will appear here as you use the application."
      />
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const isNew = newlyAddedIds.has(activity.id);

        return (
          <div
            key={activity.id}
            className={`flex items-start gap-3 py-2.5 px-2 rounded-lg transition-colors duration-500 border-b border-border last:border-0 ${
              isNew ? "bg-red-50/70 border-l-2 border-l-dv-red" : "hover:bg-muted/40"
            }`}
          >
            <div className="mt-0.5 p-1.5 rounded-full bg-muted text-muted-foreground shrink-0">
              {ENTITY_ICONS[activity.entity_type] || (
                <ArrowRight className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {activity.user?.name || "System"}
                  </span>{" "}
                  <span className="text-secondary-text">
                    {activity.description}
                  </span>
                </p>
                {isNew && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-dv-red text-white shrink-0 animate-pulse">
                    NEW
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(activity.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
