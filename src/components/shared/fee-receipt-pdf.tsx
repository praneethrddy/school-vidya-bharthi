"use client"

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: 10 },
  schoolName: { fontSize: 24, fontWeight: 'bold' },
  receiptTitle: { fontSize: 16, marginTop: 10, textAlign: 'center', textDecoration: 'underline' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 10, color: '#666' },
  value: { fontSize: 10, color: '#000' },
  section: { marginTop: 20, marginBottom: 20 },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#bfbfbf' },
  tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  tableCol: { padding: 8, flex: 1, fontSize: 10 },
  tableColRight: { padding: 8, flex: 1, fontSize: 10, textAlign: 'right' },
  footer: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between' },
  signature: { borderTop: '1px solid #000', paddingTop: 5, width: 150, textAlign: 'center', fontSize: 10 },
  computerGenerated: { marginTop: 30, textAlign: 'center', fontSize: 8, color: '#999' }
})

export default function FeeReceiptPDF({ paymentData }: { paymentData: any }) {
  if (!paymentData) return null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>Vidhya Bharthi High School</Text>
          <Text style={{ fontSize: 10, marginTop: 5 }}>123 Education Lane, Knowledge City</Text>
          <Text style={{ fontSize: 10 }}>Phone: +91 98765 43210</Text>
        </View>

        <Text style={styles.receiptTitle}>FEE RECEIPT</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Receipt No: <Text style={styles.value}>{paymentData.receipt_number}</Text></Text>
            <Text style={styles.label}>Date: <Text style={styles.value}>{new Date(paymentData.payment_date).toLocaleDateString()}</Text></Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Student Name: <Text style={styles.value}>{paymentData.student?.first_name} {paymentData.student?.last_name}</Text></Text>
            <Text style={styles.label}>Admission No: <Text style={styles.value}>{paymentData.student?.admission_number}</Text></Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Class: <Text style={styles.value}>{paymentData.structure?.class?.name} {paymentData.structure?.class?.section || ''}</Text></Text>
            <Text style={styles.label}>Payment Mode: <Text style={styles.value}>{paymentData.payment_mode}</Text></Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCol}>Description</Text>
            <Text style={styles.tableColRight}>Amount</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCol}>{paymentData.structure?.category?.name || 'Fee Payment'}</Text>
            <Text style={styles.tableColRight}>Rs. {Number(paymentData.amount_paid).toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.value}>Amount paid: Rupees {Number(paymentData.amount_paid)} Only.</Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={{ fontSize: 10, marginBottom: 40}}>Cashier / Accountant</Text>
            <Text style={styles.signature}>{paymentData.collector?.first_name || 'Authorized'} {paymentData.collector?.last_name || 'Signatory'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, marginBottom: 40}}>Seal</Text>
            <Text style={styles.signature}>School Stamp</Text>
          </View>
        </View>

        <Text style={styles.computerGenerated}>This is a computer-generated receipt and does not require a physical signature.</Text>
      </Page>
    </Document>
  )
}
