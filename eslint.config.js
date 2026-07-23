import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import prettier from "eslint-config-prettier";

// Flat-Config (ESLint 9). Bewusst fehlerfokussiert und auf src/ beschraenkt:
// - Korrektheit statt Stil (Formatierung uebernimmt Prettier).
// - Worker-TypeScript wird nicht hier, sondern per `tsc --noEmit` geprueft.
export default [
  {
    ignores: ["dist/**", "node_modules/**", "worker/**", "public/**", "_image_backups_card/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // Vite/React 17+ JSX-Transform: kein `import React` noetig
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      // Markiert in JSX verwendete Bezeichner als "genutzt" (verhindert
      // no-unused-vars-Fehlalarme fuer importierte Komponenten)
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Leere catch-Bloecke sind hier bewusst (localStorage-/Speech-API-Guards)
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Geschuetzte/schmale Leerzeichen sind bewusste dt. Typografie in Texten
      // (z. B. "1 %"), aber im Code weiterhin nicht erlaubt.
      "no-irregular-whitespace": [
        "error",
        { skipStrings: true, skipTemplates: true, skipJSXText: true },
      ],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  prettier,
];
