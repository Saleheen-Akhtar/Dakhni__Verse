import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { RecentActivityFeed, ActivityItem } from "@/components/dashboard/recent-activity";
import {
  ArtistSummary,
  UpcomingSession,
  ArtistProjectItem,
} from "@/lib/queries/artist-portal";
import type { ProductionWorkload, TargetProgress } from "@/types";
import {
  Music,
  Calendar,
  Clock,
  Disc,
  Mic,
  ArrowRight,
  Headphones,
  CheckCircle2,
  Sliders,
} from "lucide-react";

interface ProducerDashboardProps {
  userName: string;
  artist: ArtistSummary | null;
  workload: ProductionWorkload;
  upcomingSessions: UpcomingSession[];
  projects: ArtistProjectItem[];
  recentActivities: ActivityItem[];
  targetProgress?: TargetProgress | null;
}

export function ProducerDashboard({
  userName,
  artist,
  workload,
  upcomingSessions,
  projects,
  recentActivities,
  targetProgress,
}: ProducerDashboardProps) {
  const displayName = artist?.stage_name || userName;
  const nextSession = upcomingSessions[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#222222] text-white">
            Producer Portal
          </span>
          {artist?.dakhni_verse_role && (
            <span className="text-xs text-muted-foreground">
              {artist.dakhni_verse_role}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-[#111111]">
          Welcome, {displayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Track production workloads, active audio engineering tasks, and studio bookings.
        </p>
      </div>

      {/* Next Studio Session Spotlight Banner */}
      {nextSession && (
        <Card className="border-l-4 border-l-[#D71920] bg-neutral-50/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#D71920] uppercase tracking-wider">
                    Next Scheduled Session
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {nextSession.session_type}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold font-display text-neutral-900">
                  {nextSession.project?.title || "Studio Session"}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(nextSession.session_date)}
                  </span>
                  {nextSession.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {nextSession.start_time.slice(0, 5)}
                      {nextSession.end_time && ` - ${nextSession.end_time.slice(0, 5)}`}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/sessions"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#D71920] hover:underline self-start sm:self-center"
              >
                View Sessions <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Producer KPI Workload Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="In Production"
          value={workload.production.inProgress}
          icon={<Mic className="h-4 w-4" />}
          href="/projects?status=Production"
        />
        <KPICard
          label="In Mixing"
          value={workload.mixing.inProgress}
          icon={<Headphones className="h-4 w-4" />}
          href="/projects?status=Mixing"
        />
        <KPICard
          label="In Mastering"
          value={workload.mastering.inProgress}
          icon={<Disc className="h-4 w-4" />}
          href="/projects?status=Mastering"
        />
        {targetProgress?.hasTarget ? (
          <KPICard
            label="Monthly Song Target"
            value={`${targetProgress.actual} / ${targetProgress.target}`}
            icon={<Sliders className="h-4 w-4 text-[#D71920]" />}
            href="/settings"
          />
        ) : (
          <KPICard
            label="Upcoming Sessions"
            value={upcomingSessions.length}
            icon={<Calendar className="h-4 w-4" />}
            href="/sessions"
          />
        )}
      </div>

      {/* Production Overview Breakdown */}
      <ProductionSummary workload={workload} />

      {/* Grid: Assigned Projects & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assigned Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-neutral-900">
              Assigned Projects
            </h2>
            <Link
              href="/projects"
              className="text-xs text-muted-foreground hover:text-neutral-900 flex items-center gap-1 transition-colors"
            >
              All Projects <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-sm">No active projects assigned</p>
                <p className="text-xs mt-1">
                  Projects where you are the producer or engineer will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Card key={proj.id} className="hover:border-neutral-400 transition-colors">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-neutral-900 line-clamp-1">
                          {proj.title}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {proj.status}
                        </Badge>
                      </div>
                      {proj.target_release_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Target: {formatDate(proj.target_release_date)}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
                      <Link
                        href={`/projects/${proj.id}`}
                        className="text-xs font-semibold text-[#D71920] hover:underline flex items-center gap-1"
                      >
                        Project Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Activity & Sessions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold font-display">
                  Studio Schedule
                </CardTitle>
                <Link
                  href="/sessions"
                  className="text-xs text-[#D71920] hover:underline font-medium"
                >
                  Calendar
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No upcoming studio sessions booked.
                </p>
              ) : (
                upcomingSessions.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-neutral-800">
                      <span>{s.project?.title || s.session_type}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(s.session_date)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} • {s.session_type}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold font-display">
                Recent Collective Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityFeed activities={recentActivities.slice(0, 6)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
