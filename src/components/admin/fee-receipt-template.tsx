import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

export interface FeeReceiptTemplateData {
  schoolName: string
  schoolAddress?: string | null
  schoolPhone?: string | null
  receiptNumber: string
  paymentDate: string
  studentName: string
  className: string
  admissionNumber: string
  categoryName: string
  amountPaid: number
  paymentMode: string
  referenceNumber?: string | null
  balanceRemaining: number
  collectedBy: string
  remarks?: string | null
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 24,
  },
  titleBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 12,
    marginBottom: 14,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 700,
  },
  schoolMeta: {
    marginTop: 4,
    color: '#334155',
  },
  receiptTitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  label: {
    color: '#475569',
    fontSize: 9,
  },
  value: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 500,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  },
  block: {
    marginBottom: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  col: {
    flex: 2,
    padding: 8,
  },
  colAmount: {
    flex: 1,
    padding: 8,
    textAlign: 'right',
  },
  signatures: {
    marginTop: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 6,
    textAlign: 'center',
    color: '#334155',
  },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 8,
  },
})

function formatDate(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function FeeReceiptTemplate({ data }: { data: FeeReceiptTemplateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.schoolName}>{data.schoolName}</Text>
          {data.schoolAddress ? <Text style={styles.schoolMeta}>{data.schoolAddress}</Text> : null}
          {data.schoolPhone ? <Text style={styles.schoolMeta}>Phone: {data.schoolPhone}</Text> : null}
          <Text style={styles.receiptTitle}>FEE RECEIPT</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.row}>
            <Text>
              <Text style={styles.label}>Receipt Number: </Text>
              <Text style={styles.value}>{data.receiptNumber}</Text>
            </Text>
            <Text>
              <Text style={styles.label}>Date: </Text>
              <Text style={styles.value}>{formatDate(data.paymentDate)}</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Text>
              <Text style={styles.label}>Student: </Text>
              <Text style={styles.value}>{data.studentName}</Text>
            </Text>
            <Text>
              <Text style={styles.label}>Class: </Text>
              <Text style={styles.value}>{data.className}</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Text>
              <Text style={styles.label}>Admission Number: </Text>
              <Text style={styles.value}>{data.admissionNumber}</Text>
            </Text>
            <Text>
              <Text style={styles.label}>Mode: </Text>
              <Text style={styles.value}>{data.paymentMode}</Text>
            </Text>
          </View>
          {data.referenceNumber ? (
            <View style={styles.row}>
              <Text>
                <Text style={styles.label}>Reference Number: </Text>
                <Text style={styles.value}>{data.referenceNumber}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Fee Category</Text>
            <Text style={styles.colAmount}>Amount Paid</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col}>{data.categoryName}</Text>
            <Text style={styles.colAmount}>{formatAmount(data.amountPaid)}</Text>
          </View>
          <View style={styles.tableRowLast}>
            <Text style={styles.col}>Balance Remaining</Text>
            <Text style={styles.colAmount}>{formatAmount(data.balanceRemaining)}</Text>
          </View>
        </View>

        {data.remarks ? (
          <View style={{ marginTop: 12 }}>
            <Text>
              <Text style={styles.label}>Remarks: </Text>
              <Text style={styles.value}>{data.remarks}</Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.signatures}>
          <Text style={styles.signLine}>Collected By: {data.collectedBy}</Text>
          <Text style={styles.signLine}>Authorized Signature</Text>
        </View>

        <Text style={styles.footer}>Computer-generated receipt. Keep this for future reference.</Text>
      </Page>
    </Document>
  )
}
