import type { ArchivoElegido } from "../aplicacion/puertos";

interface Dependencias {
  /** undefined = no hay selector del sistema (se usa el <input>); null = la persona canceló. */
  readonly elegirArchivo: () => Promise<ArchivoElegido | null | undefined>;
  readonly desdeFile: (archivo: File) => Promise<ArchivoElegido>;
  readonly alElegir: (archivo: ArchivoElegido) => Promise<void>;
  readonly alFallar: (mensaje: string) => void;
}

/**
 * Las tres formas de traer un PDF: selector del sistema (permite volver a guardar en el mismo archivo),
 * <input type="file"> (Firefox) y arrastrar y soltar sobre el documento. Devuelve la función que abre el selector.
 */
export function conectarEntradaDeArchivos(d: Dependencias): () => Promise<void> {
  const entrada = document.getElementById("entrada-archivo") as HTMLInputElement;
  const zona = document.getElementById("documento") as HTMLElement;
  const leer = async (archivo: File | undefined) => {
    if (archivo === undefined) return;
    try {
      await d.alElegir(await d.desdeFile(archivo));
    } catch (e) {
      d.alFallar(`No se pudo leer el archivo. (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  entrada.addEventListener("change", () => {
    const archivo = entrada.files?.[0];
    entrada.value = "";
    void leer(archivo);
  });
  zona.addEventListener("dragover", (e) => {
    e.preventDefault();
    zona.classList.add("arrastrando");
  });
  zona.addEventListener("dragleave", () => zona.classList.remove("arrastrando"));
  zona.addEventListener("drop", (e) => {
    e.preventDefault();
    zona.classList.remove("arrastrando");
    void leer(e.dataTransfer?.files[0]);
  });

  return async () => {
    try {
      const elegido = await d.elegirArchivo();
      if (elegido === undefined) entrada.click();
      else if (elegido !== null) await d.alElegir(elegido);
    } catch (e) {
      d.alFallar(`No se pudo leer el archivo. (${e instanceof Error ? e.message : String(e)})`);
    }
  };
}
