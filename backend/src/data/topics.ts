export interface TopicDefinition {
  id: number
  title: string
}

export const topicDefinitions: TopicDefinition[] = [
  { id: 1, title: 'Gesetzliche Grundlagen (z.B. Ausbildungs- und Prüfungsverordnung für die Pflegeberufe, Dauer und Struktur der Ausbildung, Rechte und Pflichten des Auszubildenden, Tätigkeiten, stabile Pflegesituation)' },
  { id: 2, title: 'Anordnungs-, Durchführungs-, Übernahmeverantwortung, Remonstrationsplicht, Delegation' },
  { id: 3, title: 'Gewalt' },
  { id: 4, title: 'Hygiene (z.B. bei verschiedenen pflegerischen und therapeutischen Tätigkeiten)' },
  { id: 5, title: 'Ausscheidung (z.B. Umgang mit DK)' },
  { id: 6, title: 'Multidisziplinäre Zusammenarbeit (z.B. Mit welchen Berufsgruppen wird zusammengearbeitet?)' },
  { id: 7, title: 'Einarbeitung (z.B. Wie sollte jemand eingearbeitet werden?)' },
  { id: 8, title: 'Prävention und Gesundheitsförderung z.B. rückenschonendes arbeiten' },
  { id: 9, title: 'Kommunikation (z.B. Kommunikationsmodelle, Telefonate, Kommunikation bei Sprachbarrieren, Vorstellung)' },
  { id: 10, title: 'Ethische Prinzipien' },
  { id: 11, title: 'Vitalwerte' },
  { id: 12, title: 'Sturz' },
  { id: 13, title: 'Prophylaxen' },
  { id: 14, title: 'Einschränkungen der Seh- und Hörfähigkeit' },
  { id: 15, title: 'Diabetes mellitus' },
  { id: 16, title: 'Blutzuckermessung' },
  { id: 17, title: 'Subcutane Injektion' },
  { id: 18, title: 'Feedback (z.B. Feedback-Burger)' },
  { id: 19, title: 'Demenz' },
  { id: 20, title: 'Wundversorgung' },
  { id: 21, title: 'Medikamentengabe' },
  { id: 22, title: 'Schmerzen' },
  { id: 23, title: 'prä- und postoperative Pflege' },
  { id: 24, title: 'Regeln der Pflegedokumentation' },
  { id: 25, title: 'Lebenslanges Lernen' },
  { id: 26, title: 'Stress' },
  { id: 27, title: 'Informationsgespräch, Gespräche gestalten, Informationsübergabe' },
  { id: 28, title: 'Infektionen' },
  { id: 29, title: 'Pflegeprozess' }
]

export const validTopicIds = new Set(topicDefinitions.map((topic) => topic.id))
