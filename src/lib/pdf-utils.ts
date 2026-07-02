export async function extractTextFromPDF(fileData: string): Promise<string> {
  try {
    const base64Data = fileData.split(',')[1]
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const text = String.fromCharCode.apply(null, Array.from(bytes))
    const storyMatch = text.match(/Story[:\s]+([\s\S]+?)(?=\n\n|$)/i)
    
    if (storyMatch) {
      return storyMatch[1].trim()
    }

    return text.substring(0, 5000)
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
