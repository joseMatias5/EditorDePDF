import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // public/pdfjs: recursos de terceros copiados por scripts/copiar-recursos-pdfjs.mjs.
  { ignores: ["dist", "node_modules", "playwright-report", "test-results", "public"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: false }],
      "max-params": ["error", 3],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "escritorio/**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly", Response: "readonly", URL: "readonly" } },
  },
  {
    // Preload de Electron: CommonJS (los preloads con sandbox no admiten módulos ES).
    files: ["escritorio/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { require: "readonly" } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
