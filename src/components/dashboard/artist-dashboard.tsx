import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { RecentActivityFeed, ActivityItem } from "@/components/dashboard/recent-activity";
import {
  ArtistSummary,
  UpcomingSession,
  ArtistProjectItem,
  ArtistReleaseItem,
} from "@/lib/queries/artist-portal";
import { ArtistKPIs } from "@/lib/calculations/artist-kpi";
import {
  Music,
  Calendar,
  Clock,
  Disc,
  Mic,
  Activity,
  ArrowRight,
  Headphones,
  CheckCircle2,
} from "lucide-react";

interface ArtistDashboardProps {
  userName: string;
  artist: ArtistSummary | null;
  kpis: ArtistKPIs;
  upcomingSessions: UpcomingSession[];
  projects: ArtistProjectItem[];
  releases: ArtistReleaseItem[];
  recentActivities: ActivityItem[];
}

export function ArtistDashboard({
  userName,
  artist,
  kpis,
  upcomingSessions,
  projects,
  releases,
  recentActivities,
}: ArtistDashboardProps) {
  const displayName = artist?.stage_name || userName;
  const nextSession = upcomingSessions[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#222222] text-white">
            Artist Portal
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
          Track your active music production, booked studio time, and releases.
        </p>
      </div>

      {/* Next Studio Session Spotlight Banner */}
      {nextSession ? (
        <Card className="border-2 border-dv-black bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#D71920] text-white">
                    <Headphones className="h-3 w-3" />
                    Next Studio Booking
                  </span>
                  <span className="text-xs text-gray-300">
                    {nextSession.session_type} Session
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display">
                  {nextSession.project?.title
                    ? `Working on "${nextSession.project.title}"`
                    : "Studio Session"}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#D71920]" />
                    {formatDate(nextSession.session_date)}
                  </span>
                  {nextSession.start_time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-[#D71920]" />
                      {nextSession.start_time.substring(0, 5)}
                      {nextSession.end_time ? ` - ${nextSession.end_time.substring(0, 5)}` : ""}
                    </span>
                  )}
                  {nextSession.engineer && (
                    <span className="flex items-center gap-1.5">
                      <Mic className="h-4 w-4 text-[#D71920]" />
                      Engineer: {nextSession.engineer.stage_name}
                    </span>
                  )}
                </div>
                {nextSession.notes && (
                  <p className="text-xs text-gray-400 pt-1 italic">
                    &quot;{nextSession.notes}&quot;
                  </p>
                )}
              </div>
              <div>
                <Link
                  href="/sessions"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-md text-sm font-semibold transition-colors"
                >
                  View All Sessions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border bg-neutral-50/50">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-muted text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No upcoming studio sessions booked
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reach out to management or check the studio schedule to book your next session.
                </p>
              </div>
            </div>
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#D71920] hover:underline shrink-0"
            >
              Check Studio Calendar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Artist KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="My Active Projects"
          value={kpis.activeProjects}
          icon={<Music className="h-4 w-4" />}
          href="/projects"
        />
        <KPICard
          label="Songs Released"
          value={kpis.releasedSongs}
          icon={<Disc className="h-4 w-4" />}
          href="/releases"
        />
        <KPICard
          label="Studio Sessions"
          value={kpis.sessionsAttended}
          icon={<Calendar className="h-4 w-4" />}
          href="/sessions"
        />
        <KPICard
          label="Studio Hours Logged"
          value={`${kpis.studioHours}h`}
          icon={<Clock className="h-4 w-4" />}
          href="/sessions"
        />
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: My Projects */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="h-5 w-5 text-dv-red" />
                My Current Projects
              </CardTitle>
              <Link
                href="/projects"
                className="text-xs font-medium text-[#D71920] hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active projects assigned yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="py-3 flex items-center justify-between hover:bg-muted/40 px-2 rounded-md transition-colors block"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {project.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.producer?.stage_name
                            ? `Producer: ${project.producer.stage_name}`
                            : `Created ${formatDate(project.created_at)}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          project.status === "Released"
                            ? "success"
                            : project.status === "Recording" || project.status === "Mixing"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Releases */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Disc className="h-5 w-5 text-purple-600" />
                My Released Songs
              </CardTitle>
              <Link
                href="/releases"
                className="text-xs font-medium text-[#D71920] hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {releases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No tracks released yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {releases.map((release) => (
                    <div
                      key={release.id}
                      className="py-3 flex items-center justify-between px-2"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {release.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {release.release_type} • {release.release_date ? formatDate(release.release_date) : "TBD"}
                        </p>
                      </div>
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Released
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Schedule & Collective Feed */}
        <div className="space-y-6">
          {/* Upcoming Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                My Upcoming Schedule
              </CardTitle>
              <Link
                href="/sessions"
                className="text-xs font-medium text-[#D71920] hover:underline"
              >
                Studio schedule
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No upcoming bookings on your calendar.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="py-3 flex items-start justify-between px-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.session_type} Session
                          {session.project?.title ? ` - ${session.project.title}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(session.session_date)}
                          {session.start_time ? ` at ${session.start_time.substring(0, 5)}` : ""}
                          {session.engineer ? ` • ${session.engineer.stage_name}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Booked
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Realtime Collective Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                Collective Activity
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </div>
            </CardHeader>
            <CardContent>
              <RecentActivityFeed activities={recentActivities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
