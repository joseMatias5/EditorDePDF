import type { DocumentoVisible } from "../aplicacion/puertos";
import type { Coleccion } from "../dominio/coleccion";
import type { Punto } from "../dominio/geometria";
import { VistaPagina } from "./vistaPagina";

export const ESCALA_MINIMA = 0.25;
export const ESCALA_MAXIMA = 5;
const PASO_DE_ZOOM = 1.2;
/** Margen alrededor de la página al ajustar al ancho, en píxeles. */
const MARGEN_AJUSTE = 32;
/** Se dibujan las páginas que están a menos de esta distancia de la zona visible. */
const ANTICIPACION = "800px 0px";

/** Lista de páginas con dibujo diferido (solo las que se ven) y zoom. */
export class VistaDocumento {
  readonly #contenedor: HTMLElement;
  readonly #alFallar: (error: unknown) => void;
  readonly #visibles = new Set<VistaPagina>();
  readonly #observador: IntersectionObserver;
  #vistas: VistaPagina[] = [];
  #escala = 1;

  constructor(contenedor: HTMLElement, alFallar: (error: unknown) => void) {
    this.#contenedor = contenedor;
    this.#alFallar = alFallar;
    this.#observador = new IntersectionObserver((entradas) => this.#alCambiarVisibilidad(entradas), {
      root: contenedor.closest("main"),
      rootMargin: ANTICIPACION,
    });
  }

  get vistas(): readonly VistaPagina[] {
    return this.#vistas;
  }

  get escala(): number {
    return this.#escala;
  }

  async mostrar(documento: DocumentoVisible): Promise<void> {
    this.#vaciar();
    const paginas = await Promise.all(Array.from({ length: documento.numeroDePaginas }, (_, i) => documento.pagina(i)));
    const primera = paginas[0];
    this.#escala = primera ? this.#escalaParaAncho(primera.proyeccion(1).ancho) : 1;
    this.#vistas = paginas.map((pagina, indice) => new VistaPagina({ pagina, indice, escala: this.#escala }));
    this.#contenedor.replaceChildren(...this.#vistas.map((v) => v.elemento));
    for (const vista of this.#vistas) this.#observador.observe(vista.elemento);
  }

  pintar(anotaciones: Coleccion): void {
    for (const vista of this.#vistas) vista.pintar(anotaciones.filter((a) => a.pagina === vista.indice));
  }

  acercar(): void {
    this.#cambiarEscala(this.#escala * PASO_DE_ZOOM);
  }

  alejar(): void {
    this.#cambiarEscala(this.#escala / PASO_DE_ZOOM);
  }

  ajustarAlAncho(): void {
    const primera = this.#vistas[0];
    if (primera) this.#cambiarEscala(this.#escalaParaAncho(primera.proyeccion.ancho / this.#escala));
  }

  vistaEn(cliente: Punto): VistaPagina | undefined {
    return this.#vistas.find((v) => v.contiene(cliente));
  }

  #escalaParaAncho(anchoAEscala1: number): number {
    const disponible = (this.#contenedor.closest("main")?.clientWidth ?? 800) - MARGEN_AJUSTE;
    return Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, disponible / anchoAEscala1));
  }

  #cambiarEscala(nueva: number): void {
    const desplazable = this.#contenedor.closest("main");
    const proporcion = desplazable ? desplazable.scrollTop / Math.max(1, desplazable.scrollHeight) : 0;
    this.#escala = Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, nueva));
    for (const vista of this.#vistas) vista.maquetar(this.#escala);
    if (desplazable) desplazable.scrollTop = proporcion * desplazable.scrollHeight;
    for (const vista of this.#visibles) vista.dibujar().catch(this.#alFallar);
  }

  #alCambiarVisibilidad(entradas: IntersectionObserverEntry[]): void {
    for (const entrada of entradas) {
      const vista = this.#vistas.find((v) => v.elemento === entrada.target);
      if (vista === undefined) continue;
      if (!entrada.isIntersecting) {
        this.#visibles.delete(vista);
        continue;
      }
      this.#visibles.add(vista);
      vista.dibujar().catch(this.#alFallar);
    }
  }

  #vaciar(): void {
    this.#observador.disconnect();
    this.#visibles.clear();
    this.#vistas = [];
    this.#contenedor.replaceChildren();
  }
}
