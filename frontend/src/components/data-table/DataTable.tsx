'use client'

import React, { useState } from 'react'
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'

function TableSkeleton({ columnCount = 5, rowCount = 8 }: { columnCount?: number; rowCount?: number }) {
  return (
    <div className="overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-slate-950/40">
        {Array.from({ length: columnCount }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-700/40 animate-pulse" style={{ width: `${60 + Math.random() * 80}px` }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rowCount }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4 border-b border-white/5 last:border-b-0">
          {Array.from({ length: columnCount }).map((_, col) => (
            <div
              key={col}
              className="h-3.5 rounded bg-slate-700/30 animate-pulse"
              style={{
                width: `${40 + (((row * 7 + col * 13) % 5) * 20)}px`,
                animationDelay: `${(row * 0.05 + col * 0.03).toFixed(2)}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  toolbar?: React.ReactNode
  filterSlot?: React.ReactNode
  actionSlot?: React.ReactNode
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  isLoading?: boolean
  loadingMessage?: string
  enableRowSelection?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
  selectionActionSlot?: (selectedRows: TData[]) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  toolbar,
  filterSlot,
  actionSlot,
  emptyMessage = 'No records found',
  emptyIcon,
  isLoading = false,
  loadingMessage = 'Loading data...',
  enableRowSelection = false,
  onRowSelectionChange,
  selectionActionSlot,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Prepend checkbox column if row selection is enabled
  const allColumns: ColumnDef<TData, TValue>[] = enableRowSelection
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
              className="translate-y-[2px]"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="translate-y-[2px]"
            />
          ),
          enableSorting: false,
          enableHiding: false,
          size: 40,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: searchKey ? undefined : globalFilter,
      rowSelection,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      if (onRowSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)])
          .filter(Boolean)
        onRowSelectionChange(selectedRows)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Derive the search value from either global filter or column filter
  const searchValue = searchKey
    ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
    : globalFilter

  const handleSearchChange = (value: string) => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value)
    } else {
      setGlobalFilter(value)
    }
  }

  // Get currently selected rows for the action slot
  const selectedRows = enableRowSelection
    ? Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((key) => data[parseInt(key)])
        .filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      {/* Selection action bar */}
      {enableRowSelection && selectedRows.length > 0 && selectionActionSlot && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-semibold text-primary">
            {selectedRows.length} selected
          </span>
          <div className="flex items-center gap-2">
            {selectionActionSlot(selectedRows)}
          </div>
          <button
            onClick={() => setRowSelection({})}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Toolbar: either custom or built-in */}
      {toolbar ?? (
        <DataTableToolbar
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          searchPlaceholder={searchPlaceholder}
          filterSlot={filterSlot}
          actionSlot={actionSlot}
        />
      )}

      {/* Table card */}
      <Card className="shadow-2xl border-white/5 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton columnCount={columns.length} />
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            {emptyIcon && (
              <div className="text-muted-foreground/30">{emptyIcon}</div>
            )}
            <p className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="p-4" style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-white/5">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-800/25 transition-all group ${
                        row.getIsSelected() ? 'bg-primary/5' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <DataTablePagination table={table} />
          </>
        )}
      </Card>
    </div>
  )
}

