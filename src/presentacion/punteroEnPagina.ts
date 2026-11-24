import type { Editor } from "../aplicacion/editor";
import { buscar } from "../dominio/coleccion";
import { rectDesdeEsquinas, type Punto } from "../dominio/geometria";
import { editarCuadro } from "./cuadroEnEdicion";
import { comoPuntosSvg, elementoSvg } from "./dibujoAnotaciones";
import type { VistaPagina } from "./vistaPagina";

/** Distancia mínima entre puntos de un trazo, en puntos del PDF: menos es ruido del puntero. */
const PASO_MINIMO = 0.75;
/** Un rectángulo de resaltado más chico que esto es un clic, no un arrastre. */
const AREA_MINIMA = 4;

const cliente = (e: PointerEvent): Punto => ({ x: e.clientX, y: e.clientY });

/** Lápiz: muestra el trazo mientras se dibuja y lo entrega al editor al soltar. */
function trazar(vista: VistaPagina, editor: Editor, inicio: PointerEvent): void {
  const puntos: Punto[] = [vista.aPdf(cliente(inicio))];
  const linea = elementoSvg("polyline", {
    fill: "none",
    stroke: editor.estado.tinta.hex,
    opacity: editor.estado.tinta.opacidad,
    "stroke-width": editor.estado.grosor,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    points: comoPuntosSvg(puntos),
  });
  vista.vistaPrevia.replaceChildren(linea);
  const mover = (e: PointerEvent) => {
    for (const evento of e.getCoalescedEvents?.() ?? [e]) {
      const p = vista.aPdf(cliente(evento));
      const ultimo = puntos.at(-1) as Punto;
      if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) >= PASO_MINIMO) puntos.push(p);
    }
    linea.setAttribute("points", comoPuntosSvg(puntos));
  };
  seguir(vista, { mover, soltar: () => editor.dibujar({ pagina: vista.indice, puntos }) });
}

/** Resaltar en páginas sin texto (escaneadas): rectángulo arrastrado. */
function marcarRectangulo(vista: VistaPagina, editor: Editor, inicio: PointerEvent): void {
  const desde = vista.aPdf(cliente(inicio));
  let rect = rectDesdeEsquinas(desde, desde);
  const { hex, opacidad } = editor.estado.tinta;
  const figura = elementoSvg("rect", { fill: hex, opacity: opacidad, class: "resaltado", x: desde.x, y: desde.y });
  vista.vistaPrevia.replaceChildren(figura);
  const mover = (e: PointerEvent) => {
    rect = rectDesdeEsquinas(desde, vista.aPdf(cliente(e)));
    for (const [k, v] of Object.entries({ x: rect.x, y: rect.y, width: rect.ancho, height: rect.alto })) figura.setAttribute(k, String(v));
  };
  const soltar = () => {
    if (rect.ancho * rect.alto >= AREA_MINIMA) editor.marcarTexto({ pagina: vista.indice, rects: [rect] });
  };
  seguir(vista, { mover, soltar });
}

/** Borrador: borra lo que toca mientras el botón está apretado. */
function borrar(vista: VistaPagina, editor: Editor, inicio: PointerEvent): void {
  const en = (e: PointerEvent) => editor.borrarEn({ pagina: vista.indice, punto: vista.aPdf(cliente(e)) });
  en(inicio);
  seguir(vista, { mover: en, soltar: () => undefined });
}

function seguir(vista: VistaPagina, manejo: { mover: (e: PointerEvent) => void; soltar: () => void }): void {
  const svg = vista.capaSvg;
  const terminar = (confirmar: boolean) => {
    svg.removeEventListener("pointermove", manejo.mover);
    vista.vistaPrevia.replaceChildren();
    if (confirmar) manejo.soltar();
  };
  svg.addEventListener("pointermove", manejo.mover);
  svg.addEventListener("pointerup", () => terminar(true), { once: true });
  svg.addEventListener("pointercancel", () => terminar(false), { once: true });
}

/** Qué hace el puntero sobre una página según la herramienta activa (el texto seleccionable lo maneja seleccionDeTexto). */
export function conectarPuntero(vista: VistaPagina, editor: Editor): void {
  vista.capaSvg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const { herramienta } = editor.estado;
    if (herramienta === "seleccionar") return;
    e.preventDefault();
    if (herramienta === "texto") return editarCuadro({ vista, editor, punto: vista.aPdf(cliente(e)) });
    vista.capaSvg.setPointerCapture(e.pointerId);
    if (herramienta === "dibujar") trazar(vista, editor, e);
    else if (herramienta === "borrar") borrar(vista, editor, e);
    else marcarRectangulo(vista, editor, e);
  });
  vista.capaCuadros.addEventListener("pointerdown", (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>(".cuadro-texto:not(.cuadro-edicion)")?.dataset.id;
    const existente = id === undefined ? undefined : buscar(editor.estado.anotaciones, id);
    if (existente?.tipo !== "texto" || editor.estado.herramienta !== "texto") return;
    e.preventDefault();
    editarCuadro({ vista, editor, existente });
  });
}
