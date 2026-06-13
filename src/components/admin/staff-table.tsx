'use client'

import { useMemo } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Edit, Eye, MoreHorizontal, Trash } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StaffListItem, StaffSortBy, StaffSortOrder } from '@/types/staff-management'

interface StaffTableProps {
  data: StaffListItem[]
  loading: boolean
  page: number
  limit: number
  total: number
  sortBy: StaffSortBy
  sortOrder: StaffSortOrder
  canEdit: boolean
  canDelete: boolean
  onSortChange: (sortBy: StaffSortBy, sortOrder: StaffSortOrder) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const LIMIT_OPTIONS = [10, 20, 50]

function createSortButton(
  label: string,
  active: boolean,
  order: StaffSortOrder,
  onClick: () => void
) {
  return (
    <Button variant="ghost" className="-ml-3 h-8 px-3" onClick={onClick}>
      {label}
      <ArrowUpDown
        className={`ml-2 h-4 w-4 ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      />
      <span className="sr-only">Sort {order === 'asc' ? 'ascending' : 'descending'}</span>
    </Button>
  )
}

export function StaffTable({
  data,
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
}: StaffTableProps) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  const columns = useMemo<ColumnDef<StaffListItem>[]>(() => {
    const handleSort = (target: StaffSortBy) => {
      if (sortBy === target) {
        onSortChange(target, sortOrder === 'asc' ? 'desc' : 'asc')
        return
      }
      onSortChange(target, 'asc')
    }

    return [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Select all"
            disabled
          />
        ),
        cell: () => <Checkbox aria-label="Select row" disabled />,
      },
      {
        accessorKey: 'photo_url',
        header: 'Photo',
        cell: ({ row }) => {
          const first = row.original.first_name
          const last = row.original.last_name
          const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
          return (
            <Avatar className="h-8 w-8">
              {row.original.photo_url ? (
                <AvatarImage src={row.original.photo_url} alt={`${first} ${last}`} />
              ) : null}
              <AvatarFallback>{initials || 'ST'}</AvatarFallback>
            </Avatar>
          )
        },
      },
      {
        accessorKey: 'employee_code',
        header: () =>
          createSortButton('Emp. Code', sortBy === 'employee_code', sortOrder, () =>
            handleSort('employee_code')
          ),
        cell: ({ row }) => row.original.employee_code || '-',
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: () =>
          createSortButton('Name', sortBy === 'first_name', sortOrder, () =>
            handleSort('first_name')
          ),
      },
      {
        accessorKey: 'designation',
        header: 'Designation',
        cell: ({ row }) => row.original.designation || '-',
      },
      {
        accessorKey: 'department',
        header: () =>
          createSortButton('Department', sortBy === 'department', sortOrder, () =>
            handleSort('department')
          ),
        cell: ({ row }) => row.original.department || '-',
      },
      {
        accessorKey: 'user_role',
        header: 'Role',
        cell: ({ row }) => {
          if (!row.original.user_role) {
            return <span className="text-xs italic text-muted-foreground">No Account</span>
          }

          return <Badge variant="secondary">{row.original.user_role}</Badge>
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(event) => event.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  onView(row.original.id)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(row.original.id)
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canDelete && row.original.is_active ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(row.original.id)
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ]
  }, [canDelete, canEdit, onDelete, onEdit, onSortChange, onView, sortBy, sortOrder])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = total === 0 ? 0 : Math.min(page * limit, total)

  return (
    <div className="rounded-md border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
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
            {loading ? (
              Array.from({ length: Math.max(5, Math.min(limit, 10)) }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {columns.map((_, columnIndex) => (
                    <TableCell key={`loading-cell-${index}-${columnIndex}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${!row.original.is_active ? 'opacity-60' : ''}`}
                  onClick={() => onView(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No staff members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <div className="text-muted-foreground">
          Showing {from}-{to} of {total}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows:</span>
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="px-2 text-muted-foreground">
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
