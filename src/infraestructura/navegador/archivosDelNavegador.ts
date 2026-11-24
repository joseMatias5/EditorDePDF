import type { ArchivoElegido, Guardador, ResultadoGuardado } from "../../aplicacion/puertos";

/**
 * File System Access (Chrome, Edge): permite volver a escribir el mismo archivo.
 * Firefox no la tiene: allí se abre con <input type="file"> y se guarda como descarga.
 */
interface ManijaDeArchivo {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(datos: Blob): Promise<void>; close(): Promise<void> }>;
}
type SelectorDelSistema = (opciones: object) => Promise<ManijaDeArchivo[]>;

const selectorDelSistema = (): SelectorDelSistema | undefined =>
  (globalThis as unknown as { showOpenFilePicker?: SelectorDelSistema }).showOpenFilePicker;

const esCancelacion = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export async function archivoDesdeFile(archivo: File, manija: unknown = null): Promise<ArchivoElegido> {
  return { nombre: archivo.name, bytes: new Uint8Array(await archivo.arrayBuffer()), manija };
}

/**
 * Pide un PDF con el selector del sistema si existe. Devuelve undefined si no hay selector
 * (quien llama usa entonces el <input type="file">) y null si la persona canceló.
 */
export async function elegirConSelectorDelSistema(): Promise<ArchivoElegido | null | undefined> {
  const selector = selectorDelSistema();
  if (selector === undefined) return undefined;
  try {
    const [manija] = await selector({ types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }] });
    return manija ? archivoDesdeFile(await manija.getFile(), manija) : null;
  } catch (e) {
    if (esCancelacion(e)) return null;
    throw e;
  }
}

/**
 * Tipo genérico a propósito: con "application/pdf", Firefox abre el PDF en su visor (parecía que la app
 * «se iba a otra página») en lugar de guardarlo.
 */
function descargar(nombre: string, bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }));
  const enlace = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // El navegador necesita la URL hasta que empieza la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const guardadorDelNavegador: Guardador = {
  async guardar({ nombre, bytes, manija }): Promise<ResultadoGuardado> {
    const escribible = manija as ManijaDeArchivo | null;
    if (escribible === null || typeof escribible.createWritable !== "function") {
      descargar(nombre, bytes);
      return "descargado";
    }
    try {
      const destino = await escribible.createWritable();
      await destino.write(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      await destino.close();
      return "sobrescrito";
    } catch (e) {
      if (esCancelacion(e) || (e instanceof DOMException && e.name === "NotAllowedError")) return "cancelado";
      throw e;
    }
  },
};
