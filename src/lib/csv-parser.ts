import type { ParsedCsvResult } from '@/lib/import-types'

const SUPPORTED_DELIMITERS = [',', ';', '\t'] as const

function stripUtf8Bom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
}

function splitCandidateLines(input: string): string[] {
  return input
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"'
      if (isEscapedQuote) {
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && character === delimiter) {
      count += 1
    }
  }

  return count
}

function detectDelimiter(input: string): ',' | ';' | '\t' {
  const lines = splitCandidateLines(input)
  const ranked = SUPPORTED_DELIMITERS.map((delimiter) => ({
    delimiter,
    score: lines.reduce((total, line) => total + countDelimiter(line, delimiter), 0),
  })).sort((left, right) => right.score - left.score)

  return ranked[0]?.delimiter ?? ','
}

function parseRows(input: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    const nextCharacter = input[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && character === delimiter) {
      currentRow.push(currentValue.trim())
      currentValue = ''
      continue
    }

    if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentValue.trim())
      const hasData = currentRow.some((value) => value.length > 0)
      if (hasData) {
        rows.push(currentRow)
      }
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  currentRow.push(currentValue.trim())
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const header of headers) {
    const normalized = header.toLowerCase()
    if (seen.has(normalized)) {
      duplicates.add(header)
      continue
    }
    seen.add(normalized)
  }

  return Array.from(duplicates)
}

export function parseCsv(input: string): ParsedCsvResult {
  const normalizedInput = stripUtf8Bom(input)
  const delimiter = detectDelimiter(normalizedInput)
  const rows = parseRows(normalizedInput, delimiter)

  if (rows.length === 0) {
    return {
      headers: [],
      rows: [],
      delimiter,
      duplicateHeaders: [],
      warnings: ['The uploaded file contains no data rows.'],
    }
  }

  const headerRow = rows[0].map((header, index) => {
    const fallback = `column_${index + 1}`
    return header.trim() || fallback
  })

  const duplicateHeaders = dedupeHeaders(headerRow)
  const dataRows = rows.slice(1).map((row) => {
    const record: Record<string, string> = {}

    for (let index = 0; index < headerRow.length; index += 1) {
      record[headerRow[index]] = (row[index] ?? '').trim()
    }

    return record
  })

  const warnings: string[] = []
  if (duplicateHeaders.length > 0) {
    warnings.push(
      'Duplicate headers were detected. Please confirm the column mapping before import.'
    )
  }

  if (dataRows.length === 0) {
    warnings.push('The uploaded file contains headers but no data rows.')
  }

  return {
    headers: headerRow,
    rows: dataRows,
    delimiter,
    duplicateHeaders,
    warnings,
  }
}
