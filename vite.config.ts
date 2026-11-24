import { defineConfig } from "vitest/config";

export default defineConfig({
  // Rutas relativas: el build se puede abrir desde cualquier carpeta o servidor estático.
  base: "./",
  // pdf.js pesa ~1 MB minificado; la app se sirve en local, así que el aviso de 500 kB no aplica.
  build: { target: "es2022", chunkSizeWarningLimit: 1500 },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 15_000,
  },
});
