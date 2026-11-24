import {
  LineCapStyle,
  LineJoinStyle,
  PDFDocument,
  PDFFont,
  PDFOperator,
  type PDFRef,
  beginText,
  endText,
  fill,
  lineTo,
  moveTo,
  nextLine,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setFillingRgbColor,
  setFontAndSize,
  setGraphicsState,
  setLineCap,
  setLineHeight,
  setLineJoin,
  setLineWidth,
  setStrokingRgbColor,
  setTextMatrix,
  showText,
  stroke,
} from "pdf-lib";
import {
  INTERLINEADO,
  MARGEN_TEXTO,
  limitesDe,
  type Anotacion,
  type CuadroTexto,
  type Marca,
  type Trazo,
} from "../../dominio/anotacion";
import { componentesRgb } from "../../dominio/colores";
import type { Rect } from "../../dominio/geometria";
import { ajustarLineas } from "../../dominio/textoAjustado";

export const NOMBRE_FUENTE = "Helv";

export interface Recursos {
  readonly doc: PDFDocument;
  readonly fuente: PDFFont;
}

const rgb = (a: Anotacion) => componentesRgb(a.color.hex);
/** Estado gráfico de la apariencia: opacidad de la tinta (y multiplicar, en el resaltado). */
const ESTADO = "GS0";

function operadoresMarca(m: Marca): PDFOperator[] {
  const [r, g, b] = rgb(m);
  if (m.tipo === "resaltado") {
    return [setFillingRgbColor(r, g, b), ...m.rects.map((q) => rectangle(q.x, q.y, q.ancho, q.alto)), fill()];
  }
  return m.rects.flatMap((q) => {
    const grosor = Math.max(1, q.alto / 14);
    const y = q.y + grosor / 2;
    return [setStrokingRgbColor(r, g, b), setLineWidth(grosor), moveTo(q.x, y), lineTo(q.x + q.ancho, y), stroke()];
  });
}

function operadoresTrazo(t: Trazo): PDFOperator[] {
  const [r, g, b] = rgb(t);
  const [primero, ...resto] = t.puntos;
  if (primero === undefined) return [];
  return [
    setStrokingRgbColor(r, g, b),
    setLineWidth(t.grosor),
    setLineCap(LineCapStyle.Round),
    setLineJoin(LineJoinStyle.Round),
    moveTo(primero.x, primero.y),
    ...resto.map((p) => lineTo(p.x, p.y)),
    stroke(),
  ];
}

/** Helvetica estándar solo codifica WinAnsi (sí tildes y ñ; no emojis): lo demás se dibuja como «?». */
function codificable(fuente: PDFFont, texto: string): string {
  return [...texto]
    .map((c) => {
      try {
        fuente.encodeText(c);
        return c;
      } catch {
        return "?";
      }
    })
    .join("");
}

export function lineasDeTexto(c: CuadroTexto, medir: (t: string) => number): string[] {
  return ajustarLineas(c.texto, { anchoMaximo: c.caja.ancho - 2 * MARGEN_TEXTO, medir });
}

function operadoresTexto(c: CuadroTexto, fuente: PDFFont): PDFOperator[] {
  const [r, g, b] = rgb(c);
  const visible = { ...c, texto: codificable(fuente, c.texto) };
  const lineas = lineasDeTexto(visible, (t) => fuente.widthOfTextAtSize(t, c.tamano));
  const primeraLinea = c.caja.y + c.caja.alto - MARGEN_TEXTO - fuente.heightAtSize(c.tamano, { descender: false });
  return [
    beginText(),
    setFontAndSize(NOMBRE_FUENTE, c.tamano),
    setFillingRgbColor(r, g, b),
    setLineHeight(c.tamano * INTERLINEADO),
    setTextMatrix(1, 0, 0, 1, c.caja.x + MARGEN_TEXTO, primeraLinea),
    ...lineas.flatMap((linea, i) => [...(i > 0 ? [nextLine()] : []), showText(fuente.encodeText(linea))]),
    endText(),
  ];
}

function operadoresDe(a: Anotacion, recursos: Recursos): PDFOperator[] {
  switch (a.tipo) {
    case "resaltado":
    case "subrayado":
      return operadoresMarca(a);
    case "trazo":
      return operadoresTrazo(a);
    case "texto":
      return operadoresTexto(a, recursos.fuente);
  }
}

export const comoArreglo = (r: Rect) => [r.x, r.y, r.x + r.ancho, r.y + r.alto];

/**
 * Apariencia normal (/AP /N): el dibujo exacto que muestran los visores. Sin ella, cada visor
 * inventa la suya (o no muestra nada, como pasa con FreeText en varios).
 * BBox = Rect de la anotación y matriz identidad: se dibuja directamente en coordenadas de la página.
 */
export function crearApariencia(a: Anotacion, recursos: Recursos): PDFRef {
  const { context } = recursos.doc;
  const operadores = [pushGraphicsState(), setGraphicsState(ESTADO), ...operadoresDe(a, recursos), popGraphicsState()];
  // Opacidad en la apariencia y además /CA en la anotación: la misma convención con la que guarda pdf.js.
  // Resaltado = multiplicar, como un resaltador real: el texto negro sigue negro y el blanco toma el color.
  const estado = {
    Type: "ExtGState",
    CA: a.color.opacidad,
    ca: a.color.opacidad,
    ...(a.tipo === "resaltado" ? { BM: "Multiply" } : {}),
  };
  const flujo = context.formXObject(operadores, {
    BBox: comoArreglo(limitesDe(a)),
    Resources: { ExtGState: { [ESTADO]: estado }, Font: { [NOMBRE_FUENTE]: recursos.fuente.ref } },
  });
  return context.register(flujo);
}
