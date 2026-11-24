// Copia a public/pdfjs/ los recursos que pdf.js descarga en tiempo de ejecución
// (mapas de caracteres, fuentes estándar, decodificadores wasm, perfiles de color).
// Multiplataforma: solo usa node:fs y node:path (L-084).
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "pdfjs-dist");
const destino = join(raiz, "public", "pdfjs");

rmSync(destino, { recursive: true, force: true });
for (const carpeta of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(join(origen, carpeta), join(destino, carpeta), { recursive: true });
}
console.log(`Recursos de pdf.js copiados a ${destino}`);
