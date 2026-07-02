import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function dataUrlToBytes(fileData: string): Uint8Array {
  const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

export async function extractTextFromPDF(fileData: string | ArrayBuffer): Promise<string> {
  try {
    const data = typeof fileData === 'string'
      ? dataUrlToBytes(fileData)
      : new Uint8Array(fileData)
    const loadingTask = pdfjsLib.getDocument({ data })
    const pdf = await loadingTask.promise
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (pageText) {
        pages.push(pageText)
      }
    }

    return pages.join('\n\n')
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return ''
  }
}

export function findStoryInText(text: string): string | null {
  const patterns = [
    /Story[:\s]+([\s\S]+?)(?=\n\n[A-Z]|Aufgabe|Frage|\n\n\n|$)/i,
    /Lernsituation[:\s]+([\s\S]+?)(?=\n\n[A-Z]|Aufgabe|Frage|\n\n\n|$)/i,
    /Fallbeispiel[:\s]+([\s\S]+?)(?=\n\n[A-Z]|Aufgabe|Frage|\n\n\n|$)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1].length > 100) {
      return match[1].trim()
    }
  }

  const paragraphs = text.split('\n\n')
  const longestParagraph = paragraphs.reduce((longest, current) => 
    current.length > longest.length ? current : longest, '')
  
  if (longestParagraph.length > 200) {
    return longestParagraph
  }

  return null
}
