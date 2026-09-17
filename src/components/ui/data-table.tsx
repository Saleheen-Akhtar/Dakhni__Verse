"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./loading-state";
import { EmptyState } from "./empty-state";
import { Inbox } from "lucide-react";

export interface Column<T = any> {
  key?: string;
  accessorKey?: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: { title: string; description?: string };
  loading?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyState,
  loading,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton />;
  }

  if (!data || data.length === 0) {
    if (emptyState) {
      return (
        <div className="border border-border rounded-lg bg-white overflow-hidden shadow-sm">
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title={emptyState.title}
            description={emptyState.description}
          />
        </div>
      );
    }
    return null;
  }

  const renderCell = (col: Column<T>, row: T) => {
    if (col.cell) {
      return col.cell({ row: { original: row } });
    }
    if (col.render) {
      return col.render(row);
    }
    const key = col.accessorKey || col.key;
    if (!key) return null;
    return key.split(".").reduce((obj: any, part: string) => obj?.[part], row);
  };

  const getColKey = (col: Column<T>, index: number) => {
    return col.accessorKey || col.key || `col-${index}`;
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border border-border bg-white shadow-sm",
        className
      )}
    >
      {/* Desktop Table View */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground">
          <thead className="text-xs uppercase bg-dv-gray-light border-b border-border text-muted-foreground">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={getColKey(col, index)}
                  className={cn("px-4 py-3 font-medium", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border last:border-0 hover:bg-dv-gray-light/60 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, j) => (
                  <td
                    key={getColKey(col, j)}
                    className={cn("px-4 py-3", col.className)}
                  >
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col divide-y divide-border">
        {data.map((row, i) => (
          <div
            key={i}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "p-4 flex flex-col gap-2 hover:bg-dv-gray-light/60 transition-colors",
              onRowClick && "cursor-pointer"
            )}
          >
            {columns.map((col, j) => (
              <div
                key={getColKey(col, j)}
                className="flex justify-between items-start gap-4"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {col.header}
                </span>
                <span
                  className={cn(
                    "text-sm text-right font-medium",
                    col.className
                  )}
                >
                  {renderCell(col, row)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
