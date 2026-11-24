// Acceso al disco del proceso principal de Electron. Sin dependencias de Electron: se prueba con Vitest.
import { randomUUID } from "node:crypto";
import { lstat, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

/**
 * Rutas que la persona eligió (diálogo o arrastrar). La página solo recibe un identificador:
 * aunque alguien inyectara código en ella, no podría escribir en una ruta que no se abrió.
 */
export class RegistroDeArchivos {
  /** @type {Map<string, string>} */
  #rutas = new Map();

  /** @param {string} ruta @returns {string} */
  registrar(ruta) {
    for (const [id, conocida] of this.#rutas) if (conocida === ruta) return id;
    const id = randomUUID();
    this.#rutas.set(id, ruta);
    return id;
  }

  /** @param {string} id @returns {string} */
  ruta(id) {
    const ruta = this.#rutas.get(id);
    if (ruta === undefined) throw new Error("Ese archivo no fue abierto desde esta ventana");
    return ruta;
  }
}

/** Solo archivos .pdf comunes (no carpetas ni enlaces simbólicos, que podrían apuntar a otro lado). */
export async function validarPdf(/** @type {string} */ ruta) {
  if (extname(ruta).toLowerCase() !== ".pdf") throw new Error(`«${basename(ruta)}» no es un PDF`);
  const info = await lstat(ruta);
  if (!info.isFile()) throw new Error(`«${basename(ruta)}» no es un archivo común`);
}

/** @param {string} ruta @returns {Promise<{ nombre: string, bytes: Uint8Array }>} */
export async function leerPdf(ruta) {
  return { nombre: basename(ruta), bytes: new Uint8Array(await readFile(ruta)) };
}

async function permisosDe(/** @type {string} */ ruta) {
  try {
    return (await stat(ruta)).mode & 0o777;
  } catch {
    return 0o644; // archivo nuevo (Guardar como)
  }
}

/**
 * Escribe en un temporal de la misma carpeta, lo baja a disco y lo renombra sobre el original:
 * si algo falla (disco lleno, corte de luz) el PDF anterior queda entero.
 * @param {string} ruta @param {Uint8Array} bytes
 */
export async function escribirAtomico(ruta, bytes) {
  const temporal = join(dirname(ruta), `.${basename(ruta)}.${randomUUID()}.tmp`);
  const permisos = await permisosDe(ruta);
  const archivo = await open(temporal, "wx", permisos);
  try {
    // chmod explícito: el modo de open() se recorta con la umask.
    await archivo.chmod(permisos);
    if (!(bytes instanceof Uint8Array)) throw new TypeError("Se esperaban los bytes del PDF");
    await archivo.writeFile(bytes);
    await archivo.sync();
    await archivo.close();
    await rename(temporal, ruta);
  } catch (e) {
    await archivo.close().catch(() => undefined);
    await unlink(temporal).catch(() => undefined);
    throw e;
  }
}
