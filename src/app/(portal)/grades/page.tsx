'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GradesTable } from '@/components/portal/grades-table'
import { GradePerformanceCard } from '@/components/portal/grade-performance-card'
import { SubjectChart } from '@/components/portal/subject-chart'
import { ExamTrendChart } from '@/components/portal/exam-trend-chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { pdf } from '@react-pdf/renderer'
import ReportCardPDF from '@/components/shared/report-card-pdf'

export default function GradesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('All')
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  useEffect(() => {
    async function fetchGrades() {
      try {
        setLoading(true)
        const studentId = searchParams.get('student_id')
        const url = `/api/grades${studentId ? `?student_id=${studentId}` : ''}`
        
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch grades')
        
        const data = await res.json()
        setExams(data.exams || [])
        
        if (data.exams && data.exams.length > 0) {
          setSelectedExamId(data.exams[0].id)
        }
      } catch (err: any) {
        toast.error(err.message || 'Error loading grades')
      } finally {
        setLoading(false)
      }
    }

    fetchGrades()
  }, [searchParams])

  const terms = useMemo(() => {
    const t = new Set<string>()
    exams.forEach(e => t.add(e.term))
    return ['All', ...Array.from(t)]
  }, [exams])

  const filteredExams = useMemo(() => {
    if (selectedTerm === 'All') return exams
    return exams.filter(e => e.term === selectedTerm)
  }, [exams, selectedTerm])

  const currentExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || filteredExams[0]
  }, [exams, selectedExamId, filteredExams])

  // Handle term change to auto-select the first exam in that term
  const handleTermChange = (term: string) => {
    setSelectedTerm(term)
    const availableExams = term === 'All' ? exams : exams.filter(e => e.term === term)
    if (availableExams.length > 0) {
      setSelectedExamId(availableExams[0].id)
    } else {
      setSelectedExamId('')
    }
  }

  const handleDownloadReportCard = async () => {
    if (!currentExam) return

    setIsGeneratingPDF(true)
    try {
      const studentId = searchParams.get('student_id')
      const url = `/api/grades/report-card?exam_id=${currentExam.id}${studentId ? `&student_id=${studentId}` : ''}`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch report card data')
      
      const { reportCardData } = await res.json()
      
      // Generate PDF on the client side using @react-pdf/renderer
      const blob = await pdf(<ReportCardPDF data={reportCardData} />).toBlob()
      const objectUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = objectUrl
      const fileName = `ReportCard_${reportCardData.studentName.replace(/\s+/g, '_')}_${reportCardData.examName.replace(/\s+/g, '_')}.pdf`
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      
      toast.success('Report card downloaded successfully')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to generate report card')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (exams.length === 0) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center space-y-4 rounded-xl border border-dashed text-center">
        <p className="text-lg font-medium text-muted-foreground">No grades found</p>
        <p className="text-sm text-muted-foreground">Grades will appear here once your exam results are published.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
          <p className="text-sm text-muted-foreground">View your academic performance and download report cards.</p>
        </div>

        <Button onClick={handleDownloadReportCard} disabled={isGeneratingPDF || !currentExam}>
          {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download Report Card
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-md border">
        <Tabs value={selectedTerm} onValueChange={handleTermChange} className="w-full sm:w-auto">
          <TabsList>
            {terms.map(term => (
              <TabsTrigger key={term} value={term}>{term}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filteredExams.length > 0 && (
          <Select value={selectedExamId || ''} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Exam" />
            </SelectTrigger>
            <SelectContent>
              {filteredExams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {currentExam ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <GradePerformanceCard 
                percentage={currentExam.percentage} 
                overallGrade={currentExam.overall_grade} 
                gradingScheme={currentExam.grading_scheme}
              />
            </div>
            
            <div className="md:col-span-2">
              <SubjectChart subjects={currentExam.subjects} />
            </div>
          </div>

          <GradesTable 
            subjects={currentExam.subjects}
            totalMax={currentExam.total_max}
            totalObtained={currentExam.total_obtained}
            percentage={currentExam.percentage}
            overallGrade={currentExam.overall_grade}
            gradingScheme={currentExam.grading_scheme}
          />
          
          <ExamTrendChart exams={exams} />
        </div>
      ) : (
        <div className="flex h-[200px] w-full items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Select an exam to view details</p>
        </div>
      )}
    </div>
  )
}
