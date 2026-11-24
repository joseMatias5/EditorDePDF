import { crearCuadroTexto, crearMarca, crearTrazo, type Anotacion } from "../../dominio/anotacion";
import { esTinta, type Tinta } from "../../dominio/colores";
import { Paleta, RANURAS } from "../../dominio/paleta";
import type { Punto, Rect } from "../../dominio/geometria";

/** Se guarda solo lo que el dominio define, en un orden estable. */
export function serializar(a: Anotacion): string {
  return JSON.stringify(a);
}

type Datos = Record<string, unknown>;

const esObjeto = (v: unknown): v is Datos => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esPunto = (v: unknown): v is Punto => esObjeto(v) && esNumero(v.x) && esNumero(v.y);
const esRect = (v: unknown): v is Rect =>
  esObjeto(v) && esNumero(v.x) && esNumero(v.y) && esNumero(v.ancho) && esNumero(v.alto);
const esListaDe = <T>(v: unknown, es: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(es);

function desdeDatos(d: Datos, base: { id: string; pagina: number; color: Anotacion["color"] }): Anotacion | null {
  switch (d.tipo) {
    case "resaltado":
    case "subrayado":
      return esListaDe(d.rects, esRect) ? crearMarca({ ...base, tipo: d.tipo, rects: d.rects }) : null;
    case "trazo":
      return esNumero(d.grosor) && esListaDe(d.puntos, esPunto)
        ? crearTrazo({ ...base, grosor: d.grosor, puntos: d.puntos })
        : null;
    case "texto":
      return esRect(d.caja) && typeof d.texto === "string" && esNumero(d.tamano)
        ? crearCuadroTexto({ ...base, caja: d.caja, texto: d.texto, tamano: d.tamano })
        : null;
    default:
      return null;
  }
}

/** La primera versión guardaba el nombre del color de Edge («verde»); se traduce a su tinta opaca. */
function tintaGuardada(color: unknown): Tinta | null {
  if (esTinta(color)) return { hex: color.hex, opacidad: color.opacidad };
  const fabrica = Paleta.porDefecto();
  const ranura = RANURAS.find((r) => fabrica.opcion(r).matiz === color);
  return ranura === undefined ? null : fabrica.tinta(ranura);
}

/**
 * Los datos vienen de un archivo: no son de confianza. Todo lo que no valide (forma, color,
 * página distinta de donde está la anotación, reglas del dominio) devuelve null.
 */
export function reconstruir(json: string, paginaDondeEsta: number): Anotacion | null {
  try {
    const d: unknown = JSON.parse(json);
    if (!esObjeto(d) || typeof d.id !== "string" || d.pagina !== paginaDondeEsta) return null;
    const color = tintaGuardada(d.color);
    if (color === null) return null;
    return desdeDatos(d, { id: d.id, pagina: paginaDondeEsta, color });
  } catch {
    // JSON roto o anotación que el dominio rechaza: se deja como anotación ajena.
    return null;
  }
}
