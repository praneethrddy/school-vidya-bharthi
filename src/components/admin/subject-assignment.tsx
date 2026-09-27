'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Loader2 } from 'lucide-react'

interface SubjectAssignmentProps {
  assignments: any[]
  classesTaught: any[] // for class teacher
  classes: any[] // all available classes for assigning
  subjects: any[] // all subjects
  academicYears: any[]
  canEdit: boolean
  onAddAssignment: (subjectId: string, acYearId: string) => Promise<void>
  onRemoveAssignment: (assignmentId: string) => Promise<void>
  onSetClassTeacher: (classId: string | null) => Promise<void>
}

export function SubjectAssignment({
  assignments,
  classesTaught,
  classes,
  subjects,
  academicYears,
  canEdit,
  onAddAssignment,
  onRemoveAssignment,
  onSetClassTeacher
}: SubjectAssignmentProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedAcYearId, setSelectedAcYearId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Class teacher states
  const [isTeacherSubmitting, setIsTeacherSubmitting] = useState(false)
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState<string>('')

  // Filter subjects based on selected class
  const availableSubjects = subjects.filter(s => s.class_id === selectedClassId)

  const handleAddAssignment = async () => {
    if (!selectedSubjectId || !selectedAcYearId) return
    setIsSubmitting(true)
    try {
      await onAddAssignment(selectedSubjectId, selectedAcYearId)
      setIsAssignDialogOpen(false)
      setSelectedClassId('')
      setSelectedSubjectId('')
      setSelectedAcYearId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetClassTeacher = async () => {
    if (!selectedTeacherClassId) return
    setIsTeacherSubmitting(true)
    try {
      await onSetClassTeacher(selectedTeacherClassId)
      setSelectedTeacherClassId('')
    } finally {
      setIsTeacherSubmitting(false)
    }
  }

  const totalPeriods = assignments.reduce((acc, curr) => acc + (curr.subject.periods_per_week || 0), 0)
  const currentClassTeacherIds = new Set(classesTaught.map((entry) => entry.id))
  const availableTeacherClasses = classes.filter(
    (entry) => !entry.class_teacher_id || currentClassTeacherIds.has(entry.id)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Subject Assignments</CardTitle>
            <CardDescription>Subjects this staff member is assigned to teach, and their workload.</CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Subject</DialogTitle>
                  <DialogDescription>Assign a subject to this staff member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Academic Year</Label>
                    <Select value={selectedAcYearId} onValueChange={setSelectedAcYearId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map(ay => (
                          <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Class</Label>
                    <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedSubjectId('') }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.code || '-'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddAssignment} disabled={isSubmitting || !selectedSubjectId || !selectedAcYearId}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-muted p-3 rounded-lg flex-1">
              <div className="text-sm text-muted-foreground">Total Workload</div>
              <div className="text-2xl font-bold">{totalPeriods} <span className="text-sm font-normal">periods/week</span></div>
            </div>
            <div className="bg-muted p-3 rounded-lg flex-1">
              <div className="text-sm text-muted-foreground">Subjects Assigned</div>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Workload</TableHead>
                  {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length > 0 ? assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.subject.name} {a.subject.code && `(${a.subject.code})`}</TableCell>
                    <TableCell>{a.subject.class?.name} {a.subject.class?.section}</TableCell>
                    <TableCell>{a.academic_year?.name}</TableCell>
                    <TableCell>{a.subject.periods_per_week || 0} periods/wk</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemoveAssignment(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 5 : 4} className="text-center h-24 text-muted-foreground">
                      No subjects assigned.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class Teacher Assignment</CardTitle>
          <CardDescription>Assign this staff member as a class teacher.</CardDescription>
        </CardHeader>
        <CardContent>
          {classesTaught.length > 0 && (
            <div className="mb-6 space-y-2">
              <div className="text-sm font-medium">Currently Class Teacher For:</div>
              <div className="flex flex-wrap gap-2">
                {classesTaught.map(c => (
                  <Badge key={c.id} variant="secondary" className="px-3 py-1 flex items-center gap-2">
                    {c.name} {c.section} ({c.academic_year?.name})
                    {canEdit && (
                      <Trash2 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => onSetClassTeacher(null)} 
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex items-end gap-4 max-w-sm">
              <div className="flex-1 space-y-2">
                <Label>Assign New Class</Label>
                <Select value={selectedTeacherClassId} onValueChange={setSelectedTeacherClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeacherClasses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSetClassTeacher} 
                disabled={!selectedTeacherClassId || isTeacherSubmitting}
              >
                {isTeacherSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Default
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
