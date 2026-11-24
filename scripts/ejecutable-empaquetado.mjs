// Imprime la ruta del ejecutable que dejó electron-builder en release/ (carpeta *-unpacked o .app),
// para probar la app empaquetada: EDITOR_PDF_EJECUTABLE="$(node scripts/ejecutable-empaquetado.mjs)" npm run test:empaquetada
// Multiplataforma (L-084): la ruta depende de process.platform y process.arch, sin rutas fijas de un sistema.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const release = join(dirname(fileURLToPath(import.meta.url)), "..", "release");
const candidatos = {
  linux: [join(release, "linux-unpacked", "editor-pdf")],
  win32: [join(release, "win-unpacked", "Editor PDF.exe")],
  darwin: [
    join(release, process.arch === "arm64" ? "mac-arm64" : "mac", "Editor PDF.app", "Contents", "MacOS", "Editor PDF"),
    join(release, "mac-arm64", "Editor PDF.app", "Contents", "MacOS", "Editor PDF"),
    join(release, "mac", "Editor PDF.app", "Contents", "MacOS", "Editor PDF"),
  ],
}[process.platform] ?? [];

const encontrado = candidatos.find((ruta) => existsSync(ruta));
if (encontrado === undefined) {
  console.error(`No se encontró la app empaquetada para ${process.platform}. Buscado en:\n${candidatos.join("\n")}`);
  process.exit(1);
}
console.log(encontrado);
