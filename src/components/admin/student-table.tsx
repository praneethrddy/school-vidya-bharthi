'use client'

import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Eye, Pencil, Trash2, ArrowDownAZ, ArrowUpAZ } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SortBy, SortOrder, StudentListItem } from '@/types/student-management'

interface StudentTableProps {
  students: StudentListItem[]
  loading: boolean
  page: number
  limit: number
  total: number
  sortBy: SortBy
  sortOrder: SortOrder
  canEdit: boolean
  canDelete: boolean
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('')
}

export function StudentTable({
  students,
  loading,
  page,
  limit,
  total,
  sortBy,
  sortOrder,
  canEdit,
  canDelete,
  onSortChange,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
}: StudentTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  const columns = useMemo<ColumnDef<StudentListItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all students"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
              aria-label={`Select ${row.original.name}`}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'photo_url',
        header: 'Photo',
        cell: ({ row }) => (
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.original.photo_url || undefined} alt={row.original.name} />
            <AvatarFallback className="text-xs">{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
        ),
      },
      {
        accessorKey: 'admission_number',
        header: () => (
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              onSortChange(
                'admission_number',
                sortBy === 'admission_number' && sortOrder === 'asc' ? 'desc' : 'asc'
              )
            }
          >
            Admission No.
            {sortBy === 'admission_number' && sortOrder === 'asc' ? (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            ) : null}
            {sortBy === 'admission_number' && sortOrder === 'desc' ? (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            ) : null}
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: () => (
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              onSortChange('name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
            }
          >
            Name
            {sortBy === 'name' && sortOrder === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : null}
            {sortBy === 'name' && sortOrder === 'desc' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : null}
          </button>
        ),
      },
      {
        id: 'class',
        accessorFn: (row) => row.class,
        header: () => (
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              onSortChange('class', sortBy === 'class' && sortOrder === 'asc' ? 'desc' : 'asc')
            }
          >
            Class
            {sortBy === 'class' && sortOrder === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : null}
            {sortBy === 'class' && sortOrder === 'desc' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : null}
          </button>
        ),
        cell: ({ row }) => row.original.class ?? '-',
      },
      {
        accessorKey: 'section',
        header: 'Section',
        cell: ({ row }) => row.original.section || '-',
      },
      {
        accessorKey: 'gender',
        header: 'Gender',
        cell: ({ row }) => row.original.gender || '-',
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                onView(row.original.id)
              }}
              aria-label={`View ${row.original.name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(row.original.id)
                }}
                aria-label={`Edit ${row.original.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(row.original.id)
                }}
                aria-label={`Deactivate ${row.original.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, onDelete, onEdit, onSortChange, onView, sortBy, sortOrder]
  )

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-9 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    className={!row.original.is_active ? 'text-muted-foreground' : undefined}
                    onClick={() => onView(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} students
            </>
          ) : (
            'No students found'
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          {[10, 20, 50].map((option) => (
            <Button
              key={option}
              variant={option === limit ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLimitChange(option)}
            >
              {option}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || totalPages === 0}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </span>
        </div>
      </div>

      {Object.keys(rowSelection).length > 0 ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {Object.keys(rowSelection).length} row(s) selected for future bulk actions.
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Tip: click any row to open full student profile.
      </p>

      {students.length === 0 && !loading ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Start by adding your first student record from the action bar above.
        </div>
      ) : null}

    </div>
  )
}
