# Rechner-Qualitätsaudit — ImmoFuchs.info

**Datum:** 2026-07-05 | **Datei:** `src/App.jsx` (3671 Zeilen)

---

## 🔴 KRITISCH

### S1 — Sanierungsrechner: Amortisation Einheitenfehler

**Zeile 1979**

```js
// Bug:
const espEuro = Math.round(ekG * epKwh);

// Fix:
const espEuro = ekG;  // bereits in €/Jahr
```

`ekG` ist bereits in €/Jahr berechnet. Multiplikation mit `epKwh` (€/kWh) ist ein Dimensionsfehler.  
**Auswirkung:** Amortisation bis 8× falsch (z.B. 175 Jahre angezeigt statt korrekt 23 Jahre).

---

## 🟠 HOCH

### F1 — Finanzierungsrechner: Tilgungsplan jährlich statt monatlich iteriert

**Zeilen 1191, 1666**

```js
// Bug: jährliche Näherung — Restschuld sinkt aber monatlich
const zi = rs * (zP/100);

// Fix: monatliche Iteration nötig
const mz = zP / 100 / 12;
// 12 Monate pro Jahr einzeln durchlaufen
```

**Auswirkung:** Gesamtzinsen ~4 % überschätzt (~6.000 € bei 240k/3,5%/2%-Tilgung). Restschuld im Tilgungsplan jedes Jahr zu hoch.

### F2 — Finanzierungsrechner: Zinsenersparnis Sondertilgung methodisch verfälscht

**Zeilen 1667, 1689**

```js
sZ += z;    // jährliche Methode (fehlerhaft, Bug F1)
sZ2 += zi;  // monatlich exakt (korrekt)
const zinsenGespart = sZ - sZ2;  // Differenz enthält ~6.000 € Methodenartefakt
```

**Auswirkung:** Angezeigte Sondertilgungs-Ersparnis ~6.000 € zu hoch (unabhängig von der tatsächlichen Sondertilgung).

---

## 🟡 MITTEL

### M1 — Mieterhöhungsrechner: Kappungsgrenze auf falsche Referenzmiete

**Zeile 497**

```js
// Bug: vK auf aktuelle Miete angewendet
mxK = akt * (1 + vK/100);

// Fix: Referenz = Miete zu Beginn des 3-Jahres-Fensters
mxK = rentAtF3 * (1 + kappP / 100);
```

§558 Abs. 3 BGB verlangt die Miete am Beginn des 3-Jahres-Fensters als Referenz.  
**Auswirkung:** Bei Vorerhöhungen bis +10 €/Monat (120 €/Jahr) zu hoch — begünstigt stets den Vermieter.

### F3 — Finanzierungsrechner: Beleihungsauslauf ohne Garage im Kredit-Tab

**Zeile 1175 vs. 1659**

```js
// Hauptrechner (korrekt):
const bel = gKP > 0 ? da / gKP * 100 : 0;

// Kredit-Tab (Bug — Garage fehlt):
const bel = kp > 0 ? da / kp * 100 : 0;
```

**Auswirkung:** Bei 20.000 € Garage auf 300.000 € Kaufpreis bis 5,4 PP Abweichung — kann Ampelfarbe (Grün/Gelb/Rot) kippen.

### R1 — Renditerechner: Kaufnebenkosten fehlen im Renditenenner

**Zeile 1181**

```js
// Bug: nbk (Grunderwerbsteuer + Notar + Makler) fehlt
const nR = gesamtInv > 0 ? (effJ * 12 - nuJ) / gesamtInv * 100 : 0;

// Fix:
const nR = (gesamtInv + nbk) > 0 ? (effJ * 12 - nuJ) / (gesamtInv + nbk) * 100 : 0;
```

**Auswirkung:** Nettomietrendite systematisch ~0,3–0,5 PP überschätzt (Kaufnebenkosten 8–15 % fehlen).

### S2 — Sanierungsrechner: Wärmepumpe-Energiepreis unrealistisch

**Datenkonstante**

```js
// Bug:
wp: 0.04,  // entspricht COP ~8,75 (unrealistisch)

// Fix:
wp: 0.09,  // COP 3–4 mit WP-Sondertarif, Marktmittelwert
```

**Auswirkung:** Wärmepumpen-Heizkosten ~3× zu niedrig → Einsparung nach WP-Tausch erscheint unrealistisch klein.

---

## 🟢 MINOR

### F4 — Finanzierungsrechner: Zinssatz 0 % zeigt „0,0 J." Laufzeit

**Zeilen 1661–1662**

```js
// Bug: Sonderfall mz=0 nicht abgefangen
if(mz > 0 && ann > da*mz) lz = Math.log(ann/(ann-da*mz)) / Math.log(1+mz) / 12;

// Fix: else-Zweig ergänzen
else if(mz === 0 && ann > 0) lz = da / ann / 12;
```

### S3 — Sanierungsrechner: KfW-Einkommensbonus-Konstante falsch

**Datenkonstante**

```js
// Bug:
einkommensbonus: 5,   // falsch

// Fix (BEG 2024/2025):
einkommensbonus: 30,  // 30% bei zvE ≤ 40.000 €
```

Aktuell ohne Rechenauswirkung (Wert nicht verwendet), aber gefährlich für zukünftige Implementierungen.

---

## Prioritätsliste

| Prio | Rechner      | Bug                          | Zeile       | Aufwand    |
| ---- | ------------ | ---------------------------- | ----------- | ---------- |
| 1    | Sanierung    | Amortisation Einheitenfehler | 1979        | 1 Zeile    |
| 2    | Finanzierung | Monatliche Zinsiteration     | 1191, 1666  | ~20 Zeilen |
| 3    | Finanzierung | Sondertilgungs-Ersparnis     | 1667, 1689  | ~5 Zeilen  |
| 4    | Mieterhöhung | Kappungsgrenze Referenzmiete | 497         | ~10 Zeilen |
| 5    | Finanzierung | Beleihungsauslauf Garage     | 1175 / 1659 | 1 Zeile    |
| 6    | Rendite      | Kaufnebenkosten im Nenner    | 1181        | 1 Zeile    |
| 7    | Sanierung    | WP-Energiepreis              | Konstante   | 1 Zeile    |
| 8    | Finanzierung | Laufzeit bei 0%-Zins         | 1661–1662   | 2 Zeilen   |
| 9    | Sanierung    | KfW-Einkommensbonus          | Konstante   | 1 Zeile    |
