import type { Anotacion } from "../dominio/anotacion";
import type { Coleccion } from "../dominio/coleccion";
import type { Punto } from "../dominio/geometria";

/** Puertos: lo que la aplicación necesita del mundo exterior. Los adaptadores viven en infraestructura. */

export interface ArchivoElegido {
  readonly nombre: string;
  readonly bytes: Uint8Array;
  /** Referencia para volver a escribir el mismo archivo (File System Access), o null si no la hay. */
  readonly manija: unknown;
}

export interface ProcesadorPdf {
  separarAnotaciones(bytes: Uint8Array): Promise<{ limpio: Uint8Array; anotaciones: Anotacion[] }>;
  exportarConAnotaciones(limpio: Uint8Array, anotaciones: Coleccion): Promise<Uint8Array>;
}

/** Conversión entre píxeles de pantalla (relativos a la página) y coordenadas del PDF a una escala dada. */
export interface Proyeccion {
  readonly ancho: number;
  readonly alto: number;
  readonly escala: number;
  /** Matriz [a, b, c, d, e, f] que lleva coordenadas del PDF a píxeles. */
  readonly matriz: readonly number[];
  aPdf(enPantalla: Punto): Punto;
  aPantalla(enPdf: Punto): Punto;
}

export interface DestinoDeDibujo {
  readonly lienzo: HTMLCanvasElement;
  readonly capaDeTexto: HTMLElement;
  readonly escala: number;
}

export interface PaginaVisible {
  proyeccion(escala: number): Proyeccion;
  /** Dibuja la página y su capa de texto seleccionable. `tieneTexto` = false en páginas escaneadas. */
  dibujar(destino: DestinoDeDibujo): Promise<{ tieneTexto: boolean }>;
  cancelar(): void;
}

export interface DocumentoVisible {
  readonly numeroDePaginas: number;
  pagina(indice: number): Promise<PaginaVisible>;
  cerrar(): Promise<void>;
}

export interface AbridorDeVisor {
  abrir(bytes: Uint8Array): Promise<DocumentoVisible>;
}

export type ResultadoGuardado = "sobrescrito" | "descargado" | "cancelado";

export interface Guardador {
  guardar(datos: { nombre: string; bytes: Uint8Array; manija: unknown }): Promise<ResultadoGuardado>;
}

/** Preferencias que sobreviven entre sesiones: las teclas y los colores elegidos. */
export type Preferencia = "atajos" | "paleta";

export interface AlmacenDePreferencias {
  leer(clave: Preferencia): string | null;
  escribir(clave: Preferencia, json: string): void;
}
