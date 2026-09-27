'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ParentSearchResult } from '@/types/student-management'

type ParentMode = 'existing' | 'new'

interface ParentLinkDialogProps {
  studentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}

const emptyParentForm = {
  first_name: '',
  last_name: '',
  relation: '',
  phone: '',
  alternate_phone: '',
  email: '',
  occupation: '',
  address: '',
  is_primary: true,
}

export function ParentLinkDialog({
  studentId,
  open,
  onOpenChange,
  onLinked,
}: ParentLinkDialogProps) {
  const [mode, setMode] = useState<ParentMode>('existing')
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<ParentSearchResult[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [form, setForm] = useState(emptyParentForm)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || mode !== 'existing') {
      setOptions([])
      return
    }

    if (search.trim().length < 2) {
      setOptions([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(
          `/api/students?parent_search=${encodeURIComponent(search)}&limit=10`,
          { cache: 'no-store' }
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error?.message || 'Unable to search parents')
        }
        setOptions(payload?.data?.parents || [])
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to search parents'
        toast.error(message)
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [mode, open, search])

  const reset = () => {
    setMode('existing')
    setSearch('')
    setOptions([])
    setSelectedParentId('')
    setForm(emptyParentForm)
  }

  const handleSubmit = async () => {
    if (mode === 'existing' && !selectedParentId) {
      toast.error('Select a parent to link')
      return
    }

    if (mode === 'new' && (!form.first_name || !form.last_name || !form.phone)) {
      toast.error('Parent first name, last name, and phone are required')
      return
    }

    const payload =
      mode === 'existing'
        ? {
            parent_link: {
              existing_parent_id: selectedParentId,
              is_primary: form.is_primary,
            },
          }
        : {
            parent_link: {
              create_parent: {
                first_name: form.first_name,
                last_name: form.last_name,
                relation: form.relation || undefined,
                phone: form.phone,
                alternate_phone: form.alternate_phone || null,
                email: form.email || null,
                occupation: form.occupation || null,
                address: form.address || null,
              },
              is_primary: form.is_primary,
            },
          }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to link parent')
      }

      toast.success('Parent linked successfully')
      onLinked()
      onOpenChange(false)
      reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to link parent'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          reset()
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Parent</DialogTitle>
          <DialogDescription>
            Search an existing parent profile or create a new parent and link it to this student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
            >
              Existing Parent
            </Button>
            <Button
              type="button"
              variant={mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('new')}
            >
              New Parent
            </Button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label htmlFor="existing_parent_search">Search by parent name</Label>
              <Input
                id="existing_parent_search"
                placeholder="Type parent name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {searching ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {search.trim().length < 2 ? 'Type at least 2 characters' : 'No parent records found'}
                  </p>
                ) : (
                  options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${
                        selectedParentId === option.id ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedParentId(option.id)}
                    >
                      <p className="font-medium">{option.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {option.relation || 'Relation not set'}
                        {option.email ? ` • ${option.email}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {mode === 'new' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                />
              </div>
              <div>
                <Label>Relation</Label>
                <Select
                  value={form.relation || 'UNSET'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      relation: value === 'UNSET' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Not specified</SelectItem>
                    <SelectItem value="FATHER">Father</SelectItem>
                    <SelectItem value="MOTHER">Mother</SelectItem>
                    <SelectItem value="GUARDIAN">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div>
                <Label>Alternate Phone</Label>
                <Input
                  value={form.alternate_phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, alternate_phone: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Occupation</Label>
                <Input
                  value={form.occupation}
                  onChange={(event) => setForm((current) => ({ ...current, occupation: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  rows={3}
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                />
              </div>
            </div>
          ) : null}

          <div>
            <Label>Primary Parent</Label>
            <Select
              value={form.is_primary ? 'YES' : 'NO'}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  is_primary: value === 'YES',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YES">Set as primary</SelectItem>
                <SelectItem value="NO">Keep as secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Link Parent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

