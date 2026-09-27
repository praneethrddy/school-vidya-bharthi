import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

export function GradesTable({ 
  subjects, 
  totalMax, 
  totalObtained, 
  percentage, 
  overallGrade,
  gradingScheme 
}: { 
  subjects: any[],
  totalMax: number,
  totalObtained: number,
  percentage: number,
  overallGrade: string,
  gradingScheme: string
}) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead className="text-right">Max Marks</TableHead>
            <TableHead className="text-right">Marks Obtained</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((sub, i) => (
            <TableRow key={i} className={!sub.is_passed && sub.marks_obtained !== null ? "bg-red-500/10" : ""}>
              <TableCell className="font-medium">
                {sub.subject_name} 
                {sub.subject_code && <span className="text-xs text-muted-foreground ml-2">({sub.subject_code})</span>}
              </TableCell>
              <TableCell className="text-right">{sub.max_marks}</TableCell>
              <TableCell className="text-right">
                {sub.marks_obtained !== null ? sub.marks_obtained : <span className="text-muted-foreground italic">Pending</span>}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {gradingScheme === 'PERCENTAGE' 
                  ? (sub.marks_obtained !== null ? (sub.is_passed ? 'PASS' : 'FAIL') : '-')
                  : sub.grade || '-'
                }
              </TableCell>
              <TableCell className="text-center">
                {sub.marks_obtained !== null ? (
                  sub.is_passed ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 hover:bg-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Pass</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Fail</Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Wait</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{totalMax}</TableCell>
            <TableCell className="text-right">{totalObtained}</TableCell>
            <TableCell colSpan={2} className="text-center">
              {percentage}% | Overall Grade: <strong>{overallGrade}</strong>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
