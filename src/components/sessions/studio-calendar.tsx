"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Music,
  Mic,
  AlertTriangle,
  X,
  Plus,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { SessionReminderDialog } from "./session-reminder-dialog";

export interface SessionItem {
  id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes?: number | null;
  session_type: string;
  notes?: string | null;
  artist?: { id: string; stage_name?: string; name?: string; phone?: string | null; location?: string | null } | null;
  project?: { id: string; title: string } | null;
  engineer?: { id: string; stage_name?: string; name?: string; phone?: string | null } | null;
}

interface StudioCalendarProps {
  sessions: SessionItem[];
  artists: any[];
  selectedArtist?: string;
  selectedType?: string;
}

// Session type styling map
export const SESSION_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  Recording: {
    bg: "bg-rose-50 hover:bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-[#D71920]",
    label: "Recording",
  },
  Mixing: {
    bg: "bg-blue-50 hover:bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-600",
    label: "Mixing",
  },
  Writing: {
    bg: "bg-purple-50 hover:bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-600",
    label: "Writing",
  },
  Production: {
    bg: "bg-indigo-50 hover:bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-600",
    label: "Production",
  },
  Mastering: {
    bg: "bg-emerald-50 hover:bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
    label: "Mastering",
  },
  Rehearsal: {
    bg: "bg-amber-50 hover:bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
    label: "Rehearsal",
  },
  Other: {
    bg: "bg-gray-100 hover:bg-gray-200",
    text: "text-gray-800",
    border: "border-gray-300",
    dot: "bg-gray-500",
    label: "Other",
  },
};

export function StudioCalendar({ sessions }: StudioCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [reminderSession, setReminderSession] = useState<SessionItem | null>(null);

  // Group sessions by "YYYY-MM-DD"
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const session of sessions) {
      const dateKey = session.session_date?.split("T")[0];
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(session);
    }
    // Sort each day's sessions by start_time
    for (const list of map.values()) {
      list.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    }
    return map;
  }, [sessions]);

  // Check if a day has overlapping sessions
  const checkDayHasOverlap = (daySessions: SessionItem[]) => {
    if (daySessions.length < 2) return false;
    for (let i = 0; i < daySessions.length; i++) {
      for (let j = i + 1; j < daySessions.length; j++) {
        const s1 = daySessions[i];
        const s2 = daySessions[j];
        if (s1.start_time && s1.end_time && s2.start_time && s2.end_time) {
          if (s1.start_time < s2.end_time && s1.end_time > s2.start_time) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Month navigation helpers
  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "month") {
        copy.setMonth(copy.getMonth() - 1);
      } else {
        copy.setDate(copy.getDate() - 7);
      }
      return copy;
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      if (viewMode === "month") {
        copy.setMonth(copy.getMonth() + 1);
      } else {
        copy.setDate(copy.getDate() + 7);
      }
      return copy;
    });
  };

  const setToday = () => setCurrentDate(new Date());

  // Month grid calculations
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Days in month
    const totalDays = lastDayOfMonth.getDate();

    // Day of week for first day (0 = Sun, 1 = Mon, ...). We start with Monday (1)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const days: Array<{
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Leading days from prev month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing days of next month to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate]);

  // Week view calculations
  const weekData = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(curr.setDate(diff));

    const weekDays: Array<{
      date: Date;
      dateStr: string;
      isToday: boolean;
      dayName: string;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      weekDays.push({
        date: d,
        dateStr,
        isToday: dateStr === todayStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }

    return weekDays;
  }, [currentDate]);

  const monthTitle = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekTitle = `Week of ${weekData[0]?.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekData[6]?.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevPeriod}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextPeriod}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={setToday}
            className="text-xs font-semibold px-2.5 h-8 text-foreground"
          >
            Today
          </Button>
          <h2 className="text-lg font-bold font-display ml-2 text-[#111111]">
            {viewMode === "month" ? monthTitle : weekTitle}
          </h2>
        </div>

        {/* View Mode Toggle & Add Button */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1 text-muted-foreground">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "month"
                  ? "bg-white text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "week"
                  ? "bg-white text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              Week
            </button>
          </div>

          <Button asChild size="sm" className="h-8 text-xs font-semibold">
            <Link href="/sessions/new">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Book Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Calendar Display */}
      {viewMode === "month" ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-neutral-50/80 text-center text-xs font-semibold text-muted-foreground py-2.5">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border auto-rows-[minmax(110px,_1fr)]">
            {monthData.map((cell) => {
              const daySessions = sessionsByDate.get(cell.dateStr) || [];
              const hasOverlap = checkDayHasOverlap(daySessions);

              return (
                <div
                  key={cell.dateStr}
                  className={`p-1.5 flex flex-col justify-between transition-colors min-h-[110px] ${
                    cell.isCurrentMonth
                      ? "bg-white hover:bg-neutral-50/50"
                      : "bg-neutral-50/40 text-muted-foreground/60"
                  } ${cell.isToday ? "bg-red-50/30" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        cell.isToday
                          ? "bg-[#D71920] text-white"
                          : cell.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {hasOverlap && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800"
                        title="Multiple sessions overlap on this day"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                        Overlap
                      </span>
                    )}
                  </div>

                  {/* Sessions inside day */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {daySessions.slice(0, 3).map((session) => {
                      const style =
                        SESSION_TYPE_COLORS[session.session_type] ||
                        SESSION_TYPE_COLORS.Other;

                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-medium border truncate transition-all block ${style.bg} ${style.text} ${style.border}`}
                          title={`${session.session_type}: ${session.artist?.stage_name || "Artist"} (${session.start_time?.substring(0, 5) || "TBD"})`}
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
                            />
                            <span className="truncate">
                              {session.start_time
                                ? session.start_time.substring(0, 5)
                                : ""}{" "}
                              {session.artist?.stage_name ||
                                session.project?.title ||
                                session.session_type}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {daySessions.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-semibold px-1 block">
                        +{daySessions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View Grid */
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-border bg-neutral-50/80">
              {weekData.map((w) => (
                <div
                  key={w.dateStr}
                  className={`text-center py-3 border-r border-border last:border-0 ${
                    w.isToday ? "bg-red-50/40" : ""
                  }`}
                >
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    {w.dayName}
                  </p>
                  <p
                    className={`text-base font-bold font-display mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                      w.isToday ? "bg-[#D71920] text-white" : "text-foreground"
                    }`}
                  >
                    {w.date.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Week Columns */}
            <div className="grid grid-cols-7 divide-x divide-border min-h-[420px]">
              {weekData.map((w) => {
                const daySessions = sessionsByDate.get(w.dateStr) || [];
                const hasOverlap = checkDayHasOverlap(daySessions);

                return (
                  <div
                    key={w.dateStr}
                    className={`p-2 space-y-2 ${w.isToday ? "bg-red-50/10" : ""}`}
                  >
                    {hasOverlap && (
                      <div className="flex items-center gap-1 p-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Schedule Overlap</span>
                      </div>
                    )}

                    {daySessions.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60 text-center pt-8">
                        No bookings
                      </p>
                    ) : (
                      daySessions.map((session) => {
                        const style =
                          SESSION_TYPE_COLORS[session.session_type] ||
                          SESSION_TYPE_COLORS.Other;

                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-all shadow-xs hover:shadow-md ${style.bg} ${style.border} ${style.text}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                {session.session_type}
                              </span>
                              <span className="text-[10px] font-medium opacity-80">
                                {session.start_time
                                  ? session.start_time.substring(0, 5)
                                  : ""}
                              </span>
                            </div>
                            <p className="text-xs font-bold truncate">
                              {session.artist?.stage_name || "Collective Artist"}
                            </p>
                            {session.project?.title && (
                              <p className="text-[11px] opacity-90 truncate mt-0.5">
                                {session.project.title}
                              </p>
                            )}
                            {session.engineer && (
                              <p className="text-[10px] opacity-75 truncate mt-1">
                                Eng: {session.engineer.stage_name}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Color Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground bg-white p-3 rounded-lg border border-border">
        <span className="font-semibold text-foreground">Session Legend:</span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(SESSION_TYPE_COLORS).map(([key, item]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Session Details Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-border max-w-md w-full p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  (
                    SESSION_TYPE_COLORS[selectedSession.session_type] ||
                    SESSION_TYPE_COLORS.Other
                  ).bg
                } ${
                  (
                    SESSION_TYPE_COLORS[selectedSession.session_type] ||
                    SESSION_TYPE_COLORS.Other
                  ).text
                }`}
              >
                {selectedSession.session_type} Session
              </span>
            </div>

            <h3 className="text-xl font-bold font-display text-foreground">
              {selectedSession.project?.title || "Studio Session"}
            </h3>

            <div className="space-y-2.5 text-sm divide-y divide-border pt-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-[#D71920]" />
                  Date
                </span>
                <span className="font-semibold text-foreground">
                  {formatDate(selectedSession.session_date)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#D71920]" />
                  Time & Duration
                </span>
                <span className="font-semibold text-foreground">
                  {selectedSession.start_time?.substring(0, 5)} -{" "}
                  {selectedSession.end_time?.substring(0, 5)} (
                  {formatDuration(selectedSession.duration_minutes || 0)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#D71920]" />
                  Artist
                </span>
                <span className="font-semibold text-foreground">
                  {selectedSession.artist?.stage_name || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mic className="h-4 w-4 text-[#D71920]" />
                  Engineer / Producer
                </span>
                <span className="font-semibold text-foreground">
                  {selectedSession.engineer?.stage_name || "Studio Engineer"}
                </span>
              </div>

              {selectedSession.notes && (
                <div className="py-2">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Session Notes:
                  </span>
                  <p className="text-xs text-foreground bg-muted/50 p-2 rounded-md italic">
                    &quot;{selectedSession.notes}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                onClick={() => setReminderSession(selectedSession)}
                className="text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-sm font-semibold"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                WhatsApp Reminder
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                >
                  Close
                </Button>
                {selectedSession.project?.id && (
                  <Button asChild size="sm">
                    <Link href={`/projects/${selectedSession.project.id}`}>
                      <Music className="h-3.5 w-3.5 mr-1" />
                      View Project
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Session Reminder Modal */}
      <SessionReminderDialog
        session={reminderSession}
        onClose={() => setReminderSession(null)}
      />
    </div>
  );
}
