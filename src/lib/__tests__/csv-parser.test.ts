import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv-parser'

describe('csv parser', () => {
  it('parses comma-delimited CSV (TEST-CSV-001)', () => {
    const parsed = parseCsv('name,class\nAsha,Grade 6\n')

    expect(parsed.delimiter).toBe(',')
    expect(parsed.headers).toEqual(['name', 'class'])
    expect(parsed.rows).toEqual([{ name: 'Asha', class: 'Grade 6' }])
  })

  it('parses semicolon-delimited CSV (TEST-CSV-002)', () => {
    const parsed = parseCsv('name;class\nAsha;Grade 6\n')

    expect(parsed.delimiter).toBe(';')
    expect(parsed.rows[0]).toEqual({ name: 'Asha', class: 'Grade 6' })
  })

  it('parses tab-delimited CSV (TEST-CSV-003)', () => {
    const parsed = parseCsv('name\tclass\nAsha\tGrade 6\n')

    expect(parsed.delimiter).toBe('\t')
    expect(parsed.rows[0]).toEqual({ name: 'Asha', class: 'Grade 6' })
  })

  it('detects duplicate headers (TEST-CSV-004)', () => {
    const parsed = parseCsv('Name,name,class\nAsha,Riya,Grade 6\n')

    expect(parsed.duplicateHeaders).toEqual(['name'])
    expect(parsed.warnings).toContain(
      'Duplicate headers were detected. Please confirm the column mapping before import.'
    )
  })

  it('handles quoted fields with commas (TEST-CSV-005)', () => {
    const parsed = parseCsv('name,remarks\n"Asha","Line 1, Line 2"\n')

    expect(parsed.rows).toEqual([
      {
        name: 'Asha',
        remarks: 'Line 1, Line 2',
      },
    ])
  })
})
