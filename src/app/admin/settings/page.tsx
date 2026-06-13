'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AcademicYearForm } from '@/components/admin/academic-year-form'
import { ClassForm } from '@/components/admin/class-form'
import { PromotionTool } from '@/components/admin/promotion-tool'
import { SchoolProfileForm } from '@/components/admin/school-profile-form'
import { SettingsForm } from '@/components/admin/settings-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/use-permissions'

interface AcademicYearItem {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  classes_count: number
  terms: Array<{
    id: string
    name: string
    start_date: string
    end_date: string
  }>
}

interface AcademicYearsPayload {
  academic_years: AcademicYearItem[]
}

interface ClassItem {
  id: string
  academic_year_id: string
  academic_year_name: string
  name: string
  section: string | null
  display_name: string
  room_number: string | null
  max_students: number
  class_teacher_id: string | null
  class_teacher_name: string | null
  current_students: number
}

interface TeacherOption {
  id: string
  name: string
}

interface ClassesPayload {
  academic_years: Array<{ id: string; name: string; is_current: boolean }>
  current_academic_year_id: string | null
  teachers: TeacherOption[]
  classes: ClassItem[]
}

interface TermDraft {
  name: string
  start_date: string
  end_date: string
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

export default function SettingsPage() {
  const { can, loading: permissionLoading } = usePermissions()
  const canManageSchoolSettings = can('SETTINGS.manage_school_settings')
  const canManageAcademicYear = can('SETTINGS.manage_academic_year')
  const canPromoteStudents = can('STUDENTS.promote')

  const tabs = useMemo(() => {
    const entries: Array<{ key: string; label: string }> = []
    if (canManageSchoolSettings) {
      entries.push({ key: 'general', label: 'General' })
    }
    if (canManageAcademicYear) {
      entries.push({ key: 'academic-years', label: 'Academic Years' })
    }
    if (canManageSchoolSettings) {
      entries.push({ key: 'classes', label: 'Classes' })
    }
    if (canPromoteStudents) {
      entries.push({ key: 'promotion', label: 'Promotion' })
    }
    if (canManageSchoolSettings) {
      entries.push({ key: 'school-profile', label: 'School Profile' })
    }
    return entries
  }, [canManageAcademicYear, canManageSchoolSettings, canPromoteStudents])

  const [activeTab, setActiveTab] = useState<string>('')

  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([])
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false)
  const [termDrafts, setTermDrafts] = useState<Record<string, TermDraft>>({})

  const [classesPayload, setClassesPayload] = useState<ClassesPayload | null>(null)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [selectedClassYearId, setSelectedClassYearId] = useState('')
  const [copySourceYearId, setCopySourceYearId] = useState('')
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)

  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].key)
    }
  }, [activeTab, tabs])

  const loadAcademicYears = async () => {
    setLoadingAcademicYears(true)
    try {
      const data = await parseApi<AcademicYearsPayload>(
        await fetch('/api/settings/academic-years', { cache: 'no-store' })
      )
      setAcademicYears(data.academic_years || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load academic years'
      toast.error(message)
    } finally {
      setLoadingAcademicYears(false)
    }
  }

  const loadClasses = async (academicYearId?: string) => {
    setLoadingClasses(true)
    try {
      const query = academicYearId
        ? `?academic_year_id=${encodeURIComponent(academicYearId)}`
        : ''
      const data = await parseApi<ClassesPayload>(
        await fetch(`/api/settings/classes${query}`, { cache: 'no-store' })
      )
      setClassesPayload(data)

      const nextYearId =
        academicYearId ||
        selectedClassYearId ||
        data.current_academic_year_id ||
        data.academic_years[0]?.id ||
        ''

      setSelectedClassYearId(nextYearId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load classes'
      toast.error(message)
    } finally {
      setLoadingClasses(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'academic-years' && canManageAcademicYear) {
      void loadAcademicYears()
    }
  }, [activeTab, canManageAcademicYear])

  useEffect(() => {
    if (activeTab === 'classes' && canManageSchoolSettings) {
      void loadClasses(selectedClassYearId || undefined)
    }
  }, [activeTab, canManageSchoolSettings, selectedClassYearId])

  const activateAcademicYear = async (academicYearId: string) => {
    try {
      await parseApi(
        await fetch(`/api/settings/academic-years/${academicYearId}/activate`, {
          method: 'POST',
        })
      )
      toast.success('Academic year activated')
      await Promise.all([
        loadAcademicYears(),
        loadClasses(selectedClassYearId || undefined),
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to activate year'
      toast.error(message)
    }
  }

  const createTerm = async (academicYearId: string) => {
    const draft = termDrafts[academicYearId]
    if (!draft?.name || !draft.start_date || !draft.end_date) {
      toast.error('Provide term name, start date, and end date')
      return
    }

    try {
      await parseApi(
        await fetch(`/api/settings/academic-years/${academicYearId}/terms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
      )
      setTermDrafts((current) => ({
        ...current,
        [academicYearId]: { name: '', start_date: '', end_date: '' },
      }))
      toast.success('Term added')
      await loadAcademicYears()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create term'
      toast.error(message)
    }
  }

  const copyClassesFromPreviousYear = async () => {
    if (!selectedClassYearId || !copySourceYearId) {
      toast.error('Select target and source academic years')
      return
    }
    if (selectedClassYearId === copySourceYearId) {
      toast.error('Source and target academic years must be different')
      return
    }

    try {
      const data = await parseApi<{ created_count: number; skipped_count: number }>(
        await fetch('/api/settings/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academic_year_id: selectedClassYearId,
            copy_from_academic_year_id: copySourceYearId,
          }),
        })
      )
      toast.success(
        `Copied ${data.created_count} classes (skipped ${data.skipped_count})`
      )
      await loadClasses(selectedClassYearId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy classes'
      toast.error(message)
    }
  }

  const deleteClass = async (classId: string) => {
    const proceed = window.confirm('Delete this class? This action cannot be undone.')
    if (!proceed) {
      return
    }

    try {
      await parseApi(
        await fetch(`/api/settings/classes/${classId}`, {
          method: 'DELETE',
        })
      )
      toast.success('Class deleted')
      await loadClasses(selectedClassYearId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete class'
      toast.error(message)
    }
  }

  if (permissionLoading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">School Settings</h1>
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    )
  }

  if (tabs.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">School Settings</h1>
        <p className="text-muted-foreground">
          You do not have access to school settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">School Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure academic cycles, classes, promotions, and school profile.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {canManageSchoolSettings ? (
          <TabsContent value="general" className="pt-4">
            <SettingsForm />
          </TabsContent>
        ) : null}

        {canManageAcademicYear ? (
          <TabsContent value="academic-years" className="space-y-4 pt-4">
            <AcademicYearForm onCreated={loadAcademicYears} />

            <Card>
              <CardHeader>
                <CardTitle>Academic Years</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAcademicYears ? (
                  <p className="text-sm text-muted-foreground">Loading academic years...</p>
                ) : null}

                {!loadingAcademicYears && academicYears.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No academic years found yet.
                  </p>
                ) : null}

                {academicYears.map((year) => (
                  <div key={year.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{year.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {year.start_date} to {year.end_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {year.is_current ? <Badge variant="success">Current</Badge> : null}
                        <Badge variant="secondary">Classes: {year.classes_count}</Badge>
                        {!year.is_current ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void activateAcademicYear(year.id)}
                          >
                            Activate
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Terms</p>
                      <div className="space-y-2">
                        {year.terms.map((term) => (
                          <div
                            key={term.id}
                            className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                          >
                            <span>{term.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {term.start_date} to {term.end_date}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-2 md:grid-cols-4">
                        <Input
                          placeholder="Term Name"
                          value={termDrafts[year.id]?.name || ''}
                          onChange={(event) =>
                            setTermDrafts((current) => ({
                              ...current,
                              [year.id]: {
                                ...(current[year.id] || {
                                  name: '',
                                  start_date: '',
                                  end_date: '',
                                }),
                                name: event.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          type="date"
                          value={termDrafts[year.id]?.start_date || ''}
                          onChange={(event) =>
                            setTermDrafts((current) => ({
                              ...current,
                              [year.id]: {
                                ...(current[year.id] || {
                                  name: '',
                                  start_date: '',
                                  end_date: '',
                                }),
                                start_date: event.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          type="date"
                          value={termDrafts[year.id]?.end_date || ''}
                          onChange={(event) =>
                            setTermDrafts((current) => ({
                              ...current,
                              [year.id]: {
                                ...(current[year.id] || {
                                  name: '',
                                  start_date: '',
                                  end_date: '',
                                }),
                                end_date: event.target.value,
                              },
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void createTerm(year.id)}
                        >
                          Add Term
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canManageSchoolSettings ? (
          <TabsContent value="classes" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={selectedClassYearId}
                      onChange={(event) => setSelectedClassYearId(event.target.value)}
                    >
                      <option value="">Select year</option>
                      {(classesPayload?.academic_years || []).map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Copy Classes From</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={copySourceYearId}
                      onChange={(event) => setCopySourceYearId(event.target.value)}
                    >
                      <option value="">Select source year</option>
                      {(classesPayload?.academic_years || [])
                        .filter((year) => year.id !== selectedClassYearId)
                        .map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copyClassesFromPreviousYear()}
                      disabled={!selectedClassYearId || !copySourceYearId}
                    >
                      Copy from Previous Year
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedClassYearId ? (
              <ClassForm
                academicYearId={selectedClassYearId}
                teachers={classesPayload?.teachers || []}
                onSaved={async () => {
                  setEditingClass(null)
                  await loadClasses(selectedClassYearId)
                }}
              />
            ) : null}

            {editingClass ? (
              <ClassForm
                mode="edit"
                classId={editingClass.id}
                academicYearId={editingClass.academic_year_id}
                teachers={classesPayload?.teachers || []}
                initialValues={{
                  name: editingClass.name,
                  section: editingClass.section || '',
                  max_students: editingClass.max_students,
                  room_number: editingClass.room_number || '',
                  class_teacher_id: editingClass.class_teacher_id,
                }}
                onSaved={async () => {
                  setEditingClass(null)
                  await loadClasses(selectedClassYearId)
                }}
                onCancel={() => setEditingClass(null)}
              />
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <p className="text-sm text-muted-foreground">Loading classes...</p>
                ) : null}
                {!loadingClasses && (classesPayload?.classes || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes found for the selected academic year.
                  </p>
                ) : null}
                {!loadingClasses && (classesPayload?.classes || []).length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left">Class</th>
                          <th className="px-3 py-2 text-left">Room</th>
                          <th className="px-3 py-2 text-left">Teacher</th>
                          <th className="px-3 py-2 text-left">Max</th>
                          <th className="px-3 py-2 text-left">Current</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(classesPayload?.classes || []).map((schoolClass) => (
                          <tr key={schoolClass.id} className="border-t">
                            <td className="px-3 py-2">{schoolClass.display_name}</td>
                            <td className="px-3 py-2">{schoolClass.room_number || '-'}</td>
                            <td className="px-3 py-2">{schoolClass.class_teacher_name || '-'}</td>
                            <td className="px-3 py-2">{schoolClass.max_students}</td>
                            <td className="px-3 py-2">{schoolClass.current_students}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingClass(schoolClass)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void deleteClass(schoolClass.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canPromoteStudents ? (
          <TabsContent value="promotion" className="pt-4">
            <PromotionTool />
          </TabsContent>
        ) : null}

        {canManageSchoolSettings ? (
          <TabsContent value="school-profile" className="pt-4">
            <SchoolProfileForm />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
