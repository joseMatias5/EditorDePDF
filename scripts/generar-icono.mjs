// Convierte build/icono.svg en build/icon.png (1024 px), que electron-builder usa para los tres sistemas
// (genera .ico y .icns a partir de él). Se ejecuta a mano al cambiar el ícono: `node scripts/generar-icono.mjs`.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(raiz, "build", "icono.svg"), "utf8");
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1024, height: 1024 } });
await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", '<svg width="1024" height="1024" ')}</body></html>`);
await pagina.locator("svg").screenshot({ path: join(raiz, "build", "icon.png"), omitBackground: true });
await navegador.close();
console.log("build/icon.png generado");
