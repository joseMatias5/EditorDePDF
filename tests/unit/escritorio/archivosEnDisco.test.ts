import { chmod, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RegistroDeArchivos, escribirAtomico, leerPdf, validarPdf } from "../../../escritorio/archivosEnDisco.mjs";

let carpeta: string;

beforeEach(async () => {
  // Carpeta temporal propia: ninguna prueba toca archivos del usuario (L-040).
  carpeta = await mkdtemp(join(tmpdir(), "editor-pdf-"));
});

afterEach(async () => {
  await rm(carpeta, { recursive: true, force: true });
});

describe("RegistroDeArchivos", () => {
  it("da un identificador por ruta y solo resuelve los que entregó", () => {
    const registro = new RegistroDeArchivos();
    const id = registro.registrar("/tmp/a.pdf");
    expect(registro.ruta(id)).toBe("/tmp/a.pdf");
    expect(registro.registrar("/tmp/a.pdf")).toBe(id);
    expect(() => registro.ruta("inventado")).toThrow(/no fue abierto/);
  });
});

describe("validarPdf", () => {
  it("acepta un archivo .pdf común (sin importar mayúsculas)", async () => {
    const ruta = join(carpeta, "Apuntes.PDF");
    await writeFile(ruta, "%PDF-1.7");
    await expect(validarPdf(ruta)).resolves.toBeUndefined();
  });

  it("rechaza otra extensión, carpetas, archivos inexistentes y enlaces simbólicos", async () => {
    const texto = join(carpeta, "nota.txt");
    await writeFile(texto, "hola");
    const enlace = join(carpeta, "enlace.pdf");
    await symlink(texto, enlace);
    const subcarpeta = join(carpeta, "carpeta.pdf");
    await rm(subcarpeta, { force: true });
    await (await import("node:fs/promises")).mkdir(subcarpeta);

    await expect(validarPdf(texto)).rejects.toThrow(/PDF/);
    await expect(validarPdf(enlace)).rejects.toThrow(/archivo común/);
    await expect(validarPdf(subcarpeta)).rejects.toThrow(/archivo común/);
    await expect(validarPdf(join(carpeta, "no-existe.pdf"))).rejects.toThrow();
  });
});

describe("leerPdf", () => {
  it("devuelve el nombre y los bytes", async () => {
    const ruta = join(carpeta, "doc.pdf");
    await writeFile(ruta, new Uint8Array([1, 2, 3]));
    const { nombre, bytes } = await leerPdf(ruta);
    expect(nombre).toBe("doc.pdf");
    expect([...bytes]).toEqual([1, 2, 3]);
  });
});

describe("escribirAtomico", () => {
  it("reemplaza el contenido del mismo archivo y no deja temporales", async () => {
    const ruta = join(carpeta, "doc.pdf");
    await writeFile(ruta, "viejo");
    await escribirAtomico(ruta, new TextEncoder().encode("nuevo"));
    expect(await readFile(ruta, "utf8")).toBe("nuevo");
    expect(await readdir(carpeta)).toEqual(["doc.pdf"]);
  });

  it("conserva los permisos del archivo original", async () => {
    const ruta = join(carpeta, "doc.pdf");
    await writeFile(ruta, "viejo");
    await chmod(ruta, 0o640);
    await escribirAtomico(ruta, new TextEncoder().encode("nuevo"));
    expect((await stat(ruta)).mode & 0o777).toBe(0o640);
  });

  it("REGRESIÓN: si la escritura falla, el original queda intacto y no queda basura", async () => {
    const ruta = join(carpeta, "doc.pdf");
    await writeFile(ruta, "original");
    // Un objeto que no son bytes hace fallar la escritura a mitad de camino.
    await expect(escribirAtomico(ruta, "no son bytes" as unknown as Uint8Array)).rejects.toThrow();
    expect(await readFile(ruta, "utf8")).toBe("original");
    expect(await readdir(carpeta)).toEqual(["doc.pdf"]);
  });

  it("puede crear un archivo nuevo (Guardar como)", async () => {
    const ruta = join(carpeta, "nuevo.pdf");
    await escribirAtomico(ruta, new Uint8Array([7]));
    expect([...(await readFile(ruta))]).toEqual([7]);
  });
});
