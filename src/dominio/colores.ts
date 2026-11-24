/**
 * Colores que se pueden elegir: una grilla de opciones con nombre (no un selector de degradé).
 * Cada color tiene tres intensidades; la intensidad «normal» de los seis primeros son los colores de Edge.
 */
export const MATICES = [
  { id: "amarillo", nombre: "Amarillo", tonos: { claro: "#FFF3A3", normal: "#FFE14D", intenso: "#F2C200" } },
  { id: "verde", nombre: "Verde", tonos: { claro: "#B5EFB5", normal: "#5CD65C", intenso: "#1E9E3A" } },
  { id: "azul", nombre: "Azul", tonos: { claro: "#B3E0FF", normal: "#4DB8FF", intenso: "#0A6FD6" } },
  { id: "rosa", nombre: "Rosa", tonos: { claro: "#FFC2E6", normal: "#FF7AC8", intenso: "#D6338F" } },
  { id: "rojo", nombre: "Rojo", tonos: { claro: "#FFB3B3", normal: "#F03A3A", intenso: "#B01E1E" } },
  { id: "naranja", nombre: "Naranja", tonos: { claro: "#FFD0A0", normal: "#FF9A1F", intenso: "#D96A00" } },
  { id: "violeta", nombre: "Violeta", tonos: { claro: "#D9C2FF", normal: "#A66BFF", intenso: "#6A2FD1" } },
  { id: "celeste", nombre: "Celeste", tonos: { claro: "#B3F0EC", normal: "#3CCFC4", intenso: "#0E8F86" } },
  { id: "marron", nombre: "Marrón", tonos: { claro: "#E3C9AE", normal: "#A9744A", intenso: "#6B4226" } },
  { id: "gris", nombre: "Gris", tonos: { claro: "#D5D8DD", normal: "#8A9099", intenso: "#4A4F57" } },
  { id: "negro", nombre: "Negro", tonos: { claro: "#3A3D42", normal: "#1F2125", intenso: "#000000" } },
] as const;

export type MatizId = (typeof MATICES)[number]["id"];

export const INTENSIDADES = ["claro", "normal", "intenso"] as const;
export type Intensidad = (typeof INTENSIDADES)[number];
export const NOMBRE_DE_INTENSIDAD: Readonly<Record<Intensidad, string>> = { claro: "Claro", normal: "Normal", intenso: "Intenso" };

/** Porcentaje de transparencia: 0 = opaco. Pasos fijos, como opciones. */
export const TRANSPARENCIAS = [0, 20, 40, 60, 80] as const;
export type Transparencia = (typeof TRANSPARENCIAS)[number];

/** Lo que se elige en pantalla. */
export interface OpcionDeColor {
  readonly matiz: MatizId;
  readonly intensidad: Intensidad;
  readonly transparencia: Transparencia;
}

/** Lo que guarda cada anotación: el color concreto con el que se dibujó (cambiar la paleta no la altera). */
export interface Tinta {
  readonly hex: string;
  /** Entre 0 (excluido) y 1. */
  readonly opacidad: number;
}

const HEX = /^#[0-9A-F]{6}$/i;

export const esMatiz = (v: unknown): v is MatizId => MATICES.some((m) => m.id === v);
export const esIntensidad = (v: unknown): v is Intensidad => (INTENSIDADES as readonly unknown[]).includes(v);
export const esTransparencia = (v: unknown): v is Transparencia => (TRANSPARENCIAS as readonly unknown[]).includes(v);

export function esTinta(v: unknown): v is Tinta {
  if (typeof v !== "object" || v === null) return false;
  const { hex, opacidad } = v as Record<string, unknown>;
  return typeof hex === "string" && HEX.test(hex) && typeof opacidad === "number" && opacidad > 0 && opacidad <= 1;
}

function matiz(id: MatizId) {
  return MATICES.find((m) => m.id === id) ?? MATICES[0];
}

export function hexDeOpcion(opcion: Pick<OpcionDeColor, "matiz" | "intensidad">): string {
  return matiz(opcion.matiz).tonos[opcion.intensidad];
}

export function tintaDe(opcion: OpcionDeColor): Tinta {
  return { hex: hexDeOpcion(opcion), opacidad: (100 - opcion.transparencia) / 100 };
}

export function nombreDeOpcion(opcion: OpcionDeColor): string {
  const color = matiz(opcion.matiz).nombre + (opcion.intensidad === "normal" ? "" : ` ${opcion.intensidad}`);
  return opcion.transparencia === 0 ? color : `${color}, ${opcion.transparencia} % transparente`;
}

/** "#RRGGBB" → componentes entre 0 y 1 (lo que usa el PDF). */
export function componentesRgb(hex: string): readonly [number, number, number] {
  const valor = Number.parseInt(hex.slice(1), 16);
  return [((valor >> 16) & 0xff) / 255, ((valor >> 8) & 0xff) / 255, (valor & 0xff) / 255];
}

/** Color CSS con su opacidad («#RRGGBBAA»). */
export function cssDe(tinta: Tinta): string {
  return tinta.hex + Math.round(tinta.opacidad * 255).toString(16).padStart(2, "0").toUpperCase();
}
