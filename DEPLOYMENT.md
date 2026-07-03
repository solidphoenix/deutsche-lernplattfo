# Deployment auf einer Cloud-VM

Diese Anleitung zeigt, wie Sie die Lernplattform selbst auf einem Cloud-Server betreiben.

## 1. Welche VM passt zu welchem Setup?

### Empfohlen zum Start: Hosted-API-Pfad

Wenn die eigentliche Textgenerierung über einen externen `openai-compatible`-Anbieter läuft, reicht meist eine **kleine VM**:

- **2 vCPU / 4 GB RAM** sind für kleine bis mittlere Besucherzahlen ein guter Startpunkt
- typische Preisregion: **ca. 5–15 € pro Monat**
- Beispiele:
  - Hetzner Cloud CPX11 / CX22
  - DigitalOcean Basic Droplet 2 GB oder 4 GB
  - Vultr Cloud Compute 2 vCPU / 4 GB
  - kleinere Free-Tier- oder Einstieg-Instanzen anderer Anbieter

Vorteil: kein GPU-Betrieb nötig, einfacher Start, schnellere Antworten.

### Vollständig selbst gehostet: Ollama-Pfad

Wenn Sie **Generierung und Embeddings lokal** mit Ollama betreiben möchten, brauchen Sie deutlich mehr Ressourcen:

- realistisch sinnvoll: **GPU-VM**
- alternativ: **mindestens 8 vCPU und 16–32 GB RAM** für CPU-Inferenz
- CPU-only funktioniert, ist aber bei mehreren Besuchern oft deutlich langsamer
- mögliche Kandidaten:
  - GPU-Instanzen bei Paperspace, RunPod, Lambda, OVH, Azure oder AWS
  - große CPU-VMs bei Hetzner, DigitalOcean oder Vultr als Testbetrieb

## 2. VM erstellen

1. Legen Sie eine Ubuntu-VM (z. B. Ubuntu 24.04 LTS) an.
2. Hinterlegen Sie Ihren SSH-Key beim Anbieter.
3. Öffnen Sie mindestens die Ports **80** und **443** in Firewall/Sicherheitsgruppe.

## 3. Docker und Compose installieren

Per SSH auf der VM:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Danach einmal neu anmelden.

## 4. Code auf den Server bringen

Variante A: direkt auf der VM klonen.

```bash
git clone https://github.com/solidphoenix/deutsche-lernplattfo.git
cd deutsche-lernplattfo
```

Variante B: lokal klonen und per `scp` oder Git deployen.

## 5. Domain auf die VM zeigen lassen

1. Kaufen oder verwenden Sie eine vorhandene Domain.
2. Legen Sie beim DNS-Anbieter einen **A-Record** an, der auf die öffentliche IPv4 Ihrer VM zeigt.
3. Optional zusätzlich einen **AAAA-Record** für IPv6.
4. Warten Sie, bis die DNS-Änderung propagiert ist.

## 6. `.env` konfigurieren

```bash
cp .env.example .env
nano .env
```

### Empfohlenes Minimal-Setup für öffentliche Nutzung

```env
APP_DOMAIN=ihre-domain.de
APP_BASE_URL=https://ihre-domain.de
ALLOWED_ORIGIN=https://ihre-domain.de
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=...
LLM_MODEL=gpt-4.1-mini
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
```

### Vollständig selbst gehostet mit Ollama

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
EMBEDDING_PROVIDER=ollama
EMBEDDING_BASE_URL=http://ollama:11434
EMBEDDING_MODEL=nomic-embed-text
```

Dann starten Sie Compose mit Ollama-Profil:

```bash
docker compose --profile ollama up -d --build
```

## 7. Lernunterlagen nach `/knowledge` legen

Legen Sie Ihre PDF-, Markdown- oder Textdateien in den Ordner `knowledge/` des Repositories.

Beispiele:

```bash
cp /pfad/zu/ihren-unterlagen/*.pdf knowledge/
cp /pfad/zu/ihren-notizen/*.md knowledge/
```

## 8. Container starten

Für das empfohlene Hosted-API-Setup:

```bash
docker compose up -d --build
```

## 9. Wissensindex aufbauen

Sobald Container laufen und Material in `/knowledge` liegt:

```bash
docker compose exec app npm --prefix /app/backend run ingest
```

Wenn `knowledge/` leer ist, zeigt der Ingest eine Warnung. Die App funktioniert dann weiterhin mit dem Fallbeispieltext allein.

## 10. Gesundheitscheck prüfen

```bash
curl http://localhost:3001/api/health
```

oder öffentlich:

```bash
curl https://ihre-domain.de/api/health
```

Caddy beantragt automatisch ein Let's-Encrypt-Zertifikat, sobald die Domain korrekt auf die VM zeigt und Port 80/443 erreichbar ist.

## 11. Updates einspielen

```bash
git pull
docker compose up -d --build
```

Wenn Sie neue Lernunterlagen hochgeladen haben:

```bash
docker compose exec app npm --prefix /app/backend run ingest
```

## 12. Backups

Sichern Sie regelmäßig:

- die SQLite-Datenbank unter `/app/backend/data/sqlite`
- die Vektor-Datenbank unter `/app/backend/data/vector`
- den `knowledge/`-Ordner
- Ihre `.env`

Beispiel:

```bash
tar czf backup-lernplattform-$(date +%F).tar.gz knowledge .env
```

Zusätzlich können Sie Docker-Volumes mit einem temporären Container sichern.

## 13. Troubleshooting

### Backend startet, aber Generierung schlägt fehl

- prüfen Sie `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
- Logs anzeigen:

```bash
docker compose logs -f app
```

### RAG liefert keine Lernunterlagen

- liegt Material wirklich in `knowledge/`?
- wurde `npm run ingest` nach dem Upload ausgeführt?
- passen `EMBEDDING_PROVIDER` und dessen Zugangsdaten?

### HTTPS wird nicht erstellt

- DNS noch nicht fertig propagiert
- Port 80/443 in Firewall nicht offen
- `APP_DOMAIN` stimmt nicht mit der echten Domain überein

### Ollama ist zu langsam

- kleineres Modell wählen
- GPU-VM verwenden
- oder für den öffentlichen Betrieb auf `openai-compatible` wechseln

## 14. Pädagogischer Hinweis

Die erzeugten Fragen und Musterantworten sind KI-generiert. Vor einer echten Prüfungsvorbereitung sollten sie von einer Lehrkraft, Praxisanleitung oder einem anderen fachkundigen Menschen gegengelesen werden.
