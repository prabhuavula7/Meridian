import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDownUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { currency } from '../../data/supplyChainViewModel';

const riskVariant = (value) => {
  if (value >= 0.65) return 'danger';
  if (value >= 0.45) return 'warning';
  return 'success';
};

const LanesTable = ({ data = [] }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    {
      accessorKey: 'lane',
      header: ({ column }) => (
        <button type="button" className="inline-flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Lane
          <ArrowDownUp size={13} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.lane}</p>
          <p className="text-xs text-foreground-subtle">{row.original.cargo}</p>
        </div>
      ),
    },
    {
      accessorKey: 'mode',
      header: 'Mode',
      cell: ({ getValue }) => <Badge variant="default">{String(getValue()).toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => (
        <button type="button" className="inline-flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Risk
          <ArrowDownUp size={13} />
        </button>
      ),
      cell: ({ getValue }) => {
        const value = Number(getValue());
        return <Badge variant={riskVariant(value)}>{Math.round(value * 100)}%</Badge>;
      },
    },
    {
      accessorKey: 'etaShiftDays',
      header: 'ETA Shift',
      cell: ({ getValue }) => {
        const value = Number(getValue());
        const prefix = value > 0 ? '+' : '';
        return <span className="text-sm text-foreground-muted">{prefix}{value}d</span>;
      },
    },
    {
      accessorKey: 'valueAtRisk',
      header: 'Value at Risk',
      cell: ({ getValue }) => <span className="text-sm">{currency(getValue())}</span>,
    },
    {
      accessorKey: 'recommendation',
      header: 'Recommendation',
      cell: ({ getValue }) => <span className="text-sm text-foreground-muted">{String(getValue())}</span>,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => row.original.lane.toLowerCase().includes(String(filterValue).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Filter lanes"
          className="max-w-xs"
          aria-label="Filter lanes"
        />
        <p className="text-xs text-foreground-subtle">{table.getFilteredRowModel().rows.length} lanes visible</p>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-hover/70 text-xs uppercase tracking-wide text-foreground-subtle">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2.5 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-surface-hover/55">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-subtle">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LanesTable;
