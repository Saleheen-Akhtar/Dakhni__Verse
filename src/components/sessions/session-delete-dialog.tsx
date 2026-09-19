"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { formatDate, formatDuration } from "@/lib/utils/format";
import {
  deleteSession,
  cancelSession,
  restoreSession,
} from "@/lib/queries/sessions";
import {
  AlertTriangle,
  Trash2,
  Ban,
  RotateCcw,
  Calendar,
  Clock,
  User,
  Music,
} from "lucide-react";

export interface SessionDeleteDialogProps {
  session: {
    id: string;
    session_date: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_minutes?: number | null;
    session_type: string;
    notes?: string | null;
    artist?: { stage_name?: string; name?: string } | null;
    project?: { title?: string } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SessionDeleteDialog({
  session,
  open,
  onOpenChange,
  onSuccess,
}: SessionDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<"cancel" | "delete" | "restore" | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  if (!session) return null;

  const isCancelled = session.notes?.includes("[CANCELLED]");

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelSession(session.id, cancelReason);
      toast({
        title: "Session Cancelled",
        description: "The session has been marked as cancelled and the slot is freed.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error cancelling session",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setActionType(null);
      setCancelReason("");
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await restoreSession(session.id);
      toast({
        title: "Session Restored",
        description: "The session has been reactivated on the studio schedule.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error restoring session",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteSession(session.id);
      toast({
        title: "Session Deleted",
        description: "The session has been permanently removed.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error deleting session",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Ban className="h-5 w-5" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-[#D71920]">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div>
              <DialogTitle className="text-lg font-bold font-display">
                {actionType === "delete"
                  ? "Permanently Delete Session?"
                  : actionType === "cancel"
                  ? "Cancel Studio Session?"
                  : actionType === "restore"
                  ? "Restore Cancelled Session?"
                  : isCancelled
                  ? "Manage Cancelled Session"
                  : "Cancel or Delete Session"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {actionType === "delete"
                  ? "This action cannot be undone. This session will be erased completely."
                  : actionType === "cancel"
                  ? "Marking as cancelled preserves booking history while freeing up the slot."
                  : "Choose an action for this scheduled studio booking."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Session Snapshot Card */}
        <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-xs space-y-2 mt-2">
          <div className="flex items-center justify-between font-semibold text-neutral-900 border-b border-neutral-200 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#D71920]" />
              {formatDate(session.session_date)}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-neutral-300">
              {session.session_type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-neutral-700 pt-1">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">
                {session.artist?.stage_name || session.artist?.name || "Artist"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {session.start_time?.substring(0, 5) || "TBD"} -{" "}
                {session.end_time?.substring(0, 5) || "TBD"}
              </span>
            </div>
          </div>

          {session.project?.title && (
            <div className="flex items-center gap-1.5 text-neutral-600 pt-0.5">
              <Music className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">Project: {session.project.title}</span>
            </div>
          )}
        </div>

        {/* View: Confirm Delete View */}
        {actionType === "delete" ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <strong>Warning:</strong> Deleting permanently removes all time records, attendance logs, and hours associated with this session. If you only want to free the studio slot, consider <strong>Cancelling</strong> instead.
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionType(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? "Deleting..." : "Permanently Delete"}
              </Button>
            </DialogFooter>
          </div>
        ) : actionType === "cancel" ? (
          /* View: Confirm Cancel View */
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-xs font-semibold">
                Reason for cancellation (optional):
              </Label>
              <Input
                id="cancel-reason"
                placeholder="e.g. Artist requested reschedule, vocal rest, equipment delay..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionType(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                <Ban className="h-4 w-4" />
                {loading ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </div>
        ) : actionType === "restore" ? (
          /* View: Confirm Restore View */
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              This will remove the cancellation status and place this session back as active on the studio calendar.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionType(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleRestore}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                {loading ? "Restoring..." : "Restore Session"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Main Choice View: Cancel vs Delete */
          <div className="space-y-3 py-2">
            {!isCancelled ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType("cancel")}
                  className="w-full justify-between h-auto py-3 px-4 border-amber-300 hover:bg-amber-50 hover:text-amber-900 group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Ban className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-neutral-900 group-hover:text-amber-900">
                        Cancel Session
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Frees studio slot and keeps cancellation history on calendar
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType("delete")}
                  className="w-full justify-between h-auto py-3 px-4 border-rose-200 hover:bg-rose-50 hover:text-rose-900 group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-neutral-900 group-hover:text-rose-900">
                        Delete Permanently
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Completely erase this session from database records
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center gap-2">
                  <Ban className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>This session is currently marked as <strong>Cancelled</strong>.</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType("restore")}
                  className="w-full justify-between h-auto py-3 px-4 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-neutral-900 group-hover:text-emerald-900">
                        Restore Session
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Re-activate this session back onto the studio schedule
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionType("delete")}
                  className="w-full justify-between h-auto py-3 px-4 border-rose-200 hover:bg-rose-50 hover:text-rose-900 group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-neutral-900 group-hover:text-rose-900">
                        Delete Permanently
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Completely purge from database
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
