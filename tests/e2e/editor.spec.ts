import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { subtiposPorPagina } from "../ayudas/pdfDePrueba";
import {
  abrirPdf,
  arrastrar,
  clicEnPagina,
  figuras,
  pagina,
  seleccionarPrimeraLinea,
  verPagina,
  vigilarErrores,
} from "./ayudas";

const VERDE = "#5CD65C";
const ROJO = "#F03A3A";
const AZUL = "#4DB8FF";

let errores: string[];

test.beforeEach(async ({ page }) => {
  errores = vigilarErrores(page);
  await page.goto("/");
});

test.afterEach(() => {
  expect(errores, "errores de JavaScript en la página").toEqual([]);
});

test("humo: la pantalla inicial invita a abrir un PDF y muestra las teclas", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Abrí un PDF para empezar a anotarlo");
  await expect(page.locator("#resumen-teclas")).toContainText("Deshacer");
  await expect(page.getByRole("button", { name: /Guardar/ })).toBeDisabled();
});

test("resaltar seleccionando texto, con el color elegido por tecla", async ({ page }) => {
  await abrirPdf(page);
  await page.keyboard.press("2"); // verde
  await expect(page.getByRole("button", { name: "Color 2: Verde, tecla 2" })).toHaveAttribute("aria-pressed", "true");

  await seleccionarPrimeraLinea(page);
  await expect(figuras(page, 1)).toHaveCount(1);
  await expect(figuras(page, 1).locator("rect")).toHaveAttribute("fill", VERDE);
  await expect(page.locator(".estado-guardado")).toHaveText("Sin guardar");
});

test("REGRESIÓN: el resaltado deja ver el texto de abajo (no es una franja opaca)", async ({ page }) => {
  await abrirPdf(page);
  await page.keyboard.press("2"); // verde: el más oscuro de los claros
  await seleccionarPrimeraLinea(page);
  const marca = figuras(page, 1).locator("rect");
  await expect(marca).toHaveCount(1);
  const caja = await marca.boundingBox();
  if (caja === null) throw new Error("El resaltado no tiene caja");
  const captura = await page.screenshot({ clip: caja });
  // Se decodifica la captura en el propio navegador y se cuentan píxeles oscuros (las letras).
  const oscuros = await page.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const lienzo = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    const ctx = lienzo.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, img.width, img.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) < 200) n++;
    return n;
  }, captura.toString("base64"));
  expect(oscuros, "píxeles de texto visibles dentro del resaltado").toBeGreaterThan(20);
});

test("personalizar un color eligiendo opciones: color, intensidad y transparencia", async ({ page }) => {
  await abrirPdf(page);
  await page.getByRole("button", { name: "Colores", exact: true }).click();
  const dialogo = page.getByRole("dialog", { name: "Colores" });
  await expect(dialogo.getByRole("button", { name: /^Tecla 1:/ })).toHaveAttribute("aria-pressed", "true");

  await dialogo.getByRole("button", { name: "Violeta intenso" }).click();
  await dialogo.getByRole("button", { name: "40 % transparente" }).click();
  await expect(dialogo.locator(".color-elegido")).toHaveText("Tecla 1: Violeta intenso, 40 % transparente");
  await page.keyboard.press("z"); // con la ventana abierta, las teclas no son atajos
  await dialogo.getByRole("button", { name: "Listo" }).click();

  await expect(page.getByRole("button", { name: "Color 1: Violeta intenso, 40 % transparente, tecla 1" })).toBeVisible();
  await seleccionarPrimeraLinea(page);
  await expect(figuras(page, 1)).toHaveAttribute("opacity", "0.6");
  await expect(figuras(page, 1).locator("rect")).toHaveAttribute("fill", "#6A2FD1");

  // Cambiar la tecla después no altera lo ya dibujado.
  await page.getByRole("button", { name: "Colores", exact: true }).click();
  await dialogo.getByRole("button", { name: "Restablecer esta tecla" }).click();
  await dialogo.getByRole("button", { name: "Listo" }).click();
  await expect(figuras(page, 1).locator("rect")).toHaveAttribute("fill", "#6A2FD1");
});

test("doble clic en un color abre sus opciones, y la elección queda guardada al recargar", async ({ page }) => {
  await abrirPdf(page);
  await page.getByRole("button", { name: /^Color 3:/ }).dblclick();
  const dialogo = page.getByRole("dialog", { name: "Colores" });
  await expect(dialogo.getByRole("button", { name: /^Tecla 3:/ })).toHaveAttribute("aria-pressed", "true");
  await dialogo.getByRole("button", { name: "Marrón claro" }).click();
  await dialogo.getByRole("button", { name: "Listo" }).click();

  await page.reload();
  await expect(page.getByRole("button", { name: "Color 3: Marrón claro, tecla 3" })).toBeVisible();
});

test("deshacer con Z y rehacer con Y; Ctrl+Z no hace nada", async ({ page }) => {
  await abrirPdf(page);
  await seleccionarPrimeraLinea(page);
  await expect(figuras(page, 1)).toHaveCount(1);

  await page.keyboard.press("Control+z");
  await expect(figuras(page, 1)).toHaveCount(1);

  await page.keyboard.press("z");
  await expect(figuras(page, 1)).toHaveCount(0);
  await page.keyboard.press("y");
  await expect(figuras(page, 1)).toHaveCount(1);
  await page.keyboard.press("Shift+Z"); // Bloq Mayús o Mayús no cambian el atajo
  await expect(figuras(page, 1)).toHaveCount(0);
});

test("subrayar y dibujar alternando colores con el teclado", async ({ page }) => {
  await abrirPdf(page);
  await page.keyboard.press("u");
  await page.keyboard.press("3"); // azul
  await seleccionarPrimeraLinea(page);
  await expect(figuras(page, 1).locator("line")).toHaveAttribute("stroke", AZUL);

  await page.keyboard.press("d");
  await page.keyboard.press("5"); // rojo
  await arrastrar(page, { numero: 1, desde: [0.2, 0.4], hasta: [0.6, 0.5] });
  await expect(figuras(page, 1)).toHaveCount(2);
  await expect(figuras(page, 1).last()).toHaveAttribute("stroke", ROJO);
});

test("cuadro de texto: lo escrito no dispara atajos y se deshace como un paso", async ({ page }) => {
  await abrirPdf(page);
  await page.keyboard.press("t");
  await page.keyboard.press("6"); // naranja
  await clicEnPagina(page, { numero: 1, en: [0.2, 0.3] });
  const area = page.getByRole("textbox", { name: "Texto del cuadro" });
  await expect(area).toBeFocused();
  await page.keyboard.type("Nota 123 zy");
  await page.keyboard.press("Escape");

  const cuadro = pagina(page, 1).locator(".cuadro-texto");
  await expect(cuadro).toHaveText("Nota 123 zy");
  await expect(page.getByRole("button", { name: /Color 6: Naranja/ })).toHaveAttribute("aria-pressed", "true");

  // Editar el texto existente.
  await cuadro.click();
  await expect(area).toHaveValue("Nota 123 zy");
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await page.keyboard.press("Escape");
  await expect(cuadro).toHaveText("Nota 123 zy!");

  await page.keyboard.press("z");
  await expect(cuadro).toHaveText("Nota 123 zy");
  await page.keyboard.press("z");
  await expect(cuadro).toHaveCount(0);
});

test("borrador: un clic sobre la marca la quita y Z la devuelve", async ({ page }) => {
  await abrirPdf(page);
  await page.keyboard.press("d");
  await arrastrar(page, { numero: 1, desde: [0.3, 0.6], hasta: [0.7, 0.6] });
  await expect(figuras(page, 1)).toHaveCount(1);

  await page.keyboard.press("b");
  await clicEnPagina(page, { numero: 1, en: [0.5, 0.6] });
  await expect(figuras(page, 1)).toHaveCount(0);
  await page.keyboard.press("z");
  await expect(figuras(page, 1)).toHaveCount(1);
});

test("reasignar la tecla de deshacer, y que quede guardada al recargar", async ({ page }) => {
  await page.getByRole("button", { name: /Teclas/ }).click();
  const dialogo = page.getByRole("dialog", { name: "Teclas" });
  await dialogo.getByRole("button", { name: "Cambiar la tecla de Deshacer" }).click();
  await page.keyboard.press("q");
  await expect(dialogo.getByRole("status")).toHaveText("«Deshacer» ahora usa Q.");

  // Elegir una tecla ocupada intercambia y avisa.
  await dialogo.getByRole("button", { name: "Cambiar la tecla de Rehacer" }).click();
  await page.keyboard.press("1");
  await expect(dialogo.getByRole("status")).toContainText("«Color 1» pasó a Y");
  await dialogo.getByRole("button", { name: "Cerrar" }).click();

  await abrirPdf(page);
  await page.keyboard.press("d");
  await arrastrar(page, { numero: 1, desde: [0.3, 0.6], hasta: [0.7, 0.6] });
  await page.keyboard.press("z"); // ya no deshace
  await expect(figuras(page, 1)).toHaveCount(1);
  await page.keyboard.press("q");
  await expect(figuras(page, 1)).toHaveCount(0);
  await page.keyboard.press("1"); // ahora rehace
  await expect(figuras(page, 1)).toHaveCount(1);

  await page.reload();
  await expect(page.locator("#resumen-teclas")).toContainText("QDeshacer");
});

test("guardar descarga un PDF con anotaciones estándar que al reabrirlo siguen siendo editables", async ({ page }) => {
  await abrirPdf(page, { nombre: "apuntes.pdf" });
  await seleccionarPrimeraLinea(page);
  await verPagina(page, 2);
  await page.keyboard.press("d");
  await arrastrar(page, { numero: 2, desde: [0.2, 0.2], hasta: [0.5, 0.3] });

  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: /Guardar/ }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toBe("apuntes.pdf");
  await expect(page.getByRole("status").filter({ hasText: "Se descargó" })).toBeVisible();
  await expect(page.locator(".estado-guardado")).toHaveText("");

  const bytes = new Uint8Array(await readFile(await archivo.path()));
  expect(await subtiposPorPagina(bytes)).toEqual([["Text", "Highlight"], ["Ink"]]);

  // Reabrir: las anotaciones vuelven como propias (se pueden deshacer/borrar) y no se duplican.
  await abrirPdf(page, { nombre: "apuntes.pdf", bytes });
  await expect(figuras(page, 1)).toHaveCount(1);
  await page.keyboard.press("b");
  await seleccionarPrimeraLinea(page); // un clic-arrastre sobre la marca con el borrador
  await expect(figuras(page, 1)).toHaveCount(0);
});

test("un archivo que no es PDF muestra un error que no desaparece solo", async ({ page }) => {
  await page.locator("#entrada-archivo").setInputFiles({ name: "foto.pdf", mimeType: "application/pdf", buffer: Buffer.from("no soy un pdf") });
  const alerta = page.getByRole("alert");
  await expect(alerta).toContainText("No se pudo abrir «foto.pdf»");
  await page.waitForTimeout(500);
  await expect(alerta).toBeVisible();
  await expect(page.locator(".pagina")).toHaveCount(0);

  await abrirPdf(page);
  await expect(alerta).toBeHidden();
  errores = errores.filter((e) => !/Invalid PDF|InvalidPDFException/i.test(e)); // el error de pdf.js es el esperado
});

test("zoom: acercar agranda la página y las anotaciones la acompañan", async ({ page }) => {
  await abrirPdf(page);
  await seleccionarPrimeraLinea(page);
  const antes = await figuras(page, 1).boundingBox();
  await page.getByRole("button", { name: "Acercar" }).click();
  await expect(page.locator(".grupo output")).not.toHaveText("");
  const despues = await figuras(page, 1).boundingBox();
  expect(despues?.width ?? 0).toBeGreaterThan((antes?.width ?? 0) * 1.1);
});

test("REGRESIÓN: sin desborde horizontal, medido contra el ancho del dispositivo", async ({ page }) => {
  // En emulación móvil, innerWidth crece hasta el contenido: compararlo con scrollWidth da 0 aunque desborde.
  const anchoDispositivo = page.viewportSize()?.width ?? 0;
  for (const estado of ["vacío", "con documento"]) {
    if (estado === "con documento") await abrirPdf(page);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, estado).toBeLessThanOrEqual(anchoDispositivo);
  }
});

test("accesibilidad (axe): pantalla inicial, documento abierto y ventana de teclas", async ({ page }) => {
  const revisar = async () => {
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  };
  await revisar();
  await abrirPdf(page);
  await revisar();
  await page.getByRole("button", { name: /Teclas/ }).click();
  await revisar();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Colores", exact: true }).click();
  await revisar();
});
