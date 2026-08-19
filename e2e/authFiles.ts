// Absolute Pfade zu den von browser-global-setup.ts geschriebenen
// storageState-Dateien - als String-Literal in test.use({storageState: "..."})
// waere der Pfad relativ zum Konfig-Verzeichnis mehrdeutig, je nachdem von wo
// aus `playwright test` aufgerufen wird. Absolut ist eindeutig.
//
// Ordner-Umzug 2026-08-19 (Nutzerwunsch "alles in einem Ordner"): diese
// Datei lag vorher in browser-e2e/lib/ (eine Ebene unter der Suite), .auth/
// war also ".."+".auth" von hier aus. Jetzt liegt sie direkt im flachen
// e2e/-Ordner, .auth/ ist damit ein direktes Geschwister - eine Ebene
// weniger.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AUTH_DIR = join(dirname(fileURLToPath(import.meta.url)), ".auth");

export const MONATLICH_STORAGE_STATE = join(AUTH_DIR, "monatlich.json");
export const ADMIN_STORAGE_STATE = join(AUTH_DIR, "admin.json");
