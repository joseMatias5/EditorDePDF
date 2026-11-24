import type { Herramienta } from "./herramienta";
import type { Ranura } from "./paleta";

/** `color:N` elige la ranura N de la paleta (el color concreto se personaliza aparte). */
export type Accion = `color:${Ranura}` | `herramienta:${Herramienta}` | "deshacer" | "rehacer";

/**
 * Teclas por defecto (decisión del usuario, 2026-11-24): 1–6 colores, Z deshacer, Y rehacer.
 * Ctrl+Z NO se usa: los atajos se toman sin modificadores.
 */
export const ATAJOS_POR_DEFECTO: Readonly<Record<Accion, string>> = {
  "color:1": "1",
  "color:2": "2",
  "color:3": "3",
  "color:4": "4",
  "color:5": "5",
  "color:6": "6",
  deshacer: "z",
  rehacer: "y",
  "herramienta:seleccionar": "v",
  "herramienta:resaltar": "h",
  "herramienta:subrayar": "u",
  "herramienta:dibujar": "d",
  "herramienta:texto": "t",
  "herramienta:borrar": "b",
};

export const ACCIONES = Object.keys(ATAJOS_POR_DEFECTO) as Accion[];

/** Nombres para mostrar en la pantalla de teclas. */
export const NOMBRE_DE_ACCION: Readonly<Record<Accion, string>> = {
  "color:1": "Color 1",
  "color:2": "Color 2",
  "color:3": "Color 3",
  "color:4": "Color 4",
  "color:5": "Color 5",
  "color:6": "Color 6",
  deshacer: "Deshacer",
  rehacer: "Rehacer",
  "herramienta:seleccionar": "Seleccionar (sin anotar)",
  "herramienta:resaltar": "Resaltar",
  "herramienta:subrayar": "Subrayar",
  "herramienta:dibujar": "Dibujar",
  "herramienta:texto": "Cuadro de texto",
  "herramienta:borrar": "Borrador",
};

/** Nombres de la primera versión (un color fijo por acción) → su ranura, para no perder atajos ya guardados. */
const ACCION_ANTERIOR: Readonly<Record<string, Accion>> = {
  "color:amarillo": "color:1",
  "color:verde": "color:2",
  "color:azul": "color:3",
  "color:rosa": "color:4",
  "color:rojo": "color:5",
  "color:naranja": "color:6",
};

/** Escape, Tab y Enter quedan reservados para cerrar, moverse con el teclado y escribir. */
const TECLAS_RESERVADAS = new Set(["Escape", "Tab", "Enter", "Dead", "Unidentified", "Process"]);
const TECLA_DE_FUNCION = /^F([1-9]|1[0-2])$/;

/** Devuelve la forma guardada de una tecla (`KeyboardEvent.key`) o null si no puede ser un atajo. */
export function normalizarTecla(key: string): string | null {
  if (TECLAS_RESERVADAS.has(key)) return null;
  if (TECLA_DE_FUNCION.test(key)) return key;
  // Un solo carácter visible (las letras con tilde o la ñ cuentan como uno).
  if ([...key].length !== 1 || key.trim() === "") return null;
  return key.toLocaleLowerCase("es");
}

export function esAccion(valor: string): valor is Accion {
  return Object.hasOwn(ATAJOS_POR_DEFECTO, valor);
}

export class MapaDeAtajos {
  readonly #teclaPorAccion: ReadonlyMap<Accion, string>;

  private constructor(teclaPorAccion: ReadonlyMap<Accion, string>) {
    this.#teclaPorAccion = teclaPorAccion;
  }

  static porDefecto(): MapaDeAtajos {
    return new MapaDeAtajos(new Map(Object.entries(ATAJOS_POR_DEFECTO) as [Accion, string][]));
  }

  /** Tolera datos guardados rotos o de otra versión: lo que no sirve vuelve al valor por defecto. */
  static desdeJson(json: string): MapaDeAtajos {
    let mapa = MapaDeAtajos.porDefecto();
    let guardado: unknown;
    try {
      guardado = JSON.parse(json);
    } catch {
      return mapa;
    }
    if (typeof guardado !== "object" || guardado === null) return mapa;
    for (const [nombre, tecla] of Object.entries(guardado)) {
      const accion = ACCION_ANTERIOR[nombre] ?? nombre;
      if (!esAccion(accion) || typeof tecla !== "string" || normalizarTecla(tecla) === null) continue;
      mapa = mapa.reasignar(accion, tecla).mapa;
    }
    return mapa;
  }

  accionPara(key: string): Accion | null {
    const tecla = normalizarTecla(key);
    if (tecla === null) return null;
    for (const [accion, asignada] of this.#teclaPorAccion) if (asignada === tecla) return accion;
    return null;
  }

  teclaDe(accion: Accion): string {
    return this.#teclaPorAccion.get(accion) ?? ATAJOS_POR_DEFECTO[accion];
  }

  /** Si la tecla ya era de otra acción, las dos se intercambian: nunca quedan dos acciones con la misma tecla. */
  reasignar(accion: Accion, key: string): { mapa: MapaDeAtajos; intercambiadaCon: Accion | null } {
    const tecla = normalizarTecla(key);
    if (tecla === null) throw new RangeError(`La tecla «${key}» no se puede usar como atajo`);
    const ocupante = this.accionPara(tecla);
    const nuevo = new Map(this.#teclaPorAccion);
    if (ocupante !== null && ocupante !== accion) nuevo.set(ocupante, this.teclaDe(accion));
    nuevo.set(accion, tecla);
    return { mapa: new MapaDeAtajos(nuevo), intercambiadaCon: ocupante === accion ? null : ocupante };
  }

  aJson(): string {
    return JSON.stringify(Object.fromEntries(this.#teclaPorAccion));
  }
}
