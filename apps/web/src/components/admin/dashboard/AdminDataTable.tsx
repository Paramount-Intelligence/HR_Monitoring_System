'use client';

import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function AdminDataTable<T>({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
}: AdminDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-muted)] italic font-semibold rounded-xl border border-[var(--border-subtle)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('app-table-shell overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="app-table-head">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="app-table-row">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-xs font-semibold text-[var(--text-primary)]', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
