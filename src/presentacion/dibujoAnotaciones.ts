import type { Proyeccion } from "../aplicacion/puertos";
import { INTERLINEADO, MARGEN_TEXTO, type Anotacion, type CuadroTexto } from "../dominio/anotacion";
import { cssDe } from "../dominio/colores";
import type { Punto } from "../dominio/geometria";

const SVG = "http://www.w3.org/2000/svg";

export function elementoSvg<K extends keyof SVGElementTagNameMap>(etiqueta: K, atributos: Record<string, string | number>) {
  const el = document.createElementNS(SVG, etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) el.setAttribute(nombre, String(valor));
  return el;
}

export const comoPuntosSvg = (puntos: readonly Punto[]) => puntos.map((p) => `${p.x},${p.y}`).join(" ");

/** SVG dentro de un grupo con la matriz de la página: se dibuja directamente en coordenadas del PDF. */
/** `opacity` sobre la figura entera (no por segmento): donde el trazo se cruza no se oscurece el doble, igual que en el PDF. */
function figuraDe(a: Exclude<Anotacion, CuadroTexto>): SVGElement {
  const color = a.color.hex;
  if (a.tipo === "trazo") {
    return elementoSvg("polyline", {
      points: comoPuntosSvg(a.puntos),
      fill: "none",
      stroke: color,
      opacity: a.color.opacidad,
      "stroke-width": a.grosor,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
  }
  const grupo = elementoSvg("g", { class: a.tipo, opacity: a.color.opacidad });
  for (const r of a.rects) {
    if (a.tipo === "resaltado") {
      grupo.append(elementoSvg("rect", { x: r.x, y: r.y, width: r.ancho, height: r.alto, fill: color }));
    } else {
      const grosor = Math.max(1, r.alto / 14);
      const y = r.y + grosor / 2;
      grupo.append(elementoSvg("line", { x1: r.x, y1: y, x2: r.x + r.ancho, y2: y, stroke: color, "stroke-width": grosor }));
    }
  }
  return grupo;
}

/** Posición y estilo en píxeles de un cuadro de texto (también lo usa el cuadro en edición). */
export function estiloDeCuadro(c: Pick<CuadroTexto, "caja" | "tamano" | "color">, proyeccion: Proyeccion) {
  const a = proyeccion.aPantalla({ x: c.caja.x, y: c.caja.y + c.caja.alto });
  const b = proyeccion.aPantalla({ x: c.caja.x + c.caja.ancho, y: c.caja.y });
  const e = proyeccion.escala;
  return {
    left: `${Math.min(a.x, b.x)}px`,
    top: `${Math.min(a.y, b.y)}px`,
    width: `${Math.abs(b.x - a.x)}px`,
    minHeight: `${Math.abs(b.y - a.y)}px`,
    fontSize: `${c.tamano * e}px`,
    lineHeight: String(INTERLINEADO),
    padding: `${MARGEN_TEXTO * e}px`,
    color: cssDe(c.color),
  };
}

function cuadroDe(c: CuadroTexto, proyeccion: Proyeccion): HTMLElement {
  const div = document.createElement("div");
  div.className = "cuadro-texto";
  div.dataset.id = c.id;
  div.textContent = c.texto;
  Object.assign(div.style, estiloDeCuadro(c, proyeccion));
  return div;
}

export function pintarAnotaciones(
  destino: { grupo: SVGGElement; cuadros: HTMLElement; proyeccion: Proyeccion },
  anotaciones: readonly Anotacion[],
): void {
  destino.grupo.replaceChildren(...anotaciones.filter((a) => a.tipo !== "texto").map(figuraDe));
  destino.cuadros.replaceChildren(
    ...anotaciones.filter((a): a is CuadroTexto => a.tipo === "texto").map((c) => cuadroDe(c, destino.proyeccion)),
  );
}
