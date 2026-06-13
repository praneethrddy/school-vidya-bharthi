"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

import { ExamTable, Exam } from "@/components/admin/exam-table"
import { ExamForm } from "@/components/admin/exam-form"
import { GradeEntryGrid, GradeEntry } from "@/components/admin/grade-entry-grid"
import { GradeSummary } from "@/components/admin/grade-summary"
import { ReportCardGenerator } from "@/components/admin/report-card-generator"

interface GradesClientProps {
  classes: { id: string; name: string }[]
  terms: { id: string; name: string }[]
  subjects: { id: string; name: string; class_id: string }[]
  academicYearId: string
  permissions: {
    canEdit: boolean
    canEnter: boolean
    canGenerateParams: boolean
  }
}

export function GradesClient({ classes, terms, subjects, academicYearId, permissions }: GradesClientProps) {
  const [activeTab, setActiveTab] = useState("exams")
  
  // Exams State
  const [exams, setExams] = useState<Exam[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)
  
  // Grade Entry State
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [gradesData, setGradesData] = useState<GradeEntry[]>([])
  const [gradeSummary, setGradeSummary] = useState<any>(null)
  const [examSubjectInfo, setExamSubjectInfo] = useState<{ maxMarks: number; passingMarks: number } | null>(null)

  // Report Cards State
  const [reportClassId, setReportClassId] = useState<string>("")
  const [reportTermId, setReportTermId] = useState<string>("")

  // Initial Fetches
  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/admin/exams")
      const result = await res.json()
      if (res.ok) {
        // The API returns { data: Exam[], meta: ... } inside result.data
        const examsArray = Array.isArray(result.data) ? result.data : (result.data?.data || [])
        setExams(examsArray)
      }
    } catch (e) {
      console.error(e)
      setExams([])
    }
  }

  // --- Exams logic --- //
  const handleCreateOrUpdateExam = async (payload: any) => {
    const isEdit = !!editingExam
    const url = isEdit ? `/api/admin/exams/${editingExam.id}` : "/api/admin/exams"
    const method = isEdit ? "PATCH" : "POST"

    const res = await fetch(url, {
       method,
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload)
    })
    
    if (!res.ok) {
       const err = await res.json()
       throw new Error(err.message || "Operation failed")
    }
    
    await fetchExams()
    setShowForm(false)
    setEditingExam(null)
  }

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this exam and all related grades?")) return
    
    const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" })
    if (res.ok) await fetchExams()
    else alert("Failed to delete exam")
  }

  const handleEditClick = (exam: Exam) => {
    fetch(`/api/admin/exams/${exam.id}`)
      .then(res => res.json())
      .then(body => {
         if (body.success) {
           setEditingExam(body.data)
           setShowForm(true)
         }
      })
  }

  // --- Grade Entry Logic --- //
  const fetchGrades = async (examId: string, subjectId: string) => {
    if (!examId || !subjectId) return
    const res = await fetch(`/api/admin/grades?exam_id=${examId}&subject_id=${subjectId}`)
    const body = await res.json()
    if (res.ok && body.success) {
       setGradesData(body.data.grades)
       setGradeSummary(body.data.summary)
       setExamSubjectInfo({
         maxMarks: body.data.subject.max_marks,
         passingMarks: body.data.subject.passing_marks
       })
    } else {
       setGradesData([])
       setGradeSummary(null)
       setExamSubjectInfo(null)
    }
  }

  useEffect(() => {
    if (selectedExamId && selectedSubjectId) {
       fetchGrades(selectedExamId, selectedSubjectId)
    }
  }, [selectedExamId, selectedSubjectId])

  const handleSaveGrades = async (grades: any[]) => {
    const res = await fetch("/api/admin/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exam_id: selectedExamId,
        subject_id: selectedSubjectId,
        grades
      })
    })

    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.message || "Failed to save grades")
    }

    // Refresh after save
    await fetchGrades(selectedExamId, selectedSubjectId)
    await fetchExams() // Refresh progress count in exams tab
  }

  // Helpers for Grade Selectors
  const activeExam = Array.isArray(exams) ? exams.find(e => e.id === selectedExamId) : undefined
  const availableSubjects = activeExam 
     ? subjects.filter(s => s.class_id === (classes.find(c => activeExam.class_name.includes(c.name.split(' ')[0]))?.id || s.class_id))
     : [] // Note: simplified match, backend will only return grades if subject exists in exam

  // --- Report Cards Logic --- //
  const handleBulkGenerate = async () => {
    const res = await fetch("/api/admin/report-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: reportClassId,
        term_id: reportTermId,
        academic_year_id: academicYearId
      })
    })

    const body = await res.json()
    if (!res.ok) {
      alert(body.message || "Failed to generate report cards")
      throw new Error(body.message)
    }
    alert(body.message)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-white border w-full justify-start h-12 p-1">
        <TabsTrigger value="exams" className="text-base h-10 px-8">Exams Setup</TabsTrigger>
        <TabsTrigger value="grades" className="text-base h-10 px-8">Grade Entry</TabsTrigger>
        <TabsTrigger value="reports" className="text-base h-10 px-8">Report Cards</TabsTrigger>
      </TabsList>

      <TabsContent value="exams" className="space-y-6">
        {!showForm ? (
          <>
            <div className="flex justify-between items-center bg-white p-4 rounded-md border shadow-sm">
              <p className="text-sm text-muted-foreground hidden sm:block">Manage scheduling and subjects for all exams.</p>
              {permissions.canEnter && (
                <Button onClick={() => { setEditingExam(null); setShowForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Create Exam
                </Button>
              )}
            </div>
            <ExamTable 
              exams={exams} 
              onEdit={handleEditClick} 
              onDelete={handleDeleteExam}
              canEdit={permissions.canEnter}
              canDelete={permissions.canEdit} // PRINCIPAL
            />
          </>
        ) : (
          <ExamForm 
            initialData={editingExam}
            classes={classes}
            terms={terms}
            subjects={subjects}
            academicYearId={academicYearId}
            onSubmit={handleCreateOrUpdateExam}
            onCancel={() => { setShowForm(false); setEditingExam(null); }}
          />
        )}
      </TabsContent>

      <TabsContent value="grades" className="space-y-6">
         <div className="bg-white p-4 rounded-md border shadow-sm flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Select Exam</label>
              <Select onValueChange={setSelectedExamId} value={selectedExamId}>
                <SelectTrigger><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.class_name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Select Subject</label>
              <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedExamId}>
                <SelectTrigger><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
         </div>

         {gradeSummary && <GradeSummary summary={gradeSummary} />}

         {selectedExamId && selectedSubjectId && examSubjectInfo && (
           <GradeEntryGrid 
             grades={gradesData}
             maxMarks={examSubjectInfo.maxMarks}
             passingMarks={examSubjectInfo.passingMarks}
             onSave={handleSaveGrades}
             disabled={!permissions.canEnter}
           />
         )}
         
         {(!selectedExamId || !selectedSubjectId) && (
            <div className="p-12 text-center text-muted-foreground border rounded-md bg-muted/20">
              Please select an exam and subject to enter grades.
            </div>
         )}
      </TabsContent>

      <TabsContent value="reports" className="space-y-6">
         <div className="bg-white p-4 rounded-md border shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Class</label>
              <Select onValueChange={setReportClassId} value={reportClassId}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Term / Evaluation</label>
              <Select onValueChange={setReportTermId} value={reportTermId}>
                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
         </div>

         {reportClassId && reportTermId ? (
            <ReportCardGenerator 
              classId={reportClassId}
              termId={reportTermId}
              onGenerateBulk={handleBulkGenerate}
            />
         ) : (
            <div className="p-12 text-center text-muted-foreground border rounded-md bg-muted/20">
              Please select a class and term targeting the report card generation.
            </div>
         )}
      </TabsContent>
    </Tabs>
  )
}
