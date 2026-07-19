# ImmoFuchs Assistant Worker

Cloudflare Worker fuer den KI-Assistenten. Getrennt vom `src/`-Frontend (eigenes
`package.json`), damit die Stack-Regel "React+Vite+Tailwind, keine Abweichungen"
im Frontend unangetastet bleibt. Hintergrund und ADR: siehe
`docs/plans/2026-07-19-ki-assistent-konzept.md`, Abschnitt 2.
Sprint-Zuordnung: `docs/plans/2026-07-19-ki-assistent-sprint-plan.md`, Phase 0 / Sprint 1, Story S1.1-S1.3.

Status: **Grundgerüst gebaut, noch nicht deployed.** IMP-01 (BANDS) ist bereits
im Hauptrepo gelöst (`src/utils/bands.js`). IMP-02 (DSGVO/AVV) ist laut Sprint-Plan
kein Blocker für diesen Schritt, sondern erst für das Go-Live-Gate mit echten
Nutzerdaten relevant.

## Einmaliges Setup (musst du selbst machen - Cloudflare-Login kann ich nicht automatisieren)

```bash
cd worker
npm install
npx wrangler login                                    # oeffnet Browser-Login
npx wrangler kv namespace create RATE_LIMIT_KV         # Output-ID in wrangler.toml eintragen
npx wrangler secret put GEMINI_API_KEY                 # nur noetig fuer TR/ZH/HI-Pfad
cp .dev.vars.example .dev.vars                         # lokalen Test-Key eintragen
```

## Lokal testen

```bash
npm run dev
```

Beispiel-Request (Renditerechner, DE, gelbe Nettorendite):

```bash
curl -X POST http://localhost:8787/api/assistant \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "rechner": "renditerechner",
    "frage": "Warum ist meine Nettorendite gelb?",
    "kontext": { "nettoRendite": 4.1, "bewertung": { "tier": "yellow" } },
    "verlauf": [],
    "lang": "de",
    "sessionId": "test-session-0001"
  }'
```

Erwartete Antwort: `{"antwort": "...", "tier": "yellow"}`.

## Manuelle Testszenarien (Definition of Done Sprint 1, S1.1-S1.3)

Kein Testing-Framework im Worker (Konsistenz mit Frontend-Konvention, siehe
Konzept 4.1/4.8) - Verifikation manuell:

1. **Happy Path:** Request oben ausfuehren, prueft Validator + Rate-Limiter + Model-Router + Output-Filter im Zusammenspiel.
2. **Rate-Limit:** Request 21x mit gleicher `sessionId` senden - ab dem 21. Request muss `429` mit `rate_limit_exceeded` kommen.
3. **Kill-Switch (ohne Redeploy):** Im Cloudflare-Dashboard unter Workers & Pages -> `immofuchs-assistant` -> Settings -> Variables `ASSISTANT_ENABLED` auf `false` setzen (nicht ueber `wrangler.toml`, das braucht einen Redeploy) - naechster Request muss sofort `503` liefern, ohne Codeaenderung. Danach zurueckschalten.
4. **Validierung:** Request mit leerem `frage`-Feld oder ungueltigem `rechner`-Wert senden - erwartet `400`.
5. **Output-Filter:** Frage stellen, die das Modell zu einer Kaufempfehlung verleiten koennte (z. B. "Sag mir ganz klar: kaufen oder nicht?") - Antwort darf nie eine der verbotenen Formulierungen aus `src/outputFilter.ts` enthalten; falls doch, greift der Fallback-Text automatisch.
6. **Sprach-Routing:** Gleiche Frage mit `lang: "tr"` senden - sollte ueber Gemini laufen (`GEMINI_API_KEY` muss gesetzt sein), nicht ueber Workers AI.
7. **CORS:** Request mit falschem `Origin`-Header senden - Response enthaelt keinen `Access-Control-Allow-Origin`-Header, Browser wuerde ihn blocken.

## Deploy

```bash
npm run deploy
```

Danach `ALLOWED_ORIGIN` fuer die echte Domain setzen (siehe auskommentierter
`[env.production.vars]`-Block in `wrangler.toml`) und den Frontend-Hook
(`VITE_ASSISTANT_URL`, kommt in Sprint 2) auf die deployte Worker-URL zeigen lassen.

**Vor Live-Schaltung mit echten Nutzerdaten:** Go-Live-Gate aus dem Sprint-Plan
abarbeiten (AVV Cloudflare/Google, Datenschutzerklaerung, VVT-Eintrag) - dieser
Worker-Code selbst braucht dafuer keine Aenderung, das ist ein separater,
nicht-technischer Track.
