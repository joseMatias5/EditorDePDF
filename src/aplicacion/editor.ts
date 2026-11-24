import { crearCuadroTexto, crearMarca, crearTrazo, type Anotacion } from "../dominio/anotacion";
import type { Accion } from "../dominio/atajos";
import { anotacionEn, agregar, buscar, eliminar, reemplazar, type Coleccion } from "../dominio/coleccion";
import type { OpcionDeColor, Tinta } from "../dominio/colores";
import { mismoRect, type Punto, type Rect } from "../dominio/geometria";
import type { Herramienta } from "../dominio/herramienta";
import { Historial } from "../dominio/historial";
import { Paleta, type Ranura } from "../dominio/paleta";
import { Pluma } from "../dominio/pluma";

export interface EstadoEditor {
  readonly anotaciones: Coleccion;
  readonly herramienta: Herramienta;
  /** Ranura de color activa (1–6) y la paleta con el color de cada una. */
  readonly ranura: Ranura;
  readonly paleta: Paleta;
  /** Color con el que se crea la próxima anotación. */
  readonly tinta: Tinta;
  readonly grosor: number;
  readonly tamanoTexto: number;
  readonly puedeDeshacer: boolean;
  readonly puedeRehacer: boolean;
  readonly hayCambiosSinGuardar: boolean;
}

/** Tolerancia del borrador en puntos del PDF (≈ 2 mm). */
const TOLERANCIA_BORRADOR = 6;

/**
 * Sesión de edición de un documento: anotaciones e historial. Las preferencias (herramienta, color,
 * grosor) viven en `Pluma`; aquí solo se cambian y se avisa. No sabe nada del PDF ni de la pantalla.
 */
export class Editor {
  readonly #historial = new Historial<Coleccion>([]);
  readonly #generarId: () => string;
  readonly #suscriptores = new Set<() => void>();
  #guardado: Coleccion = this.#historial.actual;
  #pluma: Pluma;

  constructor(dependencias: { generarId: () => string; paleta?: Paleta }) {
    this.#generarId = dependencias.generarId;
    this.#pluma = Pluma.inicial(dependencias.paleta);
  }

  get estado(): EstadoEditor {
    const p = this.#pluma;
    return {
      anotaciones: this.#historial.actual,
      herramienta: p.herramienta,
      ranura: p.ranura,
      paleta: p.paleta,
      tinta: p.tinta,
      grosor: p.grosor,
      tamanoTexto: p.tamanoTexto,
      puedeDeshacer: this.#historial.puedeDeshacer,
      puedeRehacer: this.#historial.puedeRehacer,
      hayCambiosSinGuardar: this.#historial.actual !== this.#guardado,
    };
  }

  suscribir(oyente: () => void): () => void {
    this.#suscriptores.add(oyente);
    return () => this.#suscriptores.delete(oyente);
  }

  /** Punto de entrada de los atajos de teclado (y de los botones). */
  ejecutar(accion: Accion): void {
    if (accion === "deshacer") this.deshacer();
    else if (accion === "rehacer") this.rehacer();
    else if (accion.startsWith("color:")) this.#cambiarPluma(this.#pluma.con({ ranura: Number(accion.slice(6)) as Ranura }));
    else this.elegirHerramienta(accion.slice("herramienta:".length) as Herramienta);
  }

  elegirHerramienta(herramienta: Herramienta): void {
    this.#cambiarPluma(this.#pluma.con({ herramienta }));
  }

  elegirGrosor(grosor: number): void {
    this.#cambiarPluma(this.#pluma.con({ grosor }));
  }

  elegirTamanoTexto(tamanoTexto: number): void {
    this.#cambiarPluma(this.#pluma.con({ tamanoTexto }));
  }

  /** Personaliza el color de una ranura. Lo ya dibujado conserva su color. */
  cambiarColor(datos: { ranura: Ranura; cambios: Partial<OpcionDeColor> }): void {
    this.#cambiarPluma(this.#pluma.conColor(datos.ranura, datos.cambios));
  }

  restablecerColores(): void {
    this.#cambiarPluma(this.#pluma.conPaleta(Paleta.porDefecto()));
  }

  deshacer(): void {
    if (this.#historial.deshacer()) this.#avisar();
  }

  rehacer(): void {
    if (this.#historial.rehacer()) this.#avisar();
  }

  /** Resalta o subraya según la herramienta activa. Devuelve false si la herramienta no marca texto. */
  marcarTexto(datos: { pagina: number; rects: readonly Rect[] }): boolean {
    const { herramienta } = this.#pluma;
    if (herramienta !== "resaltar" && herramienta !== "subrayar") return false;
    const tipo = herramienta === "resaltar" ? "resaltado" : "subrayado";
    this.#aplicar(agregar(this.#coleccion, crearMarca({ ...this.#base(datos.pagina), tipo, rects: datos.rects })));
    return true;
  }

  dibujar(datos: { pagina: number; puntos: readonly Punto[] }): void {
    const trazo = crearTrazo({ ...this.#base(datos.pagina), grosor: this.#pluma.grosor, puntos: datos.puntos });
    this.#aplicar(agregar(this.#coleccion, trazo));
  }

  escribirTexto(datos: { pagina: number; caja: Rect; texto: string }): void {
    const cuadro = crearCuadroTexto({ ...this.#base(datos.pagina), ...datos, tamano: this.#pluma.tamanoTexto });
    this.#aplicar(agregar(this.#coleccion, cuadro));
  }

  /** Dejar el texto vacío equivale a borrar el cuadro. */
  editarTexto(datos: { id: string; texto: string; caja?: Rect }): void {
    const actual = buscar(this.#coleccion, datos.id);
    if (actual?.tipo !== "texto") return;
    const texto = datos.texto.trimEnd();
    if (texto.trim() === "") return this.#aplicar(eliminar(this.#coleccion, datos.id));
    const caja = datos.caja ?? actual.caja;
    if (texto === actual.texto && mismoRect(caja, actual.caja)) return;
    this.#aplicar(reemplazar(this.#coleccion, crearCuadroTexto({ ...actual, texto, caja })));
  }

  /** Borra la anotación de más arriba que toca el punto. Devuelve si borró algo. */
  borrarEn(datos: { pagina: number; punto: Punto }): boolean {
    const tocada = anotacionEn(this.#coleccion, { ...datos, tolerancia: TOLERANCIA_BORRADOR });
    if (tocada === undefined) return false;
    this.#aplicar(eliminar(this.#coleccion, tocada.id));
    return true;
  }

  /** Documento recién abierto: sus anotaciones son el punto de partida (no se deshacen). */
  cargar(anotaciones: readonly Anotacion[]): void {
    this.#historial.reiniciar(anotaciones);
    this.#guardado = this.#historial.actual;
    this.#avisar();
  }

  /** `version`: la lista que se exportó (si se siguió anotando mientras se guardaba, sigue habiendo cambios). */
  marcarGuardado(version: Coleccion = this.#historial.actual): void {
    this.#guardado = version;
    this.#avisar();
  }

  get #coleccion(): Coleccion {
    return this.#historial.actual;
  }

  #base(pagina: number) {
    return { id: this.#generarId(), pagina, color: this.#pluma.tinta };
  }

  #cambiarPluma(pluma: Pluma): void {
    this.#pluma = pluma;
    this.#avisar();
  }

  #aplicar(nueva: Coleccion): void {
    this.#historial.aplicar(nueva);
    this.#avisar();
  }

  #avisar(): void {
    for (const oyente of this.#suscriptores) oyente();
  }
}
