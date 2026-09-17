import { formatDate } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import {
  UserPlus,
  Music,
  ArrowRight,
  Calendar,
  Disc,
  IndianRupee,
  Receipt,
  Wrench,
} from "lucide-react";

interface RecentActivityFeedProps {
  activities: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    description: string;
    created_at: string;
    user?: { name: string } | null;
  }>;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  artist: <UserPlus className="h-4 w-4" />,
  project: <Music className="h-4 w-4" />,
  session: <Calendar className="h-4 w-4" />,
  release: <Disc className="h-4 w-4" />,
  contribution: <IndianRupee className="h-4 w-4" />,
  expense: <Receipt className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Activity will appear here as you use the application."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 py-2 border-b border-border last:border-0"
        >
          <div className="mt-0.5 p-1.5 rounded-full bg-muted text-muted-foreground">
            {ENTITY_ICONS[activity.entity_type] || (
              <ArrowRight className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">
                {activity.user?.name || "System"}
              </span>{" "}
              <span className="text-muted-foreground">
                {activity.description}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(activity.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
