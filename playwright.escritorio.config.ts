import { defineConfig } from "@playwright/test";

/** Pruebas de la app de escritorio (Electron). Usan el build de dist/: correr con `npm run test:escritorio`. */
export default defineConfig({
  testDir: "tests/escritorio-e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
});
