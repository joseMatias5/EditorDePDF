import { defineConfig, devices } from "@playwright/test";

const PUERTO = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  // Siempre build nuevo antes de probar: los e2e prueban el último build, no la rama (L-086).
  webServer: {
    command: "npm run build && npm run preview",
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
