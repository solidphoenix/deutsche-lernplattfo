export interface Topic {
  id: number
  title: string
  instructors: string[]
}

export const examTopics: Topic[] = [
  {
    id: 1,
    title: "Gesetzliche Grundlagen (z.B. Ausbildungs- und Prüfungsverordnung für die Pflegeberufe, Dauer und Struktur der Ausbildung, Rechte und Pflichten des Auszubildenden, Tätigkeiten, stabile Pflegesituation)",
    instructors: ["HuVo"]
  },
  {
    id: 2,
    title: "Anordnungs-, Durchführungs-, Übernahmeverantwortung, Remonstrationsplicht, Delegation",
    instructors: ["HuVo", "Müller"]
  },
  {
    id: 3,
    title: "Gewalt",
    instructors: ["Rediger"]
  },
  {
    id: 4,
    title: "Hygiene (z.B. bei verschiedenen pflegerischen und therapeutischen Tätigkeiten)",
    instructors: ["Schieferecke", "Moos", "Bauer"]
  },
  {
    id: 5,
    title: "Ausscheidung (z.B. Umgang mit DK)",
    instructors: ["Gollenbusch", "Moos"]
  },
  {
    id: 6,
    title: "Multidisziplinäre Zusammenarbeit (z.B. Mit welchen Berufsgruppen wird zusammengearbeitet?)",
    instructors: ["Alle"]
  },
  {
    id: 7,
    title: "Einarbeitung (z.B. Wie sollte jemand eingearbeitet werden?)",
    instructors: []
  },
  {
    id: 8,
    title: "Prävention und Gesundheitsförderung z.B. rückenschonendes arbeiten",
    instructors: ["Bauer"]
  },
  {
    id: 9,
    title: "Kommunikation (z.B. Kommunikationsmodelle, Telefonate, Kommunikation bei Sprachbarrieren, Vorstellung)",
    instructors: ["Gollenbusch"]
  },
  {
    id: 10,
    title: "Ethische Prinzipien",
    instructors: ["HuVo"]
  },
  {
    id: 11,
    title: "Vitalwerte",
    instructors: ["Moos", "Bauer"]
  },
  {
    id: 12,
    title: "Sturz",
    instructors: ["Lindrum"]
  },
  {
    id: 13,
    title: "Prophylaxen",
    instructors: ["Alle"]
  },
  {
    id: 14,
    title: "Einschränkungen der Seh- und Hörfähigkeit",
    instructors: ["Gollenbusch"]
  },
  {
    id: 15,
    title: "Diabetes mellitus",
    instructors: ["Lindrum", "HuVo"]
  },
  {
    id: 16,
    title: "Blutzuckermessung",
    instructors: ["Lindrum"]
  },
  {
    id: 17,
    title: "Subcutane Injektion",
    instructors: ["Lindrum"]
  },
  {
    id: 18,
    title: "Feedback (z.B. Feedback-Burger)",
    instructors: ["Schieferecke"]
  },
  {
    id: 19,
    title: "Demenz",
    instructors: ["Lindrum", "Moos"]
  },
  {
    id: 20,
    title: "Wundversorgung",
    instructors: ["Gollenbusch"]
  },
  {
    id: 21,
    title: "Medikamentengabe",
    instructors: ["Lindrum"]
  },
  {
    id: 22,
    title: "Schmerzen",
    instructors: ["Müller"]
  },
  {
    id: 23,
    title: "prä- und postoperative Pflege",
    instructors: ["Müller"]
  },
  {
    id: 24,
    title: "Regeln der Pflegedokumentation",
    instructors: ["Bauer"]
  },
  {
    id: 25,
    title: "Lebenslanges Lernen",
    instructors: ["Müller", "Gollenbusch"]
  },
  {
    id: 26,
    title: "Stress",
    instructors: ["Bauer", "Rediger", "Schieferecke"]
  },
  {
    id: 27,
    title: "Informationsgespräch, Gespräche gestalten, Informationsübergabe",
    instructors: ["Gollenbusch", "Bauer"]
  },
  {
    id: 28,
    title: "Infektionen",
    instructors: ["Schieferecke", "Bauer", "Moos"]
  },
  {
    id: 29,
    title: "Pflegeprozess",
    instructors: ["HuVo"]
  }
]
