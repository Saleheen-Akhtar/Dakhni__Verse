import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductionWorkload } from "@/types";

interface ProductionSummaryProps {
  workload?: ProductionWorkload | null;
  targetValue?: number | null;
}

export function ProductionSummary({
  workload = null,
  targetValue = null,
}: ProductionSummaryProps) {

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold font-display mb-4">
          Production Overview
        </h3>
        {!workload ? (
          <EmptyState
            title="No production data"
            description="Assign a producer to projects to track production workload."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Production */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Production
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Assigned</span>
                  <span className="font-semibold font-display">
                    {workload.production.assigned}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>In Progress</span>
                  <span className="font-semibold font-display text-amber-600">
                    {workload.production.inProgress}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-semibold font-display text-green-600">
                    {workload.production.completed}
                  </span>
                </div>
              </div>
            </div>

            {/* Mixing */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Mixing
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Assigned</span>
                  <span className="font-semibold font-display">
                    {workload.mixing.assigned}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>In Progress</span>
                  <span className="font-semibold font-display text-amber-600">
                    {workload.mixing.inProgress}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-semibold font-display text-green-600">
                    {workload.mixing.completed}
                  </span>
                </div>
              </div>
            </div>

            {/* Mastering */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Mastering
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Assigned</span>
                  <span className="font-semibold font-display">
                    {workload.mastering.assigned}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>In Progress</span>
                  <span className="font-semibold font-display text-amber-600">
                    {workload.mastering.inProgress}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span className="font-semibold font-display text-green-600">
                    {workload.mastering.completed}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Target display */}
        {targetValue !== null && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Monthly Target:{" "}
              <span className="font-semibold text-foreground">
                {targetValue} songs/month
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
