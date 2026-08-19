import { it } from "vitest";

// Diese Datei ist obsolet (2026-08-18).
//
// Der komplette Inhalt basierte auf test.free (garantiert "kein Abo") -
// dieses Testkonto wurde geloescht und wird nicht mehr verwendet, siehe
// release-notes.txt. Drei der sieben ehemaligen Testfaelle brauchten den
// "kein Abo"-Zustand NICHT (reine Validierung, die vor jedem Subscription-
// Lookup greift) und wurden nach billing-gaps.e2e.test.ts uebernommen
// (auf test.monatlich umgestellt). Die restlichen vier (cancel/refund/
// change-plan ohne Abo -> 404, leere Rechnungsliste) brauchten zwingend ein
// Konto OHNE aktives Abo und sind ersatzlos entfallen - siehe README.md.
//
// TODO (manuell): diese Datei per Explorer/Editor loeschen - der
// device_commit_files-Uebertragungsweg kann keine Dateien entfernen. Bis
// dahin bewusst mit einem einzigen it.skip statt "leerer Datei" (vitest
// meldet "No test suite found" als Fehler fuer Dateien ganz ohne
// it/describe-Block).
it.skip("obsolet (test.free geloescht) - siehe Datei-Kommentar, Datei kann geloescht werden", () => {});
