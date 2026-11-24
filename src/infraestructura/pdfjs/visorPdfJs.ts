import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import urlDelTrabajador from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { AbridorDeVisor, DocumentoVisible } from "../../aplicacion/puertos";
import { PaginaPdfJs } from "./paginaPdfJs";

GlobalWorkerOptions.workerSrc = urlDelTrabajador;

/** Recursos copiados por scripts/copiar-recursos-pdfjs.mjs; rutas relativas para funcionar desde cualquier carpeta. */
const RECURSOS = new URL("pdfjs/", document.baseURI).href;

/** Adaptador del visor: pdf.js dibuja las páginas y arma la capa de texto seleccionable. */
export const visorPdfJs: AbridorDeVisor = {
  async abrir(bytes: Uint8Array): Promise<DocumentoVisible> {
    const carga = getDocument({
      data: bytes,
      cMapUrl: `${RECURSOS}cmaps/`,
      standardFontDataUrl: `${RECURSOS}standard_fonts/`,
      wasmUrl: `${RECURSOS}wasm/`,
      iccUrl: `${RECURSOS}iccs/`,
      enableXfa: false,
    });
    const pdf = await carga.promise;
    return {
      numeroDePaginas: pdf.numPages,
      pagina: async (indice) => new PaginaPdfJs(await pdf.getPage(indice + 1)),
      cerrar: () => carga.destroy(),
    };
  },
};
