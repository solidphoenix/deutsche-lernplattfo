import { readFile } from 'node:fs/promises'
import { PDFParse } from 'pdf-parse'

const storyPatterns = [
  /Fallbeispiel[:\s]+([\s\S]+?)(?=\n\n[A-ZÄÖÜ]|Aufgabe|Frage|$)/i,
  /Lernsituation[:\s]+([\s\S]+?)(?=\n\n[A-ZÄÖÜ]|Aufgabe|Frage|$)/i,
  /Story[:\s]+([\s\S]+?)(?=\n\n[A-ZÄÖÜ]|Aufgabe|Frage|$)/i
]

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractTextFromPdf(filePath: string) {
  const buffer = await readFile(filePath)
  const parser = new PDFParse({ data: new Uint8Array(buffer) })

  try {
    const result = await parser.getText()
    return normalizePdfText(result.text ?? '')
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

export function buildGroundingExcerpt(text: string, maxLength = 9000) {
  for (const pattern of storyPatterns) {
    const match = text.match(pattern)
    if (match?.[1]?.trim()) {
      return match[1].trim().slice(0, maxLength)
    }
  }

  const longestParagraph = text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .sort((left, right) => right.length - left.length)[0]

  return (longestParagraph || text).slice(0, maxLength).trim()
}
