'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import type {
  AcademicYearOption,
  ClassOption,
  ParentSearchResult,
  StudentDetail,
} from '@/types/student-management'

type FormMode = 'create' | 'edit'
type ParentMode = 'none' | 'existing' | 'new'

interface StudentFormProps {
  open: boolean
  mode: FormMode
  classes: ClassOption[]
  academicYears: AcademicYearOption[]
  initialStudent?: StudentDetail | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface FormState {
  admission_number: string
  first_name: string
  last_name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | ''
  date_of_birth: string
  blood_group: string
  phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  photo_url: string
  class_id: string
  academic_year_id: string
  admission_date: string
  roll_number: string
  is_active: boolean
}

interface ParentState {
  first_name: string
  last_name: string
  relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | ''
  phone: string
  alternate_phone: string
  email: string
  occupation: string
  address: string
  is_primary: boolean
}

const emptyFormState: FormState = {
  admission_number: '',
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  blood_group: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  photo_url: '',
  class_id: '',
  academic_year_id: '',
  admission_date: '',
  roll_number: '',
  is_active: true,
}

const emptyParentState: ParentState = {
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

function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

export function StudentForm({
  open,
  mode,
  classes,
  academicYears,
  initialStudent,
  onOpenChange,
  onSaved,
}: StudentFormProps) {
  const [form, setForm] = useState<FormState>(emptyFormState)
  const [parentMode, setParentMode] = useState<ParentMode>('none')
  const [parentSearch, setParentSearch] = useState('')
  const [parentOptions, setParentOptions] = useState<ParentSearchResult[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [newParent, setNewParent] = useState<ParentState>(emptyParentState)
  const [createUser, setCreateUser] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [manualPassword, setManualPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchingParents, setSearchingParents] = useState(false)

  const activeClass = useMemo(
    () => classes.find((classOption) => classOption.id === form.class_id),
    [classes, form.class_id]
  )

  useEffect(() => {
    if (!open) {
      return
    }

    if (mode === 'edit' && initialStudent) {
      setForm({
        admission_number: initialStudent.admission_number,
        first_name: initialStudent.first_name,
        last_name: initialStudent.last_name,
        gender: initialStudent.gender ?? '',
        date_of_birth: toDateInput(initialStudent.date_of_birth),
        blood_group: initialStudent.blood_group ?? '',
        phone: initialStudent.phone ?? '',
        address: initialStudent.address ?? '',
        emergency_contact_name: initialStudent.emergency_contact_name ?? '',
        emergency_contact_phone: initialStudent.emergency_contact_phone ?? '',
        photo_url: initialStudent.photo_url ?? '',
        class_id: initialStudent.class_id ?? '',
        academic_year_id: initialStudent.academic_year_id ?? '',
        admission_date: toDateInput(initialStudent.admission_date),
        roll_number: initialStudent.roll_number ?? '',
        is_active: initialStudent.is_active,
      })
      setParentMode('none')
      setCreateUser(false)
      setGeneratedPassword(null)
      return
    }

    setForm(emptyFormState)
    setParentMode('none')
    setParentSearch('')
    setParentOptions([])
    setSelectedParentId('')
    setNewParent(emptyParentState)
    setCreateUser(false)
    setUserEmail('')
    setAutoGeneratePassword(true)
    setManualPassword('')
    setGeneratedPassword(null)
  }, [initialStudent, mode, open])

  useEffect(() => {
    if (parentMode !== 'existing') {
      setParentOptions([])
      return
    }

    if (parentSearch.trim().length < 2) {
      setParentOptions([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchingParents(true)
      try {
        const response = await fetch(
          `/api/students?parent_search=${encodeURIComponent(parentSearch)}&limit=10`,
          { cache: 'no-store' }
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error?.message || 'Failed to search parents')
        }
        setParentOptions(payload?.data?.parents || [])
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to search parents'
        toast.error(message)
        setParentOptions([])
      } finally {
        setSearchingParents(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [parentMode, parentSearch])

  useEffect(() => {
    if (activeClass && !form.academic_year_id) {
      setForm((current) => ({ ...current, academic_year_id: activeClass.academic_year_id }))
    }
  }, [activeClass, form.academic_year_id])

  const handleSubmit = async () => {
    if (!form.admission_number || !form.first_name || !form.last_name || !form.date_of_birth) {
      toast.error('Admission number, name, and date of birth are required')
      return
    }

    if (!form.class_id) {
      toast.error('Class assignment is required')
      return
    }

    if (createUser && !userEmail) {
      toast.error('Student account email is required')
      return
    }

    if (createUser && !autoGeneratePassword && !manualPassword) {
      toast.error('Enter a password or enable auto-generate password')
      return
    }

    if (parentMode === 'existing' && !selectedParentId) {
      toast.error('Select an existing parent to link')
      return
    }

    if (parentMode === 'new' && (!newParent.first_name || !newParent.last_name || !newParent.phone)) {
      toast.error('Parent first name, last name, and phone are required')
      return
    }

    const payload: Record<string, unknown> = {
      admission_number: form.admission_number,
      first_name: form.first_name,
      last_name: form.last_name,
      gender: form.gender || undefined,
      date_of_birth: form.date_of_birth,
      blood_group: form.blood_group || null,
      phone: form.phone || null,
      address: form.address || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      photo_url: form.photo_url || null,
      class_id: form.class_id,
      academic_year_id: form.academic_year_id || undefined,
      admission_date: form.admission_date || undefined,
      roll_number: form.roll_number || null,
      is_active: form.is_active,
    }

    if (mode === 'create' && parentMode !== 'none') {
      payload.parent =
        parentMode === 'existing'
          ? { existing_parent_id: selectedParentId, is_primary: newParent.is_primary }
          : {
              create_parent: {
                first_name: newParent.first_name,
                last_name: newParent.last_name,
                relation: newParent.relation || undefined,
                phone: newParent.phone,
                alternate_phone: newParent.alternate_phone || null,
                email: newParent.email || null,
                occupation: newParent.occupation || null,
                address: newParent.address || null,
              },
              is_primary: newParent.is_primary,
            }
    }

    if (mode === 'create' && createUser) {
      payload.account = {
        create_user: true,
        email: userEmail,
        auto_generate_password: autoGeneratePassword,
        password: autoGeneratePassword ? undefined : manualPassword,
      }
    }

    setSubmitting(true)
    try {
      const endpoint = mode === 'create' ? '/api/students' : `/api/students/${initialStudent?.id}`
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to save student')
      }

      const oneTimePassword = result?.data?.generated_password ?? null
      setGeneratedPassword(oneTimePassword)
      toast.success(mode === 'create' ? 'Student created successfully' : 'Student updated successfully')
      if (oneTimePassword) {
        toast.info(`Generated password: ${oneTimePassword}`, { duration: 15000 })
      }
      onSaved()

      if (!oneTimePassword) {
        onOpenChange(false)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save student'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Student' : 'Edit Student'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a student record, link a parent, and optionally generate login credentials.'
              : 'Update student profile and academic details.'}
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Generated password (shown only once)
            </p>
            <p className="mt-1 font-mono text-sm text-amber-800">{generatedPassword}</p>
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Step 1 - Personal</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="admission_number">Admission Number</Label>
                <Input
                  id="admission_number"
                  value={form.admission_number}
                  onChange={(event) => setForm((current) => ({ ...current, admission_number: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="roll_number">Roll Number</Label>
                <Input
                  id="roll_number"
                  value={form.roll_number}
                  onChange={(event) => setForm((current) => ({ ...current, roll_number: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date_of_birth: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={form.gender || 'UNSET'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      gender: value === 'UNSET' ? '' : (value as FormState['gender']),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Not specified</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="blood_group">Blood Group</Label>
                <Input
                  id="blood_group"
                  value={form.blood_group}
                  onChange={(event) => setForm((current) => ({ ...current, blood_group: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="photo_url">Photo URL</Label>
                <Input
                  id="photo_url"
                  value={form.photo_url}
                  onChange={(event) => setForm((current) => ({ ...current, photo_url: event.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Step 2 - Contact</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={form.emergency_contact_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergency_contact_name: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={form.emergency_contact_phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergency_contact_phone: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Step 3 - Academic</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Class</Label>
                <Select
                  value={form.class_id || 'UNSET'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      class_id: value === 'UNSET' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Select class</SelectItem>
                    {classes.map((classOption) => (
                      <SelectItem key={classOption.id} value={classOption.id}>
                        {classOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Academic Year</Label>
                <Select
                  value={form.academic_year_id || 'UNSET'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      academic_year_id: value === 'UNSET' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">Select year</SelectItem>
                    {academicYears.map((yearOption) => (
                      <SelectItem key={yearOption.id} value={yearOption.id}>
                        {yearOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admission Date</Label>
                <Input
                  type="date"
                  value={form.admission_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, admission_date: event.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.is_active ? 'ACTIVE' : 'INACTIVE'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_active: value === 'ACTIVE',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {mode === 'create' ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Step 4 - Parent</h3>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={parentMode === 'none' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setParentMode('none')}
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  variant={parentMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setParentMode('existing')}
                >
                  Link Existing Parent
                </Button>
                <Button
                  type="button"
                  variant={parentMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setParentMode('new')}
                >
                  Create New Parent
                </Button>
              </div>

              {parentMode === 'existing' ? (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="parent_search">Search Parent by Name</Label>
                  <Input
                    id="parent_search"
                    placeholder="Type parent name..."
                    value={parentSearch}
                    onChange={(event) => setParentSearch(event.target.value)}
                  />
                  {searchingParents ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                    {parentOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {parentSearch.length < 2 ? 'Type at least 2 characters' : 'No parents found'}
                      </p>
                    ) : (
                      parentOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`w-full rounded-md border px-2 py-1 text-left text-sm ${
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
                  {selectedParentId ? <Badge variant="success">Parent selected</Badge> : null}
                </div>
              ) : null}

              {parentMode === 'new' ? (
                <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                  <div>
                    <Label>Parent First Name</Label>
                    <Input
                      value={newParent.first_name}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, first_name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Parent Last Name</Label>
                    <Input
                      value={newParent.last_name}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, last_name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Relation</Label>
                    <Select
                      value={newParent.relation || 'UNSET'}
                      onValueChange={(value) =>
                        setNewParent((current) => ({
                          ...current,
                          relation: value === 'UNSET' ? '' : (value as ParentState['relation']),
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
                      value={newParent.phone}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Alternate Phone</Label>
                    <Input
                      value={newParent.alternate_phone}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, alternate_phone: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={newParent.email}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Occupation</Label>
                    <Input
                      value={newParent.occupation}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, occupation: event.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={newParent.address}
                      onChange={(event) =>
                        setNewParent((current) => ({ ...current, address: event.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {mode === 'create' ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Step 5 - Account</h3>
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Create login account for this student</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={createUser ? 'default' : 'outline'}
                    onClick={() => setCreateUser((current) => !current)}
                  >
                    {createUser ? 'Enabled' : 'Enable'}
                  </Button>
                </div>

                {createUser ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <Input value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
                    </div>

                    <div>
                      <Label>Password mode</Label>
                      <Select
                        value={autoGeneratePassword ? 'AUTO' : 'MANUAL'}
                        onValueChange={(value) => setAutoGeneratePassword(value === 'AUTO')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTO">Auto-generate password</SelectItem>
                          <SelectItem value="MANUAL">Set password manually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!autoGeneratePassword ? (
                      <div className="md:col-span-2">
                        <Label>Manual Password</Label>
                        <Input
                          type="password"
                          value={manualPassword}
                          onChange={(event) => setManualPassword(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? 'Create Student' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
