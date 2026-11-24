import type { Editor } from "../aplicacion/editor";
import { rectDesdeEsquinas, type Rect } from "../dominio/geometria";
import type { VistaPagina } from "./vistaPagina";

/** Nodos de texto de la capa de texto de pdf.js que toca el rango. */
function nodosDeTexto(rango: Range): Text[] {
  const raiz = rango.commonAncestorContainer;
  if (raiz.nodeType === Node.TEXT_NODE) return [raiz as Text];
  const nodos: Text[] = [];
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n !== null; n = recorrido.nextNode()) {
    if (rango.intersectsNode(n) && n.parentElement?.closest(".textLayer")) nodos.push(n as Text);
  }
  return nodos;
}

/**
 * Rectángulos de la selección, por página y en coordenadas del PDF.
 * Se mide nodo por nodo: `Range.getClientRects()` del rango entero también devuelve las cajas
 * de los elementos completos (incluida la capa de texto entera), que pintarían media página.
 */
export function rectsPorPagina(rango: Range, vistas: readonly VistaPagina[]): Map<VistaPagina, Rect[]> {
  const resultado = new Map<VistaPagina, Rect[]>();
  for (const nodo of nodosDeTexto(rango)) {
    const parcial = document.createRange();
    parcial.selectNodeContents(nodo);
    if (nodo === rango.startContainer) parcial.setStart(nodo, rango.startOffset);
    if (nodo === rango.endContainer) parcial.setEnd(nodo, rango.endOffset);
    for (const r of parcial.getClientRects()) {
      if (r.width < 0.5 || r.height < 0.5) continue;
      const vista = vistas.find((v) => v.contiene({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
      if (vista === undefined) continue;
      const rect = rectDesdeEsquinas(vista.aPdf({ x: r.left, y: r.top }), vista.aPdf({ x: r.right, y: r.bottom }));
      resultado.set(vista, [...(resultado.get(vista) ?? []), rect]);
    }
  }
  return resultado;
}

/** Con Resaltar o Subrayar activos, soltar el botón sobre un texto seleccionado lo marca (como en Edge). */
export function conectarSeleccion(deps: { editor: Editor; vistas: () => readonly VistaPagina[] }): void {
  const capas = () => document.querySelectorAll(".textLayer");
  document.addEventListener("pointerdown", (e) => {
    // Truco de pdf.js: mientras se arrastra, el fin de la capa cubre los huecos y la selección no salta.
    (e.target as Element | null)?.closest(".textLayer")?.classList.add("selecting");
  });
  document.addEventListener("pointerup", () => {
    for (const capa of capas()) capa.classList.remove("selecting");
    const { herramienta } = deps.editor.estado;
    if (herramienta !== "resaltar" && herramienta !== "subrayar") return;
    const seleccion = document.getSelection();
    if (seleccion === null || seleccion.isCollapsed || seleccion.rangeCount === 0) return;
    const porPagina = rectsPorPagina(seleccion.getRangeAt(0), deps.vistas());
    if (porPagina.size === 0) return;
    for (const [vista, rects] of porPagina) deps.editor.marcarTexto({ pagina: vista.indice, rects });
    seleccion.removeAllRanges();
  });
}
