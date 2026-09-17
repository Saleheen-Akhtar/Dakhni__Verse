"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./loading-state";
import { EmptyState } from "./empty-state";
import { Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

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
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyState,
  loading,
  onRowClick,
  className,
  pageSize = 15,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

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

  const isPaginated = pageSize > 0 && data.length > pageSize;
  const totalPages = isPaginated ? Math.ceil(data.length / pageSize) : 1;
  const startIndex = isPaginated ? (currentPage - 1) * pageSize : 0;
  const endIndex = isPaginated ? Math.min(startIndex + pageSize, data.length) : data.length;
  const visibleData = isPaginated ? data.slice(startIndex, endIndex) : data;

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

  const getRowKey = (row: T, index: number) => {
    return row.id || row.uuid || row._id || `row-${startIndex + index}`;
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
            {visibleData.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
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
        {visibleData.map((row, i) => (
          <div
            key={getRowKey(row, i)}
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

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border bg-dv-gray-light/40 text-xs text-muted-foreground">
        <div>
          Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
          <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
          <span className="font-semibold text-foreground">{data.length}</span> entries
        </div>

        {isPaginated && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
