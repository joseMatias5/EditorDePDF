import { tocaPunto, type Anotacion } from "./anotacion";
import type { Punto } from "./geometria";

/** Operaciones puras sobre la lista de anotaciones del documento (siempre devuelven una lista nueva). */
export type Coleccion = readonly Anotacion[];

export function agregar(coleccion: Coleccion, anotacion: Anotacion): Coleccion {
  return [...coleccion, anotacion];
}

export function eliminar(coleccion: Coleccion, id: string): Coleccion {
  return coleccion.filter((a) => a.id !== id);
}

export function reemplazar(coleccion: Coleccion, anotacion: Anotacion): Coleccion {
  return coleccion.map((a) => (a.id === anotacion.id ? anotacion : a));
}

export function buscar(coleccion: Coleccion, id: string): Anotacion | undefined {
  return coleccion.find((a) => a.id === id);
}

/** La de más arriba (la última creada) que toca el punto en esa página. */
export function anotacionEn(
  coleccion: Coleccion,
  donde: { pagina: number; punto: Punto; tolerancia: number },
): Anotacion | undefined {
  return coleccion.findLast((a) => a.pagina === donde.pagina && tocaPunto(a, donde.punto, donde.tolerancia));
}
