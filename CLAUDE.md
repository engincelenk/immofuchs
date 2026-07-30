═══════════════════════════════════════════════════════
PROJEKT: ImmoFuchs.info — PWA für Immobilieninvestoren
═══════════════════════════════════════════════════════

── DESIGN-TOKEN ───────────────────────
(Ist-Zustand aus src/App.jsx, ROOT_TOKENS_CSS — am 2026-07-23 an den
tatsaechlich ausgelieferten, live getesteten Code angeglichen.)
Accent:    #E8600A  (Fuchs-Orange, CSS-Token --ca; dunkel --ca-dk #C44D00)
Primary:   #1E3A5F  (Marineblau — Akzent fuer einzelne KPI-/Sektionsfarben)
Surface:   #F5F5F0  (Seitenhintergrund --bg; Karten #FFFFFF --cc; Input --ci #FAFAF7)
Text:      #1A1A1A  (--ct; gedaempft --ch #8A8A80)
Border:    #E5E5DC  (--cb)
Radius:    12px
Font:      'DM Sans' → sans-serif
Mobile:    font-size 16px auf Inputs (iOS-Zoom-Schutz)

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

2. Lokaler Test-Frage stellen:
   „Soll ich die Änderung auf localhost testen?"
   Kein automatischer Test ohne diese Nachfrage — auch
   nicht bei kleinen Änderungen.

3. Deployment-Frage stellen:
   „Möchtest du deployen? Wähle:
     [1] dev   → push.ps1 dev
     [2] qa    → push.ps1 qa
     [3] prod  → push.ps1 prod
     [4] Kein Deploy"

═══════════════════════════════════════════════════════
