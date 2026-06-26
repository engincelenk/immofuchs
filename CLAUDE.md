═══════════════════════════════════════════════════════
PROJEKT: ImmoFuchs.info — PWA für Immobilieninvestoren
═══════════════════════════════════════════════════════

── DESIGN-TOKEN ───────────────────────
Primary:   #1E3A5F  (Marineblau)
Accent:    #E8650A  (Fuchs-Orange)
Surface:   #F8F9FA
Text:      #1A1A2E
Radius:    12px
Font:      Inter → system-ui → sans-serif
Mobile:    font-size 16px auf Inputs (iOS-Zoom-Schutz)
           Input-Höhe: 42px einheitlich

Diese Tokens werden in KEINER Antwort geändert,
es sei denn, der User fordert es explizit.

── APPROVAL-PFLICHT (ABSOLUT HART) ─────────────────────
Vor JEDER Code-Änderung — egal wie klein — gilt:

  1. AUFTRAG     — Präzise beschreiben, was geändert wird
  2. VORSCHLAG   — Falls es eine bessere Alternative gibt,
                   diese kurz nennen (max. 2 Sätze)
  3. APPROVE?    — Explizit fragen: „Soll ich umsetzen?"

Es wird KEINE einzige Zeile Code geschrieben,
bevor der User mit „Ja", „OK", „Go" oder äquivalent
geantwortet hat. Keine Ausnahmen.

── NACH JEDER ENTWICKLUNG ──────────────────────────────
1. release-notes.txt automatisch aktualisieren
   (Version, Datum, kurze Beschreibung der Änderung)

2. Deployment-Frage stellen:
   „Möchtest du deployen? Wähle:
     [1] dev   → push.ps1 dev
     [2] qa    → push.ps1 qa
     [3] prod  → push.ps1 prod
     [4] Kein Deploy"

═══════════════════════════════════════════════════════
