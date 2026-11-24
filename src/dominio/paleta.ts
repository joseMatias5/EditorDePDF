import { esIntensidad, esMatiz, esTransparencia, tintaDe, type OpcionDeColor, type Tinta } from "./colores";

/** Las seis posiciones de color, una por tecla (1–6 por defecto). */
export const RANURAS = [1, 2, 3, 4, 5, 6] as const;
export type Ranura = (typeof RANURAS)[number];

export const esRanura = (v: unknown): v is Ranura => (RANURAS as readonly unknown[]).includes(v);

const DE_FABRICA: Readonly<Record<Ranura, OpcionDeColor>> = {
  1: { matiz: "amarillo", intensidad: "normal", transparencia: 0 },
  2: { matiz: "verde", intensidad: "normal", transparencia: 0 },
  3: { matiz: "azul", intensidad: "normal", transparencia: 0 },
  4: { matiz: "rosa", intensidad: "normal", transparencia: 0 },
  5: { matiz: "rojo", intensidad: "normal", transparencia: 0 },
  6: { matiz: "naranja", intensidad: "normal", transparencia: 0 },
};

function esOpcion(v: unknown): v is OpcionDeColor {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return esMatiz(o.matiz) && esIntensidad(o.intensidad) && esTransparencia(o.transparencia);
}

/** Qué color tiene cada ranura. Inmutable: cambiar devuelve una paleta nueva. */
export class Paleta {
  readonly #opciones: Readonly<Record<Ranura, OpcionDeColor>>;

  private constructor(opciones: Readonly<Record<Ranura, OpcionDeColor>>) {
    this.#opciones = opciones;
  }

  static porDefecto(): Paleta {
    return new Paleta(DE_FABRICA);
  }

  /** Tolera datos guardados rotos: cada ranura inválida vuelve a su color de fábrica. */
  static desdeJson(json: string): Paleta {
    let datos: unknown;
    try {
      datos = JSON.parse(json);
    } catch {
      return Paleta.porDefecto();
    }
    const guardadas = typeof datos === "object" && datos !== null ? (datos as Record<string, unknown>) : {};
    const opciones = { ...DE_FABRICA };
    for (const ranura of RANURAS) {
      const guardada = guardadas[ranura];
      if (esOpcion(guardada)) opciones[ranura] = { matiz: guardada.matiz, intensidad: guardada.intensidad, transparencia: guardada.transparencia };
    }
    return new Paleta(opciones);
  }

  opcion(ranura: Ranura): OpcionDeColor {
    return this.#opciones[ranura];
  }

  tinta(ranura: Ranura): Tinta {
    return tintaDe(this.#opciones[ranura]);
  }

  cambiar(ranura: Ranura, cambios: Partial<OpcionDeColor>): Paleta {
    return new Paleta({ ...this.#opciones, [ranura]: { ...this.#opciones[ranura], ...cambios } });
  }

  restablecer(ranura: Ranura): Paleta {
    return new Paleta({ ...this.#opciones, [ranura]: DE_FABRICA[ranura] });
  }

  aJson(): string {
    return JSON.stringify(this.#opciones);
  }
}
