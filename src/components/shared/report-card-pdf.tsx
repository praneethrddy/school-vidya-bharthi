'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: 10 },
  schoolName: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  examName: { fontSize: 16, color: '#555', marginBottom: 5 },
  termName: { fontSize: 12, color: '#777' },
  studentInfoCard: { marginBottom: 25, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between' },
  infoColumn: { display: 'flex', flexDirection: 'column', gap: 4 },
  infoLabel: { fontSize: 10, color: '#666', marginBottom: 2 },
  infoValue: { fontSize: 12, fontWeight: 'bold' },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ddd', borderRightWidth: 0, borderBottomWidth: 0, marginBottom: 20 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableHeaderCol: { width: '25%', borderStyle: 'solid', borderColor: '#ddd', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5 },
  tableCol: { width: '25%', borderStyle: 'solid', borderColor: '#ddd', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  tableCellHeader: { margin: 'auto', fontSize: 10, fontWeight: 'bold' },
  tableCell: { margin: 'auto', fontSize: 10 },
  summaryBox: { marginTop: 10, padding: 15, border: '1px solid #ddd', borderRadius: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryText: { fontSize: 12, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: 20 },
  signatureBox: { width: 120, alignItems: 'center' },
  signatureLine: { width: '100%', borderTop: '1px solid #000', marginBottom: 5 },
  signatureText: { fontSize: 10 }
})

export default function ReportCardPDF({ data }: { data: any }) {
  if (!data) return <Document><Page></Page></Document>

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{data.schoolName}</Text>
          <Text style={styles.examName}>{data.examName} Report Card</Text>
          <Text style={styles.termName}>{data.termName}</Text>
        </View>

        <View style={styles.studentInfoCard}>
          <View style={styles.infoColumn}>
            <View>
              <Text style={styles.infoLabel}>Student Name</Text>
              <Text style={styles.infoValue}>{data.studentName}</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.infoLabel}>Class & Section</Text>
              <Text style={styles.infoValue}>{data.className}</Text>
            </View>
          </View>
          <View style={styles.infoColumn}>
            <View>
              <Text style={styles.infoLabel}>Roll Number</Text>
              <Text style={styles.infoValue}>{data.rollNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableHeaderCol}><Text style={styles.tableCellHeader}>Subject</Text></View>
            <View style={styles.tableHeaderCol}><Text style={styles.tableCellHeader}>Max Marks</Text></View>
            <View style={styles.tableHeaderCol}><Text style={styles.tableCellHeader}>Obtained</Text></View>
            <View style={styles.tableHeaderCol}><Text style={styles.tableCellHeader}>Grade</Text></View>
          </View>
          
          {data.subjects?.map((sub: any, i: number) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{sub.subject_name}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{sub.max_marks}</Text></View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {sub.marks_obtained !== null ? sub.marks_obtained : '-'}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {data.grading_scheme === 'PERCENTAGE' 
                    ? (sub.marks_obtained !== null ? (sub.is_passed ? 'PASS' : 'FAIL') : '-')
                    : (sub.grade || '-')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total Marks:</Text>
            <Text style={styles.summaryText}>{data.total_obtained} / {data.total_max}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Percentage:</Text>
            <Text style={styles.summaryText}>{data.percentage}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Overall Grade:</Text>
            <Text style={styles.summaryText}>{data.overall_grade}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureText}>Class Teacher</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureText}>Principal</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
