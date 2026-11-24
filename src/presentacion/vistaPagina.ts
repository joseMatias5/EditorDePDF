import type { PaginaVisible, Proyeccion } from "../aplicacion/puertos";
import type { Anotacion } from "../dominio/anotacion";
import type { Punto } from "../dominio/geometria";
import { elementoSvg, pintarAnotaciones } from "./dibujoAnotaciones";

/**
 * Una página en pantalla, en capas: lienzo (pdf.js) < texto seleccionable < dibujo SVG < cuadros de texto.
 * Sabe dibujarse y convertir coordenadas; no decide qué hacer con el puntero.
 */
export class VistaPagina {
  readonly indice: number;
  readonly elemento = document.createElement("div");
  readonly capaSvg = elementoSvg("svg", { class: "capa-anotaciones" }) as SVGSVGElement;
  readonly capaCuadros = document.createElement("div");
  readonly vistaPrevia = elementoSvg("g", { class: "vista-previa" }) as SVGGElement;
  readonly #pagina: PaginaVisible;
  readonly #lienzo = document.createElement("canvas");
  readonly #capaTexto = document.createElement("div");
  readonly #grupo = elementoSvg("g", { class: "anotaciones" }) as SVGGElement;
  #proyeccion: Proyeccion;
  #dibujada = false;
  #anotaciones: readonly Anotacion[] = [];

  constructor(datos: { pagina: PaginaVisible; indice: number; escala: number }) {
    this.#pagina = datos.pagina;
    this.indice = datos.indice;
    this.elemento.className = "pagina";
    this.elemento.dataset.pagina = String(datos.indice + 1);
    this.elemento.setAttribute("role", "group");
    this.elemento.setAttribute("aria-label", `Página ${datos.indice + 1}`);
    this.#capaTexto.className = "textLayer";
    this.capaCuadros.className = "capa-cuadros";
    this.capaSvg.append(this.#grupo, this.vistaPrevia);
    this.elemento.append(this.#lienzo, this.#capaTexto, this.capaSvg, this.capaCuadros);
    this.#proyeccion = this.#pagina.proyeccion(datos.escala);
    this.maquetar(datos.escala);
  }

  get proyeccion(): Proyeccion {
    return this.#proyeccion;
  }

  /** Ajusta tamaños a la escala; el dibujo de pdf.js se rehace recién cuando la página se ve. */
  maquetar(escala: number): void {
    this.#pagina.cancelar();
    this.#proyeccion = this.#pagina.proyeccion(escala);
    this.#dibujada = false;
    const { ancho, alto, matriz } = this.#proyeccion;
    const estilo = this.elemento.style;
    estilo.width = `${ancho}px`;
    estilo.height = `${alto}px`;
    // Variables que espera la capa de texto de pdf.js.
    estilo.setProperty("--scale-factor", String(escala));
    estilo.setProperty("--user-unit", "1");
    estilo.setProperty("--total-scale-factor", String(escala));
    estilo.setProperty("--scale-round-x", "1px");
    estilo.setProperty("--scale-round-y", "1px");
    this.#lienzo.style.width = `${ancho}px`;
    this.#lienzo.style.height = `${alto}px`;
    this.capaSvg.setAttribute("width", String(ancho));
    this.capaSvg.setAttribute("height", String(alto));
    const transformacion = `matrix(${matriz.join(" ")})`;
    this.#grupo.setAttribute("transform", transformacion);
    this.vistaPrevia.setAttribute("transform", transformacion);
    this.pintar(this.#anotaciones);
  }

  async dibujar(): Promise<void> {
    if (this.#dibujada) return;
    this.#dibujada = true;
    this.elemento.classList.add("cargando");
    try {
      const { tieneTexto } = await this.#pagina.dibujar({
        lienzo: this.#lienzo,
        capaDeTexto: this.#capaTexto,
        escala: this.#proyeccion.escala,
      });
      this.elemento.classList.toggle("sin-texto", !tieneTexto);
    } catch (e) {
      this.#dibujada = false;
      throw e;
    } finally {
      this.elemento.classList.remove("cargando");
    }
  }

  pintar(anotaciones: readonly Anotacion[]): void {
    this.#anotaciones = anotaciones;
    pintarAnotaciones({ grupo: this.#grupo, cuadros: this.capaCuadros, proyeccion: this.#proyeccion }, anotaciones);
  }

  /** Punto de la ventana (clientX/Y) → coordenadas del PDF de esta página. */
  aPdf(cliente: Punto): Punto {
    const caja = this.elemento.getBoundingClientRect();
    return this.#proyeccion.aPdf({ x: cliente.x - caja.left, y: cliente.y - caja.top });
  }

  contiene(cliente: Punto): boolean {
    const caja = this.elemento.getBoundingClientRect();
    return cliente.x >= caja.left && cliente.x <= caja.right && cliente.y >= caja.top && cliente.y <= caja.bottom;
  }
}
