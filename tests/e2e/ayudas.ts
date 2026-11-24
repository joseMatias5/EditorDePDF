import { expect, type Locator, type Page } from "@playwright/test";
import { crearPdfDePrueba } from "../ayudas/pdfDePrueba";

/** Errores de JavaScript de la página: toda prueba termina comprobando que no hubo ninguno (L-088). */
export function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  return errores;
}

export async function abrirPdf(page: Page, datos: { nombre?: string; bytes?: Uint8Array } = {}): Promise<void> {
  const bytes = datos.bytes ?? (await crearPdfDePrueba());
  // Si ya hay un documento, se marcan sus páginas para no confundirlas con las del nuevo.
  await page.evaluate(() => document.querySelectorAll(".pagina").forEach((p) => p.setAttribute("data-viejo", "")));
  await page.locator("#entrada-archivo").setInputFiles({
    name: datos.nombre ?? "prueba.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await expect(page.locator(".pagina:not([data-viejo])")).toHaveCount(2);
  await expect(page.locator(".pagina[data-viejo]")).toHaveCount(0);
  await expect(pagina(page, 1).locator(".textLayer span").first()).toBeVisible();
}

export const pagina = (page: Page, numero: number): Locator => page.locator(`.pagina[data-pagina="${numero}"]`);

/** Figuras SVG dibujadas (resaltados, subrayados, trazos) de una página. */
export const figuras = (page: Page, numero: number): Locator =>
  pagina(page, numero).locator(".capa-anotaciones g.anotaciones > *");

/** Selecciona con el mouse el texto de la primera línea de la página (como haría la persona). */
export async function seleccionarPrimeraLinea(page: Page, numero = 1): Promise<void> {
  const span = pagina(page, numero).locator(".textLayer span").first();
  await span.scrollIntoViewIfNeeded();
  const caja = await span.boundingBox();
  if (caja === null) throw new Error("La capa de texto no tiene caja");
  const y = caja.y + caja.height / 2;
  await page.mouse.move(caja.x + 1, y);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width - 1, y, { steps: 6 });
  await page.mouse.up();
}

/**
 * Desplaza el documento para que la fracción [fx, fy] de la página quede en el centro de la ventana
 * (ajustada al ancho, una página de escritorio mide más que la ventana) y devuelve la caja de la página.
 */
async function centrarEn(page: Page, datos: { numero: number; en: [number, number] }) {
  await pagina(page, datos.numero).evaluate((el, fy) => {
    const zona = document.getElementById("documento") as HTMLElement;
    const caja = el.getBoundingClientRect();
    const zonaCaja = zona.getBoundingClientRect();
    zona.scrollTop += caja.top + caja.height * fy - (zonaCaja.top + zonaCaja.height / 2);
  }, datos.en[1]);
  const caja = await pagina(page, datos.numero).boundingBox();
  if (caja === null) throw new Error("La página no tiene caja");
  return (f: [number, number]) => [caja.x + caja.width * f[0], caja.y + caja.height * f[1]] as const;
}

/** Arrastra el mouse sobre la página, en fracciones de su ancho y alto. */
export async function arrastrar(page: Page, datos: { numero: number; desde: [number, number]; hasta: [number, number] }) {
  const punto = await centrarEn(page, { numero: datos.numero, en: datos.desde });
  await page.mouse.move(...punto(datos.desde));
  await page.mouse.down();
  await page.mouse.move(...punto(datos.hasta), { steps: 8 });
  await page.mouse.up();
}

export async function clicEnPagina(page: Page, datos: { numero: number; en: [number, number] }) {
  const punto = await centrarEn(page, datos);
  await page.mouse.click(...punto(datos.en));
}

/** Lleva la página a la vista (en móvil la segunda puede estar fuera de pantalla). */
export async function verPagina(page: Page, numero: number): Promise<void> {
  await pagina(page, numero).scrollIntoViewIfNeeded();
  await expect(pagina(page, numero).locator("canvas")).toBeVisible();
}
