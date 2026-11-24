export const HERRAMIENTAS = ["seleccionar", "resaltar", "subrayar", "dibujar", "texto", "borrar"] as const;
export type Herramienta = (typeof HERRAMIENTAS)[number];

export const HERRAMIENTA_POR_DEFECTO: Herramienta = "resaltar";

export function esHerramienta(valor: string): valor is Herramienta {
  return (HERRAMIENTAS as readonly string[]).includes(valor);
}
