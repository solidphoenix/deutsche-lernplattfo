import { resolve } from 'node:path'
import { appConfig } from '../config.js'

export interface FallbeispielDefinition {
  id: string
  displayName: string
  fileName: string
}

export const fallbeispiele: FallbeispielDefinition[] = [
  {
    id: 'ls-1a',
    displayName: 'LS 1A - Lebenslanges lernen',
    fileName: '00_LS_1A-_Lebenslanges_lernen.pdf'
  },
  {
    id: 'ls-2a',
    displayName: 'LS 2A - Mein erster Tag auf der Inneren',
    fileName: '00a_LS_2A-Mein_erster_Tag_auf_der_Inneren_25-26.pdf'
  },
  {
    id: 'ls-4a',
    displayName: 'LS 4A - In fremden Haushalten',
    fileName: '00_LS_4A_-_In_fremden_Haushalten-2.pdf'
  },
  {
    id: 'ls-5a',
    displayName: 'LS 5A - Schwer krank, was nun',
    fileName: '01_LS_5A_Schwer_krank,_was_nun-3.pdf'
  },
  {
    id: 'ls-6a',
    displayName: 'LS 6A - Schmerzen und keiner glaubt dir',
    fileName: '00a_LS_6A_-_Schmerzen_und_keiner_glaubt_dir-2.pdf'
  },
  {
    id: 'ls-8b',
    displayName: 'LS 8B - Wenn der Atem wegbleibt',
    fileName: 'LS_8B_-_Wenn_der_Atem_wegbleibt-2.pdf'
  },
  {
    id: 'ls-9a',
    displayName: 'LS 9A - Lernsituation 9A',
    fileName: '00_Lernsituation_9A-3.pdf'
  },
  {
    id: 'ls-10b',
    displayName: 'LS 10B - Wie kann ich Herrn Seiler helfen',
    fileName: '00_LS_10B_-_Wie_kann_ich_Herrn_Seiler_helfen-1.pdf'
  }
]

export function getFallbeispielById(id: string) {
  return fallbeispiele.find((fallbeispiel) => fallbeispiel.id === id)
}

export function getFallbeispielPath(fileName: string) {
  return resolve(appConfig.fallbeispieleDir, fileName)
}
