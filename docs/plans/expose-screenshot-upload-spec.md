# Exposé- & Screenshot-Upload — Extraktions-Funktion
**Spec v0.3 · ImmoFuchs.info**

**Änderung v0.2 → v0.3 (2026-07-27):** Technische Anbindung, UX-Integration in Finn, CEO-Sorgfaltsauflagen und die offenen Fragen aus v0.2 sind jetzt geklärt und eingepflegt. Grundlage der Änderungen: `docs/plans/expose-screenshot-upload-vorschlag-2026-07-26.md` (dort steht die ausführliche Begründung/Diskussion — diese Datei hier ist ab jetzt der aktuelle Gesamtstand, nicht mehr nur die fachliche Ur-Spec).

**Hinweis (technischer Hintergrund dieser Version):** Die Datei war zwischenzeitlich aus dem lokalen Arbeitsordner verschwunden (bekanntes OneDrive-Sync-Risiko dieses Repos, siehe Projekt-Notizen) und wurde für v0.3 aus dem v0.2-Stand plus den abgestimmten Ergänzungen neu zusammengeführt. Inhaltlich identisch zum zuletzt bekannten v0.2-Stand plus den unten markierten Änderungen.

---

## 1. Ziel

Nutzer laden ein Exposé (PDF) oder Screenshot(s) einer Immobilienanzeige (z.B. ImmoScout24, Immowelt, Kleinanzeigen, Makler-PDF) hoch. Eine KI-gestützte Extraktion liest die relevanten Immobiliendaten aus den Bildern/dem PDF und befüllt automatisch den geteilten React Context — nutzbar in allen 4 Rechnern (Renditerechner, Finanzierungsrechner, Mieterhöhungsrechner, Sanierungsrechner).

**Integration (entschieden, v0.3):** Kein eigenes Feature mit eigenem Button/Modal — Exposé-Upload ist eine Fähigkeit des bestehenden Finn-Assistenten (`AssistantSheet.jsx`), kein zweiter KI-Einstiegspunkt. Details siehe Abschnitt 8 (Frontend-Flow) und Abschnitt 11 (Technische Integration).

---

## 2. Wichtige Erkenntnis aus Test-Screenshots

Die als Referenz bereitgestellten 10 Screenshots zeigen **eine einzige** ImmoScout24-Anzeige, aufgeteilt über 10 Scroll-Abschnitte. Das heißt:

> **Ein Exposé ist selten ein Bild — es ist eine Serie von Screenshots.**

**Konsequenz für die Architektur:** Der Upload-Flow muss von Anfang an **Mehrfach-Upload** unterstützen (mehrere Bilder + optional 1 PDF als ein zusammenhängendes Exposé), nicht nur Single-Image. Alle hochgeladenen Bilder werden gemeinsam an Finn übergeben, damit er Informationen aus verschiedenen Abschnitten (Kopfdaten, Kosten, Energieausweis, Objektbeschreibung, Lage, Anbieter) zu **einem** Datensatz zusammenführt.

---

## 3. Fachliche Anforderung an die Verarbeitung

Unabhängig davon, wie die Extraktion technisch angebunden wird, muss die Verarbeitungslogik Folgendes leisten:

- **Mehrere Bilder als ein zusammenhängendes Exposé verarbeiten** (siehe Abschnitt 2) — nicht Bild-für-Bild isoliert extrahieren, sondern alle Screenshots gemeinsam einer Analyse zuführen, damit Informationen aus verschiedenen Abschnitten zu einem Datensatz zusammengeführt werden
- **Vision-fähige Texterkennung** aus Bildern und PDF (kein separates OCR nötig, sofern das eingesetzte Modell Bild-Input direkt verarbeiten kann)
- **Strukturierte JSON-Ausgabe** exakt nach dem Schema in Abschnitt 5
- **Serverseitige Verarbeitung**, damit keine API-Zugangsdaten im Client landen (unabhängig vom konkreten Hosting)

**Technische Anbindung (entschieden, v0.3):** erfolgt über einen neuen, eigenen Worker-Endpunkt getrennt vom bestehenden Chat-Assistenten — siehe Abschnitt 11 für den vollständigen Ablauf, Limits und Kill-Switch.

---

## 4. Attribut-Schema

Feld-Set basierend auf der Analyse der Test-Anzeige (ImmoScout24, Etagenwohnung Bietigheim-Bissingen). Felder, die tatsächlich in der Beispielanzeige vorkamen, sind mit ✓ markiert.

### 4.1 Objekt-Kerndaten

| Feld | Typ | Beispiel aus Test-Exposé | Quelle im Exposé |
|---|---|---|---|
| titel | string | "Einziehen und Wohlfühlen – moderne Erdgeschosswohnung im betreuten Wohnen" ✓ | Kopfbereich |
| objektart | string | "Etagenwohnung" ✓ | Hauptkriterien |
| kaufpreis | number | 269000 ✓ | Kopfbereich / Kosten |
| kaufpreis_pro_qm | number | 4981 ✓ | Kopfbereich |
| zimmer | number | 2 ✓ | Kopfbereich |
| wohnflaeche | number | 54 ✓ | Kopfbereich / Hauptkriterien |
| plz | string | "74321" ✓ | Adresse |
| ort | string | "Bietigheim-Bissingen" ✓ | Adresse |
| stockwerk | string | "Erdgeschoss" ✓ (aus Titel abgeleitet) | Titel/Beschreibung |
| baujahr | number | 2018 ✓ | Bausubstanz-Bereich |

### 4.2 Ausstattung

| Feld | Typ | Beispiel | Quelle |
|---|---|---|---|
| balkon_terrasse | boolean | true ✓ | Hauptkriterien |
| einbaukueche | boolean | true ✓ (im Kaufpreis enthalten) | Hauptkriterien + Objektbeschreibung |
| stellplatz | string | "Tiefgaragenstellplatz" ✓ | Objektbeschreibung (Freitext) |
| keller | boolean | true ✓ | Objektbeschreibung (Freitext) |
| barrierefrei | boolean | true ✓ | Objektbeschreibung (Freitext) |
| heizungsart | string | "Fußbodenheizung" ✓ | Objektbeschreibung (Freitext) |

### 4.3 Energie (wichtig für Sanierungsrechner)

| Feld | Typ | Beispiel | Quelle |
|---|---|---|---|
| energieausweistyp | string | "Bedarfsausweis" ✓ | Energieausweis-Bereich |
| energietraeger | string | "Holzpellets" ✓ | Energieausweis-Bereich |
| endenergiebedarf | number | 93.6 (kWh/m²·a) ✓ | Energieausweis-Bereich |
| energieeffizienzklasse | string | "C" ✓ | Energieausweis-Bereich |

### 4.4 Kosten (wichtig für Renditerechner)

| Feld | Typ | Beispiel | Quelle |
|---|---|---|---|
| hausgeld | number | 419 ✓ | Kosten-Bereich |
| provision_kaeufer_prozent | number | 3.57 ✓ | Kosten-Bereich |
| kaufnebenkosten | number | 28433 ✓ | Kaufkosten-Grafik |
| gesamtkosten | number | 297433 ✓ | Kaufkosten-Grafik |
| kaltmiete | number | *(nicht in dieser Anzeige vorhanden – Kaufobjekt, keine Miete)* | — |
| nebenkosten_miete | number | *(nicht vorhanden bei Kaufobjekten)* | — |

**CEO-Auflage (v0.3, hart, nicht optional):** `provision_kaeufer_prozent` und `kaufnebenkosten` fließen direkt in die Renditerechnung ein und kippen die Nettorendite schnell von grün auf gelb, wenn falsch übernommen. Diese beiden Felder bekommen **unabhängig vom `confidence`-Wert immer** die orange Markierung "bitte prüfen" in der Vorschau/Ergebnis-Karte (Abschnitt 7/8) — sie sind der Feldtyp mit dem größten Hebel auf eine falsche Anlageentscheidung.

### 4.5 Kontext-Freitext (für Finn, nicht direkt in Rechner übernommen)

| Feld | Typ | Zweck |
|---|---|---|
| objektbeschreibung | string | Freitext-Zusammenfassung, hilft bei unscharfen Feldern (z.B. Stellplatz, Keller nur hier erwähnt) |
| lagebeschreibung | string | Kontext für spätere Lage-Bewertung durch Finn |

### 4.6 Meta / Bild-Handling — **"Auch ein Bild gehört dazu"**

| Feld | Typ | Beschreibung |
|---|---|---|
| titelbild_index | number | Index des hochgeladenen Screenshots, der das **Titelbild** (Außenansicht der Immobilie, Bild 1/11 in der Beispielanzeige) enthält |
| titelbild_base64 | string (optional) | Falls das Titelbild separat gespeichert/angezeigt werden soll (z.B. als Vorschau-Thumbnail im Renditerechner neben den Kennzahlen) |
| bildbeschreibung | string | Kurze KI-Beschreibung dessen, was auf dem Titelbild zu sehen ist (z.B. "Mehrfamilienhaus, 3 Stockwerke, Balkone, gepflegte Außenanlage") — nützlich, da reine Zahlen wenig über den optischen Zustand aussagen |

**Wichtig:** Finn soll erkennen, **welcher** der hochgeladenen Screenshots das Titelbild/Hauptfoto der Immobilie ist (i.d.R. der erste Screenshot mit Foto oben, erkennbar an Bildzähler wie "1 / 11") und dieses referenzieren bzw. extrahieren — nicht nur Text lesen, sondern auch das Bild selbst als Objekt-Vorschau nutzbar machen.

**Offen (v0.3, unverändert seit v0.2):** Ob `titelbild_base64` tatsächlich zurückgegeben und dauerhaft in `localStorage` gehalten wird, oder ob `bildbeschreibung` als Text reicht, ist noch nicht entschieden — siehe Abschnitt 10.

### 4.7 Confidence-Objekt (Pflicht pro Extraktion)

```json
{
  "confidence": {
    "kaufpreis": "sicher",
    "wohnflaeche": "sicher",
    "stellplatz": "unsicher",
    "kaltmiete": "nicht_gefunden"
  }
}
```

Werte: `"sicher"` / `"unsicher"` / `"nicht_gefunden"` — steuert die visuelle Markierung in der Vorschau (siehe 8.).

**Ergänzung (v0.3):** `confidence` sagt nur, wie sicher Finn beim *Lesen* ist — nicht, ob die Angabe des Anbieters selbst korrekt ist (Energiewerte, Wohnfläche und "provisionsfrei"-Angaben in Anzeigen sind praxiserfahren oft ungenau). Deshalb zusätzlich zwei neue, unabhängige Mechanismen:

- **`warnungen`-Array** (neu, Abschnitt 5) für Widersprüche *zwischen mehreren Screenshots derselben Anzeige* (z.B. zwei unterschiedliche Wohnflächen-Werte) — das ist ein anderer Fall als "unsicher gelesen" und braucht eine eigene Markierung in der Ergebnis-Karte.
- **Pflicht-Disclaimer nach Übernahme** (Abschnitt 9), unabhängig vom `confidence`-Wert: Werte stammen vom Anbieter, sind ungeprüft.

---

## 5. Vollständiges JSON-Ausgabeschema (Zielformat des Workers)

```json
{
  "objekt": {
    "titel": "string",
    "objektart": "string",
    "kaufpreis": 0,
    "kaufpreis_pro_qm": 0,
    "zimmer": 0,
    "wohnflaeche": 0,
    "plz": "string",
    "ort": "string",
    "stockwerk": "string",
    "baujahr": 0
  },
  "ausstattung": {
    "balkon_terrasse": false,
    "einbaukueche": false,
    "stellplatz": "string",
    "keller": false,
    "barrierefrei": false,
    "heizungsart": "string"
  },
  "energie": {
    "energieausweistyp": "string",
    "energietraeger": "string",
    "endenergiebedarf": 0,
    "energieeffizienzklasse": "string"
  },
  "kosten": {
    "hausgeld": 0,
    "provision_kaeufer_prozent": 0,
    "kaufnebenkosten": 0,
    "gesamtkosten": 0,
    "kaltmiete": null,
    "nebenkosten_miete": null
  },
  "kontext": {
    "objektbeschreibung": "string",
    "lagebeschreibung": "string"
  },
  "bild": {
    "titelbild_index": 0,
    "bildbeschreibung": "string"
  },
  "confidence": {
    "...": "sicher | unsicher | nicht_gefunden"
  },
  "warnungen": [
    { "feld": "string", "hinweis": "string" }
  ]
}
```

**Neu in v0.3:** Das `warnungen`-Array ist optional (leer, wenn keine Widersprüche gefunden wurden) und getrennt von `confidence` zu verstehen: Es meldet Konflikte *zwischen* mehreren hochgeladenen Screenshots derselben Anzeige, z.B.:

```json
"warnungen": [
  { "feld": "wohnflaeche", "hinweis": "54 m² (Kopfbereich) vs. 52 m² (Grundriss) - abweichend" }
]
```

Wird in der Ergebnis-Karte als eigener, gelb hervorgehobener Hinweis über dem betroffenen Feld angezeigt — nicht identisch mit `confidence: "unsicher"`, da hier zwei valide Quellen widersprechen, nicht nur Unsicherheit beim Lesen.

---

## 6. Fachlicher Ablauf der Verarbeitung (technologie-unabhängig)

**Eingabe:**
```json
{
  "images": ["base64...", "base64...", "..."],
  "pdf": "base64... (optional)"
}
```

**Verarbeitungsschritte:**
1. Alle Bilder (+ ggf. PDF) gemeinsam einer Vision-fähigen Analyse zuführen (mehrere Bilder in einer Anfrage, damit Kontext über Abschnitte hinweg erhalten bleibt)
2. Feste Anweisung zur reinen JSON-Ausgabe nach Schema aus Abschnitt 5
3. Grobe Validierung der Antwort (Zahlenfelder enthalten Zahlen, keine Freitext-Halluzinationen in Zahlenfeldern)
4. Rückgabe an Frontend

**Kostenüberlegung:** Mehrere Bilder pro Anfrage erhöhen die Kosten spürbar (Vision-Tokens skalieren mit Bildauflösung × Anzahl). Bilder werden client-seitig auf max. ~1500px Breite komprimiert vor Upload, um Kosten zu begrenzen.

**Limits (entschieden, v0.3)** — zwei getrennte Achsen, nicht vermischen:

- **Pro einzelner Anfrage** (Payload-Schutz): max. **15 Bilder**, max. **1 PDF**, PDF max. **15 MB** und max. **20 Seiten**. PDF hat keine clientseitige Verkleinerung wie Bilder (Canvas-Resize funktioniert nur auf Bildern), deshalb das harte Größen-/Seitenlimit.
- **Pro Session/Tag** (Häufigkeit): eigenes, niedrigeres Rate-Limit von **5 Exposé-Extraktionen/Tag** (vs. 20 Text-Anfragen beim bestehenden Chat), da Bild-/PDF-Calls teurer sind. Details siehe Abschnitt 11.

---

## 7. System-Prompt-Grundgerüst (Kurzfassung)

```
Du bist ein Extraktions-Assistent für Immobilien-Exposés.
Du erhältst 1-N Screenshots und/oder ein PDF eines Immobilien-Exposés.
Die Screenshots können verschiedene Abschnitte DERSELBEN Anzeige zeigen
(Kopfdaten, Kosten, Energieausweis, Objektbeschreibung, Lage, Anbieter).

Extrahiere alle Felder gemäß folgendem JSON-Schema: [SCHEMA]

Regeln:
- Antworte NUR mit validem JSON, kein Fließtext, keine Markdown-Codeblöcke
- Wenn ein Feld nicht auffindbar ist: null setzen, confidence "nicht_gefunden"
- Wenn ein Feld nur indirekt ableitbar ist (z.B. Stockwerk aus dem Titel):
  Wert trotzdem setzen, aber confidence "unsicher"
- Identifiziere, welches Bild das Titelbild/Hauptfoto der Immobilie ist
  (meist das erste Bild mit Bildzähler wie "1 / 11")
- Ignoriere Werbe-, Makler- und Rechtstext (AGB, Widerrufsbelehrung, Impressum)
  außer für "kontext"-Felder
- Wenn dasselbe Feld in verschiedenen Screenshots widersprüchliche Werte zeigt
  (z.B. abweichende Wohnfläche in Kopfbereich vs. Grundriss): trage den
  wahrscheinlichsten Wert normal ein, UND melde den Widerspruch zusätzlich
  im "warnungen"-Array mit Feldname und kurzem Hinweistext
```

---

## 8. Frontend-Flow (entschieden, v0.3 — ersetzt den v0.2-Entwurf)

**Kernentscheidung:** Kein separater Upload-Button/Modal pro Rechner (v0.2-Entwurf verworfen) — stattdessen ein Attachment-Icon (📎, Fuchs-Orange) direkt neben dem Eingabefeld im bestehenden `AssistantSheet` (Finn-Chat). Grund: Ein zweiter KI-Einstiegspunkt pro Screen erzeugt zwei mentale Modelle ("der Fuchs" vs. "der Upload-Knopf") und ist für eine mobile-first App unnötige Komplexität.

**Ablauf, komplett im Chat-Fenster:**

1. Tap auf 📎 öffnet native Datei-/Bildauswahl mit `accept="image/*,application/pdf" multiple capture="environment"` (Mehrfachauswahl zwingend, siehe Abschnitt 2; `capture` erlaubt direktes Fotografieren statt nur Galerie-Auswahl)
2. Ausgewählte Bilder erscheinen als horizontal scrollbare Thumbnail-Reihe im Chat, mit "x" zum Entfernen einzelner Bilder; Button "Übernehmen" wird erst aktiv ab ≥1 Bild
3. Beim **ersten** Tap auf 📎 erscheint einmalig eine Inline-Consent-Bubble (kein Modal, kein Blocker) mit dem Pflichttext aus Abschnitt 9 + "Verstanden"-Tap

**Verarbeitungs-Anzeige (entschieden, v0.3, Nachtrag 2026-07-27 — UX-/Frontend-Abstimmung):** Bleibt inline im Chat, kein separates Overlay/Fenster (Entscheidung nach Rückfrage bestätigt: konsistent mit der Kein-zweiter-Einstiegspunkt-Linie). Drei ehrliche Phasen statt einer vorgetäuschten Live-Progress — Gemini liefert die Antwort als ein Stück, nicht Feld für Feld, daher keine Einzelfeld-Häkchen *während* der Verarbeitung:

4. **Phase 1 — Hochladen** (neuer Status `uploading`): echter, messbarer Fortschritt pro Bild, z. B. "3 von 7 Bildern hochgeladen".
5. **Phase 2 — Analyse** (neuer Status `extracting`): ein Wartezustand, gleiche Denkanimation wie normaler Chat, optional mit rotierendem Text ("Objektdaten … Kosten … Energie …") als reiner Beschäftigungs-Indikator — bewusst *nicht* als Nachweis einzelner bereits gefundener Felder missverständlich, da technisch nicht belegbar (ein einziger, nicht-streamender Gemini-Call).
6. **Phase 3 — Ergebnis-Checkliste** (Status `idle`, Antwort ist da): kompakte Karte direkt im Chatverlauf, gruppiert nach Objekt/Ausstattung/Energie/Kosten/Kontext (Abschnitt 4), pro Feld ein Status-Icon:
   - ✅ grün = `confidence: "sicher"`
   - ⚠️ orange = `confidence: "unsicher"` oder Eintrag im `warnungen`-Array (mit Hinweistext, Abschnitt 5), Tap-to-edit
   - 🔶 orange, fest = `provision_kaeufer_prozent` und `kaufnebenkosten` **immer** markiert (CEO-Auflage, Abschnitt 4.4), unabhängig von `confidence`
   - ⬜ grau = `nicht_gefunden`, ausgegraut mit Tap-to-edit
   - Kopfzeile der Karte fasst zusammen: "18 von 22 Feldern gefunden · 3 zu prüfen"
   - Titelbild als kleiner Thumbnail oben in der Karte (falls `titelbild_base64` genutzt wird, siehe offene Frage 4.6/10)
   - **Konflikt mit bereits vorhandenen Werten:** Hat der Nutzer im Rechner schon einen Wert eingetragen (z. B. Kaufpreis), zeigt die Karte "Kaufpreis: 269.000 € (aktuell: 250.000 €)" mit Toggle pro Feld — Standard bleibt der alte Wert, bis der Nutzer aktiv übernimmt. Kein stilles Überschreiben.
7. Button **"Übernehmen"** (Abschluss/OK) schreibt die (ggf. korrigierten/bestätigten) Werte in den geteilten React-Context; kurze Bestätigung ("✅ 17 Werte übernommen", Toast ~3 Sek.), danach kollabiert die Karte zu einer kompakten Chip-Zeile im Chatverlauf (gleiches Kollaps-Muster wie andere abgeschlossene Interaktionen).

**Neue Komponenten** (unter `src/components/assistant/`, gleiches Muster wie `ChatBubble.jsx`, JS/JSX wie der Rest des Projekts — kein TypeScript/React-Query-Umbau):
- `ExposeUploadProgress.jsx` — Phase 1+2, Props `{ uploadedCount, totalCount, phase }`
- `ExposeResultCard.jsx` — Phase 3, Props `{ felder, confidence, warnungen, bestehendeWerte, onUebernehmen }`
- `ExposeFieldRow.jsx` — eine Zeile (Icon + Label + Wert + ggf. Konflikt-Toggle)

Status-Erweiterung in `useAssistant.js`: neue Werte `"uploading"` und `"extracting"` neben den bestehenden (`loading`/`error`/`limit`/`offline`) — gleiches State-Machine-Muster, keine neue Philosophie.

**Accessibility:** `aria-live="polite"` auf der Ergebnis-Karte (wie bestehender Chat), Thumbnail-Reihe mit `alt`-Text aus `bildbeschreibung`, Upload-Button per Tastatur erreichbar, Fehlerzustand ("Konnte nichts lesen — bitte schärfere Screenshots") textlich, nicht nur farblich, Status-Icons zusätzlich mit Text/aria-label (nicht nur Farbe/Symbol).

**Rollout:** Pilot zuerst im Renditerechner (höchste Nutzungsfrequenz), danach Finanzierung/Sanierung.

**i18n:** Alle neuen UI-Strings (Consent-Bubble, Konflikt-Toggle, Fehlermeldungen) brauchen `t()`-Einträge für alle 5 vom Assistenten unterstützten Sprachen (de/en/tr/zh/hi). Die JSON-Schema-Keys selbst bleiben sprachunabhängig Deutsch (technischer Vertrag Client↔Worker).

---

## 9. Datenschutz-Hinweis (UI-Pflichttext)

Da Bilder/PDFs an einen Server (Cloudflare Worker → Gemini API) übertragen werden — anders als die sonstige No-Backend-Architektur von ImmoFuchs — steht in der Inline-Consent-Bubble (Abschnitt 8) ein kurzer Pflicht-Hinweis:

> "Deine Screenshots werden zur Analyse kurzzeitig an unseren Server übertragen und nicht dauerhaft gespeichert."

**Bedingung (v0.3, hart):** Dieser Satz ist nur korrekt, wenn ein bezahlter Gemini-API-Tarif **und** ein bestätigter Zero-Data-Retention-Antrag (ZDR) aktiv sind (siehe Abschnitt 11, Punkt 5) — im kostenlosen Tarif behält Google sich Trainings-Nutzung der Inputs ausdrücklich vor, dann wäre die Aussage schlicht falsch. Muss vor Go-Live technisch verifiziert sein, nicht nur behauptet werden.

**Zusätzlicher Fach-Hinweis nach Übernahme (CEO-Auflage, v0.3):** Da Anbieterangaben ungeprüft sind (Abschnitt 4.7), zeigt Finn nach dem "Übernehmen" einen kurzen Hinweis:

> "Diese Werte stammen aus der Anzeige des Anbieters — nicht geprüft. Wohnfläche und Energiewerte weichen in der Praxis häufig ab; bei ernsthaftem Interesse vor Ort nachmessen bzw. Energieausweis im Original einsehen."

(Exakte Formulierung beider Texte juristisch prüfen lassen, bevor produktiv.)

---

## 10. Offene Entscheidungen vor dem Bauen

- [ ] Soll `titelbild_base64` tatsächlich zurückgegeben und im Frontend/`localStorage` dauerhaft gehalten werden, oder reicht `bildbeschreibung` als Text? *(unverändert offen seit v0.2)*
- [x] ~~Maximale Anzahl Bilder pro Upload~~ → entschieden: 15 Bilder, 1 PDF (max. 15 MB/20 Seiten) pro Anfrage (Abschnitt 6)
- [x] ~~Soll bei widersprüchlichen Angaben zwischen Screenshots eine Warnung ausgegeben werden~~ → entschieden: `warnungen`-Array (Abschnitt 5/7)
- [x] ~~Technische Anbindung~~ → entschieden, siehe Abschnitt 11
- [ ] Bezahlter Gemini-API-Tarif + ZDR-Antrag bei Google müssen vor Go-Live technisch bestätigt sein (organisatorischer Blocker, kein Code-Thema, siehe Abschnitt 9/11)
- [ ] Exakte Formulierung der beiden Datenschutz-/Disclaimer-Texte (Abschnitt 9) juristisch prüfen lassen

---

## 11. Technische Integration (entschieden, v0.3)

Geprüft gegen die reale Architektur (`worker/wrangler.toml`, `modelRouter.ts`, `validator.ts`, `index.ts`): Der Worker hat aktuell keinerlei Speicher-Binding (kein R2, kein KV, keine DB) — nur eine Durable Object für die Rate-Limit-Zähler. Der komplette Upload-Flow ist damit von Natur aus ein reiner Durchlauf, keine Ablage.

1. **Client:** Screenshots werden client-seitig vor dem Versand auf ca. 1500px Breite verkleinert (Canvas-Resize) und zu Base64 kodiert. Halten sich nur in React-State, **nicht** in `localStorage` — Tab schließen/neu laden löscht sie.
2. **Übertragung:** Base64-Bilder (+ optional PDF) gehen per HTTPS-POST an einen **neuen, eigenen Endpunkt** `/api/expose-extract`, getrennt von `/api/assistant` — eigene Validierung (`validateExposeExtractRequest` in `validator.ts`, analog zu den bestehenden Limits wie `MAX_FRAGE_LEN`), eigener Prompt, eigenes Kostenprofil.
3. **Rate-Limiting:** nutzt dieselbe `RATE_LIMITER_DO`-Infrastruktur wie `/api/assistant`, nur mit eigenem Namensraum (`RATE_LIMITER_DO.getByName("expose:"+sessionId)` etc.) — keine neue Infrastruktur nötig. Limits: 5 Extraktionen/Tag/Session; IP- und Global-Limit anteilig niedriger als bei `/api/assistant` (`IP_DAILY_LIMIT`/`GLOBAL_DAILY_LIMIT` in `wrangler.toml`).
4. **Eigener Kill-Switch:** `EXPOSE_EXTRACT_ENABLED` als zusätzliche `env`-Variable, unabhängig von `ASSISTANT_ENABLED` — Bild-Extraktion ist teurer und riskanter als Text-Chat und muss isoliert abschaltbar sein, ohne Finn insgesamt lahmzulegen.
5. **Im Worker:** Kein Zwischenspeichern. Bilder (und optional das PDF als `mime_type: "application/pdf"`) werden direkt als `inline_data`-Teile in den Gemini-`generateContent`-Call gepackt (gleicher Mechanismus wie `callGemini()`, nur mit Bild- statt Text-Payload), Antwort validiert, zurückgegeben. Danach verwirft Cloudflare den Ausführungskontext vollständig.
6. ~~**Kein Vision-Fallback:** Workers AI/Llama 3.3 (heutiger Text-Fallback bei Gemini-Ausfall) kann keine Bilder verarbeiten. Schlägt Gemini fehl, gibt es aktuell keinen Ausweichpfad — nur einen Fehlerzustand im Chat.~~

   **Überholt (2026-07-27, umgesetzt):** Die Annahme galt für Llama **3.3**. Auf dem Cloudflare-Konto liegen bildfähige Modelle (`@cf/mistralai/mistral-small-3.1-24b-instruct`, `@cf/meta/llama-3.2-11b-vision-instruct`, LLaVA, Moondream). Der Worker versucht deshalb **erst Gemini, dann Workers AI** — gleiches Muster wie der Chat. Mistral Small nimmt Bilder als Data-URL entgegen (genau das Format, das der Client liefert) und lässt sich per `guided_json` auf das Schema aus Abschnitt 5 zwingen. Ein 502 gibt es nur noch, wenn beide Wege scheitern. Modell umstellbar über `EXPOSE_VISION_FALLBACK_MODEL`.

   Das war kein Luxus: Gemini lieferte am 2026-07-27 auf dem hinterlegten Key durchgehend 429 (Text wie Bild) — ohne Fallback wäre das Feature an diesem Tag komplett unbenutzbar gewesen, während der Chat dank seines Fallbacks unbemerkt weiterlief.
7. **Bei Google — Pflicht vor Go-Live:**
   - **Bezahlter API-Tarif zwingend.** Im kostenlosen Gemini-API-Tarif behält Google sich Trainings-Nutzung der Inputs explizit vor; im bezahlten Tarif nicht.
   - **Zero Data Retention (ZDR)** für das API-Projekt beantragen — schaltet auch den standardmäßigen 24h-RAM-Cache von Gemini ab.
8. **Nach Übernahme:** Nur die extrahierten *Werte* landen im geteilten React-Context/`localStorage`, wie jedes andere Rechnerfeld. Das Bild selbst wird nicht mitgespeichert — außer bei `titelbild_base64` (offene Frage, Abschnitt 10): dann läge ein Bild-Schnipsel dauerhaft lokal im Browser des Nutzers (nicht auf einem Server), das gehört dann explizit in den Datenschutztext.
9. **Typisierung:** `worker/src/types.ts` braucht `ExposeExtractRequest`/`ExposeExtractResponse` neben den bestehenden `AssistantRequest`/`AssistantResponse`.
10. **State-Machine wiederverwenden:** Die bestehende Status-Logik in `AssistantSheet.jsx`/`useAssistant.js` (`loading`/`error`/`limit`/`offline`) deckt den neuen Fall fast vollständig ab — nur ein zusätzlicher Zwischenzustand `extracting` kommt hinzu.
11. **Tests:** mindestens ein E2E-Test für den Happy-Path (Screenshots hochladen → Karte erscheint → Übernehmen befüllt Rechner-Felder) und einer für den Konflikt-Toggle (bestehender Wert bleibt bis aktive Übernahme).

---

## 12. Umsetzungsplan — Phasen, Sprints, Meilensteine (Nachtrag 2026-07-27)

**Vorbemerkung:** Solo-Projekt (Nutzer + Claude), kein Team-Scrum mit Velocity/Standup/Retro nötig — angepasst statt 1:1 übernommen. Ein "Sprint" hier ist ein in sich abgeschlossener, einzeln freigabefähiger Arbeitsblock, passend zur Projekt-Regel (Bau-Freigabe pro Änderung, `release-notes.txt` + Deploy-Frage nach jeder Entwicklung, Session-Hygiene bei langen Chats). Reihenfolge ist bindend, da spätere Sprints auf früheren aufbauen (siehe Abhängigkeiten unten) — Sprint-Länge selbst ist nicht in Tagen fixiert, sondern "eine oder mehrere fokussierte Sitzungen bis DoD erreicht ist".

### Phase A — Backend/Worker-Fundament (kein UI)

**Sprint 1 — Typen, Validator, Kill-Switch, Endpoint-Skeleton**
- `worker/src/types.ts`: `ExposeExtractRequest`/`ExposeExtractResponse`, `warnungen`-Feld
- `worker/src/validator.ts`: `validateExposeExtractRequest` (Bildanzahl ≤15, Base64-Längenlimit, MIME-Whitelist, PDF ≤15 MB/20 Seiten)
- `wrangler.toml`: `EXPOSE_EXTRACT_ENABLED`, eigene Rate-Limit-Werte (top-level **und** `env.dev`)
- `/api/expose-extract` in `index.ts`, Rate-Limiter-Wiederverwendung mit eigenem Namensraum
- **DoD:** curl-Test gegen den dev-Worker liefert korrekt 200/400/429/503 — noch kein UI nötig

**Sprint 2 — Gemini-Vision-Call, Prompt, Output-Validierung**
- System-Prompt (Abschnitt 7) inkl. `warnungen`-Regel
- `callGemini`-Variante mit `inline_data` (Bild/PDF) in `modelRouter.ts`
- Grobe Output-Validierung (Zahlenfelder enthalten Zahlen, kein Freitext-Fallback)
- Fehlerpfad: kein Vision-Fallback (Abschnitt 11, Punkt 6), sauberer Fehlerstatus
- **DoD:** Testupload mit den 10 Referenz-Screenshots liefert valides JSON nach Schema (Abschnitt 5)

**M1 — Meilenstein:** Worker-Endpoint vollständig funktionsfähig und isoliert testbar (curl/Postman), noch ohne Frontend.

### Phase B — Frontend-Flow (im bestehenden Finn-Chat, iterativ)

**Sprint 3 — Upload-Einstieg**
- 📎-Icon in `AssistantSheet.jsx`, native Datei-/Bildauswahl (Abschnitt 8, Punkt 1), Thumbnail-Reihe, einmalige Consent-Bubble
- Client-seitige Bildkomprimierung (Canvas-Resize ~1500px, Abschnitt 11 Punkt 1)
- **DoD:** Bilder auswählbar, komprimiert, im React-State sichtbar — noch kein Versand an den Worker

**Sprint 4 — Progress, Ergebnis-Checkliste, Übernehmen**
- `ExposeUploadProgress.jsx` (Phase 1+2 aus Abschnitt 8)
- `ExposeResultCard.jsx` + `ExposeFieldRow.jsx` (Phase 3: Status-Icons, Konflikt-Toggle, CEO-Pflichtmarkierung)
- `useAssistant.js`: neue Status-Werte `uploading`/`extracting`
- "Übernehmen"-Button schreibt in den geteilten React-Context
- **DoD:** kompletter Flow auf `dev.immofuchs.info` klickbar, Renditerechner wird tatsächlich befüllt

**M2 — Meilenstein:** Kompletter Happy-Path Ende-zu-Ende auf dev nutzbar (Renditerechner, Deutsch).

### Phase C — Härtung und Rollout

**Sprint 5 — i18n, Accessibility, Datenschutztexte**
- `t()`-Einträge für alle 5 Sprachen (Abschnitt 8)
- `aria-live`, `alt`-Texte, Tastaturbedienung, Status-Icons mit Text (Abschnitt 8)
- Juristisch geprüfte Datenschutz-/Disclaimer-Texte einsetzen (Abschnitt 9)
- **DoD:** Accessibility-Checkliste abgehakt, alle 5 Sprachen manuell durchgeklickt

**Sprint 6 — Tests, QA, Rollout auf weitere Rechner**
- E2E-Tests: Happy-Path + Konflikt-Toggle (Abschnitt 11, Punkt 11)
- Rollout Finanzierung/Sanierung nach Renditerechner-Pilot (Abschnitt 8, Rollout)
- **DoD:** Tests grün, Feature in allen relevanten Rechnern aktiv

**M3 — Meilenstein:** Feature vollständig gehärtet (i18n, A11y, Tests) auf dev/qa.

**M4 — Meilenstein (organisatorisch, kein Sprint, Hard-Gate vor Prod):** Bezahlter Gemini-API-Tarif + bestätigter ZDR-Antrag bei Google (Abschnitt 9/11) **und** juristische Freigabe der Datenschutz-/Disclaimer-Texte (Abschnitt 10) — unabhängig vom Sprint-Fortschritt, kann parallel zu Phase A–C laufen, muss aber vor M5 abgeschlossen sein.

**M5 — Meilenstein:** Prod-Launch, Pilot zuerst im Renditerechner (Abschnitt 8, Rollout).

### Abhängigkeiten

Sprint 1 → Sprint 2 (Prompt braucht den Endpoint). Sprint 3 kann parallel zu Sprint 2 starten (Bildauswahl/Komprimierung ist worker-unabhängig), Sprint 4 braucht aber Sprint 2 **und** 3 fertig (Versand an echten Endpoint). Sprint 5/6 sind parallelisierbar. M4 läuft unabhängig nebenher, ist aber Pflicht-Voraussetzung für M5 — unabhängig davon, wie weit Phase A–C sind.

### Kein klassisches Team-Scrum — angepasste Ersatz-Routinen

- **Kein Daily Standup:** Claude arbeitet pro Sitzung an einem Sprint-Slice, Fortschritt läuft über die Task-Liste dieser Session.
- **Kein Sprint Review mit Stakeholdern:** Demo = Live-Test auf `dev.immofuchs.info` nach jedem Sprint, plus die bestehende Deploy-Frage (dev/qa/prod/kein Deploy) nach jeder Entwicklung.
- **Keine Team-Retro:** Stattdessen nach M2 (erster Ende-zu-Ende-Durchlauf) ein kurzer Ist-Check, ob UX und Aufwand noch zur Konzept-Annahme (dieses Dokument) passen, bevor Phase C beginnt.
- **Definition of Done** ersetzt pro Sprint die klassische Team-DoD-Checkliste — angepasst ans Projekt: kein Coverage-Dogma, sondern "manuell in dev getestet" + bestehende Testkonventionen.

---

**Status (aktualisiert 2026-07-27, nach Umsetzung):** Sprint 1–6 sind gebaut, Phase A–C abgeschlossen (M1–M3 erreicht). Noch offen und **nicht** durch Code lösbar:

- **M4 (Hard-Gate vor Prod):** bezahlter Gemini-API-Tarif + bestätigter ZDR-Antrag; solange nicht bestätigt, steht `EXPOSE_EXTRACT_ENABLED` auf Prod/QA bewusst auf `"false"` (nur dev aktiv).
- **Juristische Freigabe** der beiden Texte aus Abschnitt 9 — sie sind im Wortlaut dieser Spec eingebaut, aber ungeprüft.
- **`titelbild_base64`** (offene Frage 4.6/10) bleibt unentschieden und ist deshalb nicht implementiert: der Worker gibt nur `bildbeschreibung` und `titelbild_index` zurück, in der Ergebnis-Karte gibt es kein Titelbild-Thumbnail.
- **Testlauf mit den 10 echten Referenz-Screenshots** steht aus — die Bilder liegen nicht im Repo. Die Kette selbst ist aber am 2026-07-27 mit zwei synthetischen Exposé-Screenshots **echt durchlaufen** (Dev-Worker → Workers-AI-Vision → Ergebnis-Karte → Übernahme in den Renditerechner): alle Zahlen korrekt gelesen, Daten aus beiden Screenshots zu einem Datensatz zusammengeführt, und der Wohnflächen-Widerspruch (80,05 vs. 78,20 m²) landete korrekt im `warnungen`-Array. DoD Sprint 2 gilt damit als erfüllt.

Abweichungen von dieser Spec, die beim Bauen entstanden sind, stehen in `release-notes.txt` unter 1.55.65.

**Scope dieser Spec (v0.3):** Fachliche Funktionalität (Attribut-Schema, Upload-Flow, Vorschau-Logik) **und** die technische Integration in die bestehende Finn-/Worker-Architektur (Abschnitt 11) — beides jetzt in einem Dokument.
