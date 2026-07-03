# Wissensbasis für den Prüfungs-Agenten

Legen Sie hier Ihre Lernunterlagen für die Pflegefachassistenz ab.

## Unterstützte Formate

- `*.pdf`
- `*.md`
- `*.txt`

## So funktioniert die Indexierung

1. Der Backend-Indexer liest alle unterstützten Dateien in diesem Ordner rekursiv ein.
2. Die Inhalte werden in überlappende Textabschnitte (Chunks) zerlegt.
3. Für jeden Chunk wird ein Embedding erzeugt.
4. Die Embeddings werden in der lokalen Vektor-Datenbank des Backends gespeichert.

## Index neu aufbauen

Führen Sie im Ordner `/backend` aus:

```bash
npm run ingest
```

Alternativ im Docker-Setup:

```bash
docker compose exec app npm --prefix /app/backend run ingest
```

## Hinweise

- Wenn dieser Ordner leer ist, erzeugt die App weiterhin Probeexamen nur aus dem ausgewählten Fallbeispiel und der Themenliste.
- Nach dem Hinzufügen oder Austauschen von Unterlagen sollte der Index erneut aufgebaut werden.
- Die hier abgelegten Dateien werden **nicht** automatisch anonymisiert. Laden Sie nur Material hoch, das Sie verwenden dürfen.
