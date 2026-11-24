import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { crearPdfDePrueba, subtiposPorPagina } from "../ayudas/pdfDePrueba";

const RAIZ = resolve(import.meta.dirname, "../..");

let carpeta: string;
let ruta: string;
let app: ElectronApplication;
let ventana: Page;
let errores: string[];

/** El diálogo nativo no se puede manejar desde la prueba: se reemplaza en el proceso principal. */
async function simularDialogoAbrir(destino: string) {
  await app.evaluate(({ dialog }, r) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [r] })) as typeof dialog.showOpenDialog;
  }, destino);
}

const marcas = () => ventana.locator('.pagina[data-pagina="1"] .capa-anotaciones g.anotaciones > *');

/**
 * Arrastra sobre la primera línea. Con Resaltar/Subrayar espera ver la marca nueva antes de seguir:
 * sin esa espera, a veces se guardaba antes de que existiera (falló 1 de cada 20).
 */
async function resaltarPrimeraLinea(opciones: { esperarMarca?: boolean } = { esperarMarca: true }) {
  const antes = await marcas().count();
  const span = ventana.locator('.pagina[data-pagina="1"] .textLayer span').first();
  const caja = await span.boundingBox();
  if (caja === null) throw new Error("Sin capa de texto");
  await ventana.mouse.move(caja.x + 1, caja.y + caja.height / 2);
  await ventana.mouse.down();
  await ventana.mouse.move(caja.x + caja.width - 1, caja.y + caja.height / 2, { steps: 5 });
  await ventana.mouse.up();
  if (opciones.esperarMarca) await expect(marcas()).toHaveCount(antes + 1);
}

async function abrirPorDialogo() {
  await simularDialogoAbrir(ruta);
  // Las páginas del documento anterior se marcan para no confundirlas con las nuevas (lección 3b del proyecto).
  await ventana.evaluate(() => document.querySelectorAll(".pagina").forEach((p) => p.setAttribute("data-viejo", "")));
  await ventana.getByRole("button", { name: /Abrir PDF/ }).first().click();
  await expect(ventana.locator(".pagina[data-viejo]")).toHaveCount(0);
  await expect(ventana.locator('.pagina[data-pagina="1"] .textLayer span').first()).toBeVisible();
}

test.beforeEach(async () => {
  carpeta = await mkdtemp(join(tmpdir(), "editor-pdf-escritorio-"));
  ruta = join(carpeta, "apuntes.pdf");
  await writeFile(ruta, await crearPdfDePrueba());
  app = await electron.launch({ args: [RAIZ] });
  ventana = await app.firstWindow();
  errores = [];
  ventana.on("pageerror", (e) => errores.push(e.message));
  ventana.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  await expect(ventana.getByRole("heading", { level: 2 })).toBeVisible();
});

test.afterEach(async () => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((v) => v.destroy()));
  await app.close();
  await rm(carpeta, { recursive: true, force: true });
  expect(errores, "errores de JavaScript (incluye violaciones de CSP)").toEqual([]);
});

test("Guardar sobrescribe el mismo archivo, cada vez, sin abrir otra ventana ni cambiar de página", async () => {
  await abrirPorDialogo();
  const urlAntes = ventana.url();

  await resaltarPrimeraLinea();
  await ventana.getByRole("button", { name: /Guardar/ }).click();
  await expect(ventana.getByRole("status").filter({ hasText: "Guardado en «apuntes.pdf»" })).toBeVisible();
  expect(await subtiposPorPagina(new Uint8Array(await readFile(ruta)))).toEqual([["Text", "Highlight"], []]);

  // Segunda vez: otra marca y Guardar de nuevo, sobre el mismo archivo.
  await ventana.keyboard.press("u");
  await resaltarPrimeraLinea();
  await ventana.getByRole("button", { name: /Guardar/ }).click();
  await expect(ventana.locator(".estado-guardado")).toHaveText("");
  await expect
    .poll(async () => subtiposPorPagina(new Uint8Array(await readFile(ruta))))
    .toEqual([["Text", "Highlight", "Underline"], []]);

  expect(app.windows()).toHaveLength(1);
  expect(ventana.url()).toBe(urlAntes);
  expect(await readdir(carpeta)).toEqual(["apuntes.pdf"]); // sin temporales ni copias
});

test("un PDF traído desde el disco (arrastrar / elegir archivo) también se guarda en su lugar, sin preguntar", async () => {
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = (async () => {
      throw new Error("No debía preguntar dónde guardar");
    }) as typeof dialog.showSaveDialog;
  });
  await ventana.locator("#entrada-archivo").setInputFiles(ruta);
  await expect(ventana.locator('.pagina[data-pagina="1"] .textLayer span').first()).toBeVisible();
  await resaltarPrimeraLinea();
  await ventana.getByRole("button", { name: /Guardar/ }).click();
  await expect(ventana.locator(".estado-guardado")).toHaveText("");
  expect(await subtiposPorPagina(new Uint8Array(await readFile(ruta)))).toEqual([["Text", "Highlight"], []]);
});

test("al reabrir el archivo guardado, las marcas siguen siendo editables", async () => {
  await abrirPorDialogo();
  await resaltarPrimeraLinea();
  await ventana.getByRole("button", { name: /Guardar/ }).click();
  await expect(ventana.locator(".estado-guardado")).toHaveText("");

  await abrirPorDialogo();
  await expect(marcas()).toHaveCount(1);
  await ventana.keyboard.press("b");
  await resaltarPrimeraLinea({ esperarMarca: false }); // con el borrador, el arrastre borra
  await expect(marcas()).toHaveCount(0);
});

test("REGRESIÓN: «ajustar al ancho» no deja barra de desplazamiento horizontal", async () => {
  await abrirPorDialogo();
  const medida = await ventana.evaluate(() => {
    const zona = document.getElementById("documento") as HTMLElement;
    return { contenido: zona.scrollWidth, visible: zona.clientWidth };
  });
  expect(medida.contenido).toBeLessThanOrEqual(medida.visible);
});

test("la página no tiene Node ni puede escribir un archivo que no se abrió", async () => {
  const resultado = await ventana.evaluate(async () => {
    const puente = (window as unknown as { editorEscritorio: { guardar(id: string, b: Uint8Array): Promise<void> } }).editorEscritorio;
    let rechazo = "";
    try {
      await puente.guardar("id-inventado", new Uint8Array([1]));
    } catch (e) {
      rechazo = String(e);
    }
    return { require: typeof (window as unknown as { require?: unknown }).require, process: typeof (window as unknown as { process?: unknown }).process, rechazo };
  });
  expect(resultado.require).toBe("undefined");
  expect(resultado.process).toBe("undefined");
  expect(resultado.rechazo).toContain("no fue abierto");
});

test("cerrar con cambios sin guardar pregunta; «Cancelar» deja la ventana abierta", async () => {
  await abrirPorDialogo();
  await resaltarPrimeraLinea();
  await expect(ventana.locator(".estado-guardado")).toHaveText("Sin guardar");

  await app.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = (() => 1) as unknown as typeof dialog.showMessageBoxSync; // Cancelar
    BrowserWindow.getAllWindows()[0]?.close();
  });
  await ventana.waitForTimeout(500);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);

  const cerrada = app.waitForEvent("close");
  await app.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = (() => 0) as unknown as typeof dialog.showMessageBoxSync; // Salir sin guardar
    BrowserWindow.getAllWindows()[0]?.close();
  });
  await cerrada;
  // La app ya se cerró: el afterEach no tiene ventana que limpiar.
  app = { evaluate: async () => undefined, close: async () => undefined } as unknown as ElectronApplication;
});
