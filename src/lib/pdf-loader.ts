export interface PDFAsset {
  id: string
  fileName: string
  filePath: string
}

export const availablePDFs: PDFAsset[] = [
  {
    id: 'pdf-1',
    fileName: 'LS 1A - Lebenslanges lernen',
    filePath: '/src/assets/documents/00_LS_1A-_Lebenslanges_lernen.pdf'
  },
  {
    id: 'pdf-2',
    fileName: 'LS 2A - Mein erster Tag auf der Inneren',
    filePath: '/src/assets/documents/00a_LS_2A-Mein_erster_Tag_auf_der_Inneren_25-26.pdf'
  },
  {
    id: 'pdf-3',
    fileName: 'LS 4A - In fremden Haushalten',
    filePath: '/src/assets/documents/00_LS_4A_-_In_fremden_Haushalten-2.pdf'
  },
  {
    id: 'pdf-4',
    fileName: 'LS 5A - Schwer krank, was nun',
    filePath: '/src/assets/documents/01_LS_5A_Schwer_krank,_was_nun-3.pdf'
  },
  {
    id: 'pdf-5',
    fileName: 'LS 6A - Schmerzen und keiner glaubt dir',
    filePath: '/src/assets/documents/00a_LS_6A_-_Schmerzen_und_keiner_glaubt_dir-2.pdf'
  },
  {
    id: 'pdf-6',
    fileName: 'LS 8B - Wenn der Atem wegbleibt',
    filePath: '/src/assets/documents/LS_8B_-_Wenn_der_Atem_wegbleibt-2.pdf'
  },
  {
    id: 'pdf-7',
    fileName: 'LS 9A - Lernsituation 9A',
    filePath: '/src/assets/documents/00_Lernsituation_9A-3.pdf'
  },
  {
    id: 'pdf-8',
    fileName: 'LS 10B - Wie kann ich Herrn Seiler helfen',
    filePath: '/src/assets/documents/00_LS_10B_-_Wie_kann_ich_Herrn_Seiler_helfen-1.pdf'
  }
]
