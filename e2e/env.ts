// Gemeinsame Umgebungs-Konstanten der Browser-E2E-Suite (Stage 3, 2026-08-19).
//
// WARUM dieselben Env-Var-Namen wie worker/e2e/setup.ts: es sind dieselben
// Testkonten auf demselben dev-Deployment. Zwei verschiedene Namen fuer
// dasselbe Passwort waeren nur eine zweite Stelle, die auseinanderlaufen
// kann - siehe die Session-ID-Verwirrung, die worker/e2e/global-setup.ts am
// 19.08. beheben musste. E2E_PASSWORD_MONATLICH etc. reichen daher hier
// unveraendert aus, keine neue .env.local noetig.
export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "https://api-dev.immofuchs.info";
export const FRONTEND_BASE_URL = process.env.E2E_ORIGIN ?? "https://dev.immofuchs.info";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} fehlt - siehe browser-e2e/README.md.`);
  }
  return value;
}
