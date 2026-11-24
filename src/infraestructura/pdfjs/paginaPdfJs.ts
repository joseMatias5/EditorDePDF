import { RenderingCancelledException, TextLayer, type PDFPageProxy, type PageViewport } from "pdfjs-dist";
import type { DestinoDeDibujo, PaginaVisible, Proyeccion } from "../../aplicacion/puertos";

function proyeccionDe(viewport: PageViewport): Proyeccion {
  return {
    ancho: viewport.width,
    alto: viewport.height,
    escala: viewport.scale,
    matriz: viewport.transform,
    aPdf: ({ x, y }) => {
      const [px, py] = viewport.convertToPdfPoint(x, y) as [number, number];
      return { x: px, y: py };
    },
    aPantalla: ({ x, y }) => {
      const [vx, vy] = viewport.convertToViewportPoint(x, y) as [number, number];
      return { x: vx, y: vy };
    },
  };
}

/** Una página de pdf.js. Cancela el dibujo anterior si se pide otro (por ejemplo, al cambiar el zoom). */
export class PaginaPdfJs implements PaginaVisible {
  readonly #pagina: PDFPageProxy;
  #cancelar: (() => void) | null = null;

  constructor(pagina: PDFPageProxy) {
    this.#pagina = pagina;
  }

  proyeccion(escala: number): Proyeccion {
    return proyeccionDe(this.#pagina.getViewport({ scale: escala }));
  }

  async dibujar(destino: DestinoDeDibujo): Promise<{ tieneTexto: boolean }> {
    this.cancelar();
    const viewport = this.#pagina.getViewport({ scale: destino.escala });
    const densidad = globalThis.devicePixelRatio || 1;
    const { lienzo, capaDeTexto } = destino;
    lienzo.width = Math.floor(viewport.width * densidad);
    lienzo.height = Math.floor(viewport.height * densidad);

    const dibujo = this.#pagina.render({
      canvas: lienzo,
      viewport,
      transform: densidad === 1 ? undefined : [densidad, 0, 0, densidad, 0, 0],
    });
    const contenido = await this.#pagina.getTextContent();
    capaDeTexto.replaceChildren();
    const capa = new TextLayer({ textContentSource: contenido, container: capaDeTexto, viewport });
    this.#cancelar = () => {
      dibujo.cancel();
      capa.cancel();
    };
    try {
      await Promise.all([dibujo.promise, capa.render()]);
    } catch (e) {
      if (e instanceof RenderingCancelledException) return { tieneTexto: contenido.items.length > 0 };
      throw e;
    } finally {
      this.#cancelar = null;
    }
    const tieneTexto = contenido.items.some((item) => "str" in item && item.str.trim() !== "");
    return { tieneTexto };
  }

  cancelar(): void {
    this.#cancelar?.();
    this.#cancelar = null;
  }
}
