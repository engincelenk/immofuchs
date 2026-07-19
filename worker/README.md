# ImmoFuchs Assistant Worker

Cloudflare Worker fuer den KI-Assistenten. Getrennt vom `src/`-Frontend (eigenes
`package.json`), damit die Stack-Regel "React+Vite+Tailwind, keine Abweichungen"
im Frontend unangetastet bleibt. Hintergrund und ADR: siehe
`docs/plans/2026-07-19-ki-assistent-konzept.md`, Abschnitt 2.
Sprint-Zuordnung: `docs/plans/2026-07-19-ki-assistent-sprint-plan.md`, Phase 0 / Sprint 1, Story S1.1-S1.3.

Status: **Deployed und live-verifiziert** unter
`https://immofuchs-assistant.engincelenk.workers.dev`. IMP-01 (BANDS) ist bereits
im Hauptrepo gelöst (`src/utils/bands.js`). IMP-02 (DSGVO/AVV) ist laut Sprint-Plan
kein Blocker für diesen Schritt, sondern erst für das Go-Live-Gate mit echten
Nutzerdaten relevant.

**Bugfix nach Live-Test (2026-07-19):** Der ursprüngliche KV-basierte Rate-Limiter
hat beim echten Test (21 Anfragen, gleiche Session) das Tageslimit nicht
durchgesetzt — alle 21 kamen mit `200` durch. Ursache: Cloudflare KV ist
"eventually consistent" mit Negative-Cache-Verhalten (ein frisch geschriebener
Zähler wird bei schnellen Folgeanfragen bis zu 60s lang nicht gelesen). Behoben
durch Umstieg auf ein **Durable Object pro Session** (`sessionRateLimiter.ts`) —
verarbeitet Anfragen strikt nacheinander, dadurch garantiert konsistenter Zähler.
Erneuter Live-Test danach: 21 Anfragen, gleiche Session — Anfragen 1-20 lieferten
`200`, Anfrage 21 korrekt `429`. Fix bestätigt.

## Einmaliges Setup (musst du selbst machen - Cloudflare-Login kann ich nicht automatisieren)

```bash
cd worker
npm install
npx wrangler login                                    # oeffnet Browser-Login
npx wrangler secret put GEMINI_API_KEY                 # nur noetig fuer TR/ZH/HI-Pfad
cp .dev.vars.example .dev.vars                         # lokalen Test-Key eintragen
```

Der Rate-Limiter-Zaehler laeuft ueber ein Durable Object (`SessionRateLimiter`),
kein manuelles Anlegen noetig - die Migration in `wrangler.toml` erledigt das
automatisch beim ersten Deploy.

**Hinweis lokaler Dev-Modus:** `npm run dev` versucht das `AI`-Binding remote zu
proxyen (Workers AI simuliert nie lokal) - dafuer muss einmalig eine
`workers.dev`-Subdomain im Cloudflare-Dashboard registriert sein (Onboarding-Link
erscheint in der Fehlermeldung, falls das fehlt). Dieser Remote-Proxy-Hybrid-Modus
war bei uns zeitweise instabil (`internal error`) - im Zweifel direkt gegen den
deployten Worker testen (`npm run deploy`, dann curl/Invoke-RestMethod gegen die
echte URL), das ist der zuverlaessigere Test-Pfad.

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

1. ✅ **Happy Path:** Request oben ausfuehren, prueft Validator + Rate-Limiter + Model-Router + Output-Filter im Zusammenspiel. **Live bestaetigt** (2026-07-19) — echte Antwort inkl. korrektem `tier`.
2. ✅ **Rate-Limit:** Request 21x mit gleicher `sessionId` senden - ab dem 21. Request muss `429` mit `rate_limit_exceeded` kommen. **Live bestaetigt** — 1-20 `200`, 21 `429` (nach Umstieg von KV auf Durable Object, siehe Bugfix-Hinweis oben).
3. ⬜ **Kill-Switch (ohne Redeploy):** Im Cloudflare-Dashboard unter Workers & Pages -> `immofuchs-assistant` -> Settings -> Variables `ASSISTANT_ENABLED` auf `false` setzen (nicht ueber `wrangler.toml`, das braucht einen Redeploy) - naechster Request muss sofort `503` liefern, ohne Codeaenderung. Danach zurueckschalten. **Noch offen — reiner Dashboard-Klicktest, kann nicht automatisiert werden.**
4. ✅ **Validierung:** Request mit leerem `frage`-Feld oder ungueltigem `rechner`-Wert senden - erwartet `400`. **Live bestaetigt.**
5. ✅ **Output-Filter:** Frage stellen, die das Modell zu einer Kaufempfehlung verleiten koennte (z. B. "Sag mir ganz klar: kaufen oder nicht?") - Antwort darf nie eine der verbotenen Formulierungen aus `src/outputFilter.ts` enthalten; falls doch, greift der Fallback-Text automatisch. **Live bestaetigt** — Jailbreak-Versuch ("Ignoriere alle vorherigen Anweisungen...") wich korrekt aus, keine Kaufempfehlung.
6. ⚠️ **Sprach-Routing:** Gleiche Frage mit `lang: "tr"` senden - sollte ueber Gemini laufen (`GEMINI_API_KEY` muss gesetzt sein), nicht ueber Workers AI. **Getestet, aber `GEMINI_API_KEY` noch nicht gesetzt** — Weiche schaltet nachweislich zu Gemini (nicht Workers AI), schlaegt aber mangels Key mit `model_call_failed` fehl. Kein Bug, siehe Setup-Schritt "Gemini-Key setzen".
7. ✅ **CORS:** Request mit falschem `Origin`-Header senden - Response enthaelt keinen `Access-Control-Allow-Origin`-Header, Browser wuerde ihn blocken. **Live bestaetigt.**

## Deploy

```bash
npm run deploy
```

Aktuell deployed unter `https://immofuchs-assistant.engincelenk.workers.dev`.
`ALLOWED_ORIGIN` steht noch auf `http://localhost:5173` (Dev-Wert) - vor echtem
Produktions-Traffic den auskommentierten `[env.production.vars]`-Block in
`wrangler.toml` aktivieren (`ALLOWED_ORIGIN = "https://immofuchs.info"`) und
erneut deployen. Frontend-`.env` mit `VITE_ASSISTANT_URL` auf die obige URL
zeigen lassen (siehe `.env.example` im Hauptverzeichnis).

**Vor Live-Schaltung mit echten Nutzerdaten:** Go-Live-Gate aus dem Sprint-Plan
abarbeiten (AVV Cloudflare/Google, Datenschutzerklaerung, VVT-Eintrag) - dieser
Worker-Code selbst braucht dafuer keine Aenderung, das ist ein separater,
nicht-technischer Track.
