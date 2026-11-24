import type { Editor } from "../aplicacion/editor";
import { INTERLINEADO, MARGEN_TEXTO, type CuadroTexto } from "../dominio/anotacion";
import type { Punto, Rect } from "../dominio/geometria";
import { estiloDeCuadro } from "./dibujoAnotaciones";
import type { VistaPagina } from "./vistaPagina";

/** Ancho inicial de un cuadro nuevo, en puntos del PDF (≈ 7 cm). */
const ANCHO_INICIAL = 200;
const ANCHO_MINIMO = 40;

function cajaInicial(vista: VistaPagina, punto: Punto, tamano: number): Rect {
  const anchoDePagina = vista.proyeccion.ancho / vista.proyeccion.escala;
  const ancho = Math.max(ANCHO_MINIMO, Math.min(ANCHO_INICIAL, anchoDePagina - punto.x - MARGEN_TEXTO));
  const alto = tamano * INTERLINEADO + 2 * MARGEN_TEXTO;
  return { x: punto.x, y: punto.y - alto, ancho, alto };
}

/**
 * Abre un área de texto sobre la página. Al salir (clic afuera, Tab o Esc) se confirma:
 * nuevo → escribirTexto; existente → editarTexto (vacío = borrar). Así cada edición es un paso de deshacer.
 */
export function editarCuadro(datos: { vista: VistaPagina; editor: Editor; punto?: Punto; existente?: CuadroTexto }): void {
  const { vista, editor, existente } = datos;
  const tamano = existente?.tamano ?? editor.estado.tamanoTexto;
  const caja = existente?.caja ?? cajaInicial(vista, datos.punto ?? { x: 0, y: 0 }, tamano);
  const area = document.createElement("textarea");
  area.className = "cuadro-texto cuadro-edicion";
  area.setAttribute("aria-label", "Texto del cuadro");
  area.value = existente?.texto ?? "";
  Object.assign(area.style, estiloDeCuadro({ caja, tamano, color: existente?.color ?? editor.estado.tinta }, vista.proyeccion));
  area.style.height = area.style.minHeight;

  const original = existente ? vista.capaCuadros.querySelector<HTMLElement>(`[data-id="${CSS.escape(existente.id)}"]`) : null;
  if (original) original.hidden = true;
  vista.capaCuadros.append(area);

  const crecer = () => {
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  };
  area.addEventListener("input", crecer);
  area.addEventListener("keydown", (e) => {
    if (e.key === "Escape") area.blur();
  });
  area.addEventListener(
    "blur",
    () => {
      const arriba = caja.y + caja.alto;
      const alto = Math.max(caja.alto, area.offsetHeight / vista.proyeccion.escala);
      const nueva: Rect = { ...caja, y: arriba - alto, alto };
      area.remove();
      if (original) original.hidden = false;
      if (existente) editor.editarTexto({ id: existente.id, texto: area.value, caja: nueva });
      else if (area.value.trim() !== "") editor.escribirTexto({ pagina: vista.indice, caja: nueva, texto: area.value });
    },
    { once: true },
  );
  crecer();
  // Esperar al siguiente cuadro: el pointerdown que abrió el área todavía puede mover el foco.
  requestAnimationFrame(() => area.focus());
}
