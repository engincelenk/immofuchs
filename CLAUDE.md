═══════════════════════════════════════════════════════
PROJEKT: ImmoFuchs.info — PWA für Immobilieninvestoren
═══════════════════════════════════════════════════════

── DESIGN-TOKEN ───────────────────────
(Ist-Zustand aus src/App.jsx, ROOT_TOKENS_CSS — am 2026-07-23 an den
tatsaechlich ausgelieferten, live getesteten Code angeglichen.)
Accent:    je Theme (seit 2026-10-11, WCAG AA, Nutzer-Freigabe; vorher
           #E8600A, das mit weisser Schrift nur 3,44:1 erreichte)
           hell:   --ca #B84800, --ca-dk #9A3C00, --on-ca #FFFFFF
           dunkel: --ca #F07A2E, --ca-dk #FF9450, --on-ca #1A1A1A
           Schrift auf --ca-Flaechen immer var(--on-ca), nie "#fff".
           Ampelfarben als SCHRIFT nur ueber --ok-tx/--warn-tx/--bad-tx.
Status:    LEBENDIG, aber diszipliniert (2026-10-24 "dezent statt kitschig", am 2026-10-26
           wieder kraeftiger, Nutzer-Freigabe):
           hell:   ok #0E7C45, warn #9A5B00, bad #C62828 (Flaechen #E6F4EC/#FBF0DC/#FCEAEA)
           dunkel: ok #3DDC84, warn #FFB020, bad #FF6B5E (Flaechen #12281C/#2E2410/#301816)
           Kontrast der Texte mind. 4,8:1 (alle Paare in beiden Themes per Skript geprueft).
           Status als Zahlen-/Textfarbe, kleiner Punkt und zarte Hinweisflaeche mit Streifen
           links; keine Karten-Oberkanten, keine Ampel-Raender, keine Verlaeufe. Info ist
           NEUTRAL grau (kein Blau). Marineblau nur als Diagrammfarbe (--primary-tx, dunkel
           #8FA6C0). Orange (--ca) fuer Aktion, aktiv, Fokus - nie fuer Warnung. Schalter gruen.
Primary:   #1E3A5F  (Marineblau — Akzent fuer einzelne KPI-/Sektionsfarben)
Surface:   #F5F5F0  (Seitenhintergrund --bg; Karten #FFFFFF --cc; Input --ci #FAFAF7)
Text:      #1A1A1A  (--ct; gedaempft --ch #6C6C62 — am 2026-09-06 von
           #8A8A80 abgedunkelt, das erreichte nur 3,05–3,48:1 und fiel
           damit ueberall durch WCAG AA; jetzt mind. 4,64:1)
Border:    #E5E5DC  (--cb)
Radius:    12px
Font:      'DM Sans' → sans-serif
Mobile:    font-size 16px auf Inputs (iOS-Zoom-Schutz)

Diese Tokens werden in KEINER Antwort geändert,
es sei denn, der User fordert es explizit.

── PRODUKT-SCOPE (Ist-Zustand 2026-07-31) ──────────────
6 Rechner:
  1. Renditerechner       (Hauptrechner: Rendite, Cashflow,
                            Steuervorteile, Mietrecht, Risikoanalyse)
  2. Kreditrechner         (Finanzierung: monatliche Rate,
                            Tilgungsplan, Restschuld nach Zinsbindung)
  3. Mieterhöhungsrechner  (Mietrecht: nächste Mieterhöhung,
                            Mietentwicklung)
  4. Sanierungsrechner     (Kosten, BEG-Förderung, CO2-Einsparung,
                            Amortisationsdauer)
  5. Steueroptimierung §6  (Steuer: Rückwärtsrechnung — nötige
                            Sanierungskosten/Kaufpreis, um Einkommen-
                            steuer auf null zu bringen)
  6. Vorfälligkeitsrechner (Kosten vorzeitiger Kreditablösung,
                            BGH-konform, tagesaktueller Pfandbrief-
                            Wiederanlagezins, vollständiger Tilgungsplan)

── UMGEBUNGEN (Modell seit 2026-10-11) ────────────────
prod und qa sind ZWILLINGE und haben immer denselben Stand.
Entwickelt und committet wird direkt auf dem Branch main.

  prod   immofuchs.info       Branch main   Worker api.immofuchs.info
  qa     qa.immofuchs.info    Branch main   Worker api-qa.immofuchs.info
         qa = Zwilling von prod im Standby (STANDBY=true): nur
         lesen, keine Mails, keine Käufe. Gleiche Datenbank wie
         prod. Alles, was auf prod läuft, muss auch auf qa laufen.
  dev    dev.immofuchs.info   Branch Immofuchs-dev   api-dev.immofuchs.info
         Entwicklungsumgebung mit eigener Datenbank. Bekommt den
         prod-Stand nur manuell (push.ps1 dev-sync); der Monatsjob
         aktualisiert dev weiterhin selbst.

Regeln:
  - Ein Release (push.ps1 prod) aktualisiert prod UND qa
    gemeinsam: Tests, Worker erst qa dann prod, danach Push auf
    main (die CI deployt beide Frontends). Nie nur eines von beiden.
  - Der Branch Immofuchs-qa wird nicht mehr benutzt (Archiv).
  - Datenbank-Migrationen gelten für prod UND qa gleichzeitig und
    müssen abwärtskompatibel sein.
  - Gewollte Unterschiede qa gegenüber prod: Domains
    (ALLOWED_ORIGIN, APP_BASE_URL), STANDBY, Admin-Zweitfaktor aus,
    keine Steuernummer, ein Cron statt zwei. Alles andere muss
    gleich sein: Prüfung mit scripts\check-twin.ps1 (Konfiguration)
    und scripts\check-secrets.ps1 (Secret-Namen je Umgebung).
  - Änderungen an Konfiguration oder Verdrahtung immer in prod UND
    qa vornehmen (wrangler.toml: [vars] und [env.qa.vars]).

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

2. Deployment-Frage stellen (keine Frage nach einem localhost-Test):
   „Möchtest du deployen? Wähle:
     [1] prod + qa → push.ps1 prod   (Release, beide gemeinsam)
     [2] dev       → push.ps1 dev    (nur Entwicklungsumgebung)
     [3] dev-Sync  → push.ps1 dev-sync (dev auf prod-Stand setzen,
                                        überschreibt Immofuchs-dev)
     [4] Kein Deploy"

   Vorher nie in einem Arbeitsverzeichnis releasen, in dem
   fremde, nicht committete Änderungen anderer Sitzungen liegen:
   erst mit „push.ps1 prod -DryRun" den Plan zeigen und nur die
   eigenen Dateien committen.

═══════════════════════════════════════════════════════
