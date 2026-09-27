import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 700 }
  ]
})

const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontFamily: 'Inter',
    fontSize: 12
  },
  header: { 
    textAlign: 'center', 
    marginBottom: 20 
  },
  schoolName: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 5
  },
  termName: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 10
  },
  studentInfoBox: {
    padding: 10,
    border: '1pt solid #E5E7EB',
    borderRadius: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  infoCol: {
    flexDirection: 'column',
    gap: 4
  },
  b: { fontWeight: 'bold' },
  table: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: '1pt solid #E5E7EB',
    borderBottom: 'none'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #E5E7EB',
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold'
  },
  colSubject: { width: '40%', padding: 6, borderRight: '1pt solid #E5E7EB' },
  colMax: { width: '15%', padding: 6, borderRight: '1pt solid #E5E7EB', textAlign: 'center' },
  colObtained: { width: '15%', padding: 6, borderRight: '1pt solid #E5E7EB', textAlign: 'center' },
  colGrade: { width: '15%', padding: 6, borderRight: '1pt solid #E5E7EB', textAlign: 'center' },
  colRemarks: { width: '15%', padding: 6, textAlign: 'center' },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  summaryBox: {
    padding: 10,
    backgroundColor: '#F9FAFB',
    border: '1pt solid #E5E7EB',
    width: '45%'
  },
  signatureBox: {
    width: '45%',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  signatureLine: {
    width: '100%',
    borderTop: '1pt solid #000',
    marginTop: 40,
    paddingTop: 5,
    textAlign: 'center'
  }
})

interface ReportCardProps {
  schoolName: string
  termName: string
  academicYear?: string
  logoLabel?: string
  student: {
    name: string
    rollNumber: string
    className: string
  }
  grades: Array<{
    subject: string
    maxMarks: number
    obtained: number
    grade: string
    remarks: string
  }>
  summary: {
    totalMarks: number
    totalMax: number
    percentage: string
    attendance: string
    rank: number
  }
}

function getDefaultAcademicYear(): string {
  const today = new Date()
  const endYear = today.getFullYear()
  const startYear = endYear - 1

  return `${startYear}-${String(endYear).slice(-2)}`
}

export const ReportCardDocument = ({
  schoolName,
  termName,
  academicYear = getDefaultAcademicYear(),
  logoLabel = 'School Logo',
  student,
  grades,
  summary,
}: ReportCardProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.schoolName}>{schoolName}</Text>
        <Text style={styles.termName}>Report Card - {termName}</Text>
        <Text>{logoLabel}: Available on official report card</Text>
        <Text>Academic Year: {academicYear}</Text>
      </View>

      <View style={styles.studentInfoBox}>
        <View style={styles.infoCol}>
          <Text><Text style={styles.b}>Student Name:</Text> {student.name}</Text>
          <Text><Text style={styles.b}>Class:</Text> {student.className}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text><Text style={styles.b}>Roll No:</Text> {student.rollNumber}</Text>
          <Text><Text style={styles.b}>Date:</Text> {new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.colSubject}>Subject</Text>
          <Text style={styles.colMax}>Max</Text>
          <Text style={styles.colObtained}>Obtained</Text>
          <Text style={styles.colGrade}>Grade</Text>
          <Text style={styles.colRemarks}>Remarks</Text>
        </View>
        
        {grades.map((g, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colSubject}>{g.subject}</Text>
            <Text style={styles.colMax}>{g.maxMarks}</Text>
            <Text style={styles.colObtained}>{g.obtained}</Text>
            <Text style={styles.colGrade}>{g.grade}</Text>
            <Text style={styles.colRemarks}>{g.remarks || '-'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.summaryBox}>
          <Text style={[styles.b, { marginBottom: 5 }]}>Summary</Text>
          <Text>Total Marks: {summary.totalMarks} / {summary.totalMax}</Text>
          <Text>Percentage: {summary.percentage}%</Text>
          <Text>Class Rank: {summary.rank}</Text>
          {summary.attendance && <Text>Attendance: {summary.attendance}</Text>}
        </View>

        <View style={styles.signatureBox}>
          <Text style={styles.signatureLine}>Principal Signature</Text>
        </View>
      </View>
    </Page>
  </Document>
)
