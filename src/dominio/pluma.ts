import type { OpcionDeColor, Tinta } from "./colores";
import { HERRAMIENTA_POR_DEFECTO, type Herramienta } from "./herramienta";
import { Paleta, type Ranura } from "./paleta";

export const GROSOR_POR_DEFECTO = 2;
export const TAMANO_TEXTO_POR_DEFECTO = 14;

interface Ajustes {
  readonly herramienta: Herramienta;
  readonly ranura: Ranura;
  readonly grosor: number;
  readonly tamanoTexto: number;
}

/**
 * Con qué se anota: herramienta, color (ranura de la paleta), grosor y letra.
 * Preferencias, no historia: cambiarlas no es un paso que se deshace. Inmutable.
 */
export class Pluma {
  readonly #ajustes: Ajustes;
  readonly paleta: Paleta;

  private constructor(ajustes: Ajustes, paleta: Paleta) {
    this.#ajustes = ajustes;
    this.paleta = paleta;
  }

  static inicial(paleta: Paleta = Paleta.porDefecto()): Pluma {
    const ajustes = { herramienta: HERRAMIENTA_POR_DEFECTO, ranura: 1, grosor: GROSOR_POR_DEFECTO, tamanoTexto: TAMANO_TEXTO_POR_DEFECTO } as const;
    return new Pluma(ajustes, paleta);
  }

  get herramienta(): Herramienta {
    return this.#ajustes.herramienta;
  }

  get ranura(): Ranura {
    return this.#ajustes.ranura;
  }

  get grosor(): number {
    return this.#ajustes.grosor;
  }

  get tamanoTexto(): number {
    return this.#ajustes.tamanoTexto;
  }

  get tinta(): Tinta {
    return this.paleta.tinta(this.#ajustes.ranura);
  }

  /** Grosor y tamaño no positivos se ignoran. */
  con(cambios: Partial<Ajustes>): Pluma {
    const validos = { ...cambios };
    if (!(validos.grosor === undefined || validos.grosor > 0)) delete validos.grosor;
    if (!(validos.tamanoTexto === undefined || validos.tamanoTexto > 0)) delete validos.tamanoTexto;
    return new Pluma({ ...this.#ajustes, ...validos }, this.paleta);
  }

  conColor(ranura: Ranura, cambios: Partial<OpcionDeColor>): Pluma {
    return new Pluma(this.#ajustes, this.paleta.cambiar(ranura, cambios));
  }

  conPaleta(paleta: Paleta): Pluma {
    return new Pluma(this.#ajustes, paleta);
  }
}
