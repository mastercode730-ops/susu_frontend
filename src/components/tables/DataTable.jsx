'use client';

import * as React from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Download } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/spinner';
import { EmptyState } from '../ui/empty-state';
import { cn } from '../../lib/utils';

export function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  searchPlaceholder = "Search records...",
  onExport,
  actions,
  pageSize = 10,
  className
}) {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState('asc');
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter Data
  const filteredData = React.useMemo(() => {
    if (!globalFilter.trim()) return data;
    const term = globalFilter.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term)
      )
    );
  }, [data, globalFilter]);

  // Sort Data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn] ?? '';
      const bVal = b[sortColumn] ?? '';
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate Data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (!key) return;
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          )}
          {actions}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={col.id || col.accessorKey || idx}
                    className="px-4 py-3.5 whitespace-nowrap"
                    onClick={() => col.accessorKey && handleSort(col.accessorKey)}
                  >
                    <div className={cn("flex items-center gap-1.5", col.accessorKey && "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white")}>
                      {typeof col.header === 'function' ? col.header({ table: {} }) : col.header}
                      {col.accessorKey && <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((_, colIdx) => (
                      <td key={colIdx} className="px-4 py-3.5">
                        <Skeleton className="h-5 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => {
                  const actualIndex = (currentPage - 1) * pageSize + rowIdx;
                  return (
                    <tr key={row.id || rowIdx} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      {columns.map((col, colIdx) => (
                        <td key={col.id || col.accessorKey || colIdx} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {col.cell ? col.cell({ row: { original: row, index: actualIndex } }) : row[col.accessorKey] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState title="No records found" description="Try adjusting your search query." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, sortedData.length)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{sortedData.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-slate-700 dark:text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
