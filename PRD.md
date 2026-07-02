# Planning Guide

Eine digitale Lernplattform für Pflegeauszubildende zur Vorbereitung auf das mündliche Examen 25/26 mit strukturierter Themenübersicht und PDF-Verwaltung für Lernsituationen.

**Experience Qualities**:
1. **Strukturiert** - Klare Organisation der 29 Prüfungsthemen ermöglicht gezieltes Lernen
2. **Vertrauenswürdig** - Professionelle medizinische Ästhetik vermittelt Seriosität und Kompetenz
3. **Zugänglich** - Intuitive Navigation und übersichtliche Darstellung erleichtern den Lernprozess

**Complexity Level**: Light Application (multiple features with basic state)
Diese Anwendung verwaltet Prüfungsthemen, PDF-Uploads und Lernfortschritte - typisch für eine fokussierte Lern-App ohne komplexe Backend-Integration.

## Essential Features

### Themenübersicht anzeigen
- **Functionality**: Zeigt alle 29 Prüfungsthemen mit zugehörigen Dozenten in einer scrollbaren Liste
- **Purpose**: Gibt Lernenden einen vollständigen Überblick über alle Prüfungsinhalte
- **Trigger**: Automatisch beim App-Start sichtbar
- **Progression**: App öffnen → Themenliste erscheint → Thema auswählen → Details/Materialien ansehen
- **Success criteria**: Alle 29 Themen sind korrekt mit Dozentennamen dargestellt und visuell unterscheidbar

### PDF-Lernsituationen hochladen
- **Functionality**: Ermöglicht Upload von PDF-Dateien und Zuordnung zu spezifischen Themen
- **Purpose**: Digitale Verwaltung von Lernmaterialien direkt in der App
- **Trigger**: Klick auf "Upload"-Button bei einem Thema oder globaler Upload-Button
- **Progression**: Upload-Button klicken → Datei auswählen → Thema zuordnen → Bestätigen → PDF wird gespeichert und in Themenliste angezeigt
- **Success criteria**: PDFs werden persistiert, sind dem richtigen Thema zugeordnet und können später abgerufen werden

### Lernfortschritt verfolgen
- **Functionality**: Themen können als "gelernt" oder "in Bearbeitung" markiert werden
- **Purpose**: Motiviert durch sichtbaren Fortschritt und verhindert Themendopplung
- **Trigger**: Checkbox oder Toggle bei jedem Thema
- **Progression**: Thema bearbeiten → Status ändern (nicht begonnen/in Bearbeitung/abgeschlossen) → Visuelles Feedback → Fortschritt wird gespeichert
- **Success criteria**: Statusänderungen werden sofort visuell reflektiert und über Sessions hinweg gespeichert

### PDFs anzeigen und verwalten
- **Functionality**: Hochgeladene PDFs können angezeigt, heruntergeladen und gelöscht werden
- **Purpose**: Zentrale Verwaltung aller Lernmaterialien
- **Trigger**: Klick auf Thema mit hochgeladenen PDFs
- **Progression**: Thema öffnen → PDF-Liste sehen → PDF auswählen → Ansicht/Download/Löschen-Optionen
- **Success criteria**: PDFs sind sortiert abrufbar, Vorschau/Download funktioniert, Löschen entfernt dauerhaft

## Edge Case Handling
- **Keine PDFs vorhanden**: Zeige hilfreiche Anleitung zum ersten Upload mit Icon und Text
- **Ungültige Dateiformate**: Akzeptiere nur PDFs, zeige Fehlermeldung bei anderen Formaten
- **Große Dateien**: Zeige Upload-Fortschritt und warne bei sehr großen Dateien (>10MB)
- **Leere Suchergebnisse**: Zeige "Keine Themen gefunden" mit Hinweis zur Suchänderung
- **Doppelte Uploads**: Erkenne identische Dateinamen und biete Umbenennen/Überschreiben an

## Design Direction
Die Gestaltung soll Vertrauen, Professionalität und medizinische Kompetenz ausstrahlen - gleichzeitig aber modern und zugänglich für junge Auszubildende wirken. Medizinisches Blau vermittelt Ruhe und Konzentration, während warme Akzente Motivation schaffen.

## Color Selection

- **Primary Color**: Medizinisches Blau `oklch(0.55 0.15 250)` - Vermittelt Vertrauen, Professionalität und medizinische Kompetenz
- **Secondary Colors**: 
  - Helles Blaugrau `oklch(0.96 0.01 250)` für Hintergründe - Schafft ruhige, konzentrierte Atmosphäre
  - Neutrales Grau `oklch(0.45 0.01 250)` für Text und Borders - Professionell und gut lesbar
- **Accent Color**: Warmes Orange `oklch(0.68 0.15 45)` für Fortschritt und CTAs - Motivierend ohne medizinische Seriosität zu verlieren
- **Foreground/Background Pairings**: 
  - Primary (Medizin-Blau #2563EB): Weißer Text (#FFFFFF) - Ratio 7.2:1 ✓
  - Accent (Warmes Orange #E67E22): Weißer Text (#FFFFFF) - Ratio 4.9:1 ✓
  - Background (Helles Blaugrau #F8F9FB): Dunkler Text (#1E293B) - Ratio 12.1:1 ✓
  - Secondary (Neutralgrau #64748B): Weißer Text (#FFFFFF) - Ratio 5.8:1 ✓

## Font Selection
Professionelle, gut lesbare Schrift die Seriosität vermittelt aber modern wirkt - IBM Plex Sans kombiniert technische Präzision mit Zugänglichkeit, ideal für Bildungskontext.

- **Typographic Hierarchy**: 
  - H1 (App-Titel "Examen 25/26"): IBM Plex Sans Bold/32px/tight (-0.02em)
  - H2 (Thementitel): IBM Plex Sans SemiBold/20px/normal
  - H3 (Sektionen): IBM Plex Sans Medium/16px/normal
  - Body (Beschreibungen, Dozenten): IBM Plex Sans Regular/14px/relaxed (1.6 line-height)
  - Caption (Metadaten, Upload-Info): IBM Plex Sans Regular/12px/normal - text-muted-foreground

## Animations
Animationen sollen subtil Orientierung geben und Interaktivität bestätigen - beim Themenfiltern sanfte Übergänge, beim PDF-Upload Fortschrittsindikation, bei Statusänderungen kurzes Highlight.

- Themen-Karten: Sanftes hover-scaling (scale 1.02) mit shadow-Transition über 200ms
- PDF-Upload: Slide-in Animation für Upload-Dialog, Fortschrittsbalken mit smooth easing
- Fortschritt-Toggle: Checkbox mit bounce-Animation (150ms) beim Markieren
- Listen-Filter: Fade-in/out (250ms) bei Suche/Filterung
- Erfolgs-Toast: Slide-in von rechts oben (300ms) mit auto-dismiss

## Component Selection

- **Components**: 
  - `Card` für jedes Thema mit Nummer, Titel, Dozent und Status-Indicator
  - `Dialog` für PDF-Upload-Formular mit Themenauswahl
  - `Checkbox` für Lernfortschritt-Tracking pro Thema
  - `Input` für Themensuche mit Echtzeit-Filterung
  - `Badge` für Dozentennamen und Status-Labels ("Neu", "In Bearbeitung", "Abgeschlossen")
  - `Button` mit Icon für Upload-Aktionen und Primär-CTAs
  - `ScrollArea` für lange Themenliste
  - `Separator` zwischen Themen-Gruppen
  - `Tabs` für Ansichtswechsel (Alle Themen / Meine Uploads / Fortschritt)
  
- **Customizations**: 
  - Custom PDF-Preview-Component mit Thumbnail-Anzeige
  - Fortschrittsring-Component für Gesamtübersicht (circular progress)
  - Themen-Card mit Expand-Funktion für PDF-Liste
  
- **States**: 
  - Buttons: Default (solid blue), Hover (darker + shadow), Active (scale 0.98), Disabled (opacity 50%)
  - Cards: Default (white bg), Hover (lift mit shadow-lg), Selected (border-primary)
  - Inputs: Default (border-gray), Focus (ring-primary + border-primary), Error (border-destructive)
  
- **Icon Selection**: 
  - Upload: `UploadSimple` (Phosphor)
  - Dokument/PDF: `FilePdf` (Phosphor)
  - Check/Fortschritt: `CheckCircle` (Phosphor)
  - In Bearbeitung: `Circle` mit Teilfüllung
  - Löschen: `Trash` (Phosphor)
  - Suche: `MagnifyingGlass` (Phosphor)
  - Download: `Download` (Phosphor)
  
- **Spacing**: 
  - Container padding: `p-6` (Desktop), `p-4` (Mobile)
  - Card gaps in grid: `gap-4`
  - Intra-card spacing: `space-y-3`
  - Section margins: `mb-8`
  - Button padding: `px-4 py-2`
  
- **Mobile**: 
  - Grid: 3 Spalten (Desktop) → 1 Spalte (Mobile)
  - Header: Sticky position mit Suchleiste darunter statt nebeneinander
  - Upload-Dialog: Full-screen auf Mobile statt centered modal
  - Themen-Cards: Kompaktere Darstellung, kleinere Font-sizes
  - Touch-Targets: Minimum 44x44px für alle Buttons/Checkboxen
