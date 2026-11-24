import { esTinta, type Tinta } from "./colores";
import {
  agrandar,
  contiene,
  distanciaAPoligonal,
  rectQueAbarca,
  tieneArea,
  unirRectangulosPorLinea,
  type Punto,
  type Rect,
} from "./geometria";

/** Datos comunes. `pagina` empieza en 0. Toda geometría está en coordenadas del PDF. */
interface AnotacionBase {
  readonly id: string;
  readonly pagina: number;
  readonly color: Tinta;
}

export interface Marca extends AnotacionBase {
  readonly tipo: "resaltado" | "subrayado";
  /** Un rectángulo por línea de texto marcada. */
  readonly rects: readonly Rect[];
}

export interface Trazo extends AnotacionBase {
  readonly tipo: "trazo";
  readonly grosor: number;
  readonly puntos: readonly Punto[];
}

export interface CuadroTexto extends AnotacionBase {
  readonly tipo: "texto";
  readonly caja: Rect;
  readonly texto: string;
  /** Tamaño de letra en puntos. */
  readonly tamano: number;
}

export type Anotacion = Marca | Trazo | CuadroTexto;

/** Medidas del cuadro de texto, compartidas por la pantalla y el PDF para que se vea igual en ambos. */
export const MARGEN_TEXTO = 3;
export const INTERLINEADO = 1.2;

export class AnotacionInvalida extends Error {
  override readonly name = "AnotacionInvalida";
}

function validarBase(datos: AnotacionBase): void {
  if (!datos.id) throw new AnotacionInvalida("Falta el identificador");
  if (!Number.isInteger(datos.pagina) || datos.pagina < 0) throw new AnotacionInvalida("Página inválida");
  if (!esTinta(datos.color)) throw new AnotacionInvalida("Color inválido");
}

export function crearMarca(datos: Marca): Marca {
  validarBase(datos);
  const rects = unirRectangulosPorLinea(datos.rects);
  if (rects.length === 0) throw new AnotacionInvalida("La marca no cubre ningún texto");
  return { ...datos, rects };
}

export function crearTrazo(datos: Omit<Trazo, "tipo">): Trazo {
  validarBase(datos);
  if (!(datos.grosor > 0)) throw new AnotacionInvalida("El grosor debe ser positivo");
  const [primero] = datos.puntos;
  if (primero === undefined) throw new AnotacionInvalida("El trazo no tiene puntos");
  // Un clic sin arrastrar es un punto: se duplica para que tenga un segmento dibujable.
  const puntos = datos.puntos.length === 1 ? [primero, primero] : [...datos.puntos];
  return { ...datos, tipo: "trazo", puntos };
}

export function crearCuadroTexto(datos: Omit<CuadroTexto, "tipo">): CuadroTexto {
  validarBase(datos);
  const texto = datos.texto.trimEnd();
  if (texto.trim() === "") throw new AnotacionInvalida("El cuadro de texto está vacío");
  if (!tieneArea(datos.caja)) throw new AnotacionInvalida("El cuadro de texto no tiene tamaño");
  if (!(datos.tamano > 0)) throw new AnotacionInvalida("El tamaño de letra debe ser positivo");
  return { ...datos, tipo: "texto", texto };
}

export function limitesDe(a: Anotacion): Rect {
  switch (a.tipo) {
    case "resaltado":
    case "subrayado":
      return rectQueAbarca(a.rects);
    case "trazo": {
      const caja = rectQueAbarca(a.puntos.map((p) => ({ x: p.x, y: p.y, ancho: 0, alto: 0 })));
      return agrandar(caja, a.grosor / 2);
    }
    case "texto":
      return a.caja;
  }
}

/** ¿El punto toca la anotación? `tolerancia` en puntos del PDF (para que el borrador no exija precisión). */
export function tocaPunto(a: Anotacion, p: Punto, tolerancia: number): boolean {
  switch (a.tipo) {
    case "resaltado":
    case "subrayado":
      return a.rects.some((r) => contiene(agrandar(r, tolerancia), p));
    case "trazo":
      return distanciaAPoligonal(p, a.puntos) <= a.grosor / 2 + tolerancia;
    case "texto":
      return contiene(agrandar(a.caja, tolerancia), p);
  }
}
