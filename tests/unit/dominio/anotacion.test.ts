import { describe, expect, it } from "vitest";
import { crearCuadroTexto, crearMarca, crearTrazo, limitesDe, tocaPunto } from "../../../src/dominio/anotacion";

const base = { id: "a1", pagina: 0, color: { hex: "#FFE14D", opacidad: 1 } } as const;

describe("color de la anotación", () => {
  it("rechaza un color que no es una tinta válida", () => {
    expect(() =>
      crearTrazo({ ...base, color: { hex: "amarillo", opacidad: 1 }, grosor: 2, puntos: [{ x: 1, y: 1 }] }),
    ).toThrow();
  });
});

describe("crearMarca (resaltado / subrayado)", () => {
  it("guarda los rectángulos unidos por línea", () => {
    const marca = crearMarca({
      ...base,
      tipo: "resaltado",
      rects: [
        { x: 10, y: 100, ancho: 20, alto: 10 },
        { x: 30, y: 100, ancho: 20, alto: 10 },
      ],
    });
    expect(marca.rects).toEqual([{ x: 10, y: 100, ancho: 40, alto: 10 }]);
  });

  it("rechaza una marca sin área", () => {
    expect(() => crearMarca({ ...base, tipo: "subrayado", rects: [{ x: 0, y: 0, ancho: 0, alto: 5 }] })).toThrow();
  });
});

describe("crearTrazo", () => {
  it("un clic sin arrastrar deja un punto visible (dos puntos iguales)", () => {
    const trazo = crearTrazo({ ...base, grosor: 2, puntos: [{ x: 5, y: 5 }] });
    expect(trazo.puntos).toHaveLength(2);
  });

  it("rechaza grosor no positivo o trazo vacío", () => {
    expect(() => crearTrazo({ ...base, grosor: 0, puntos: [{ x: 1, y: 1 }] })).toThrow();
    expect(() => crearTrazo({ ...base, grosor: 2, puntos: [] })).toThrow();
  });
});

describe("crearCuadroTexto", () => {
  it("rechaza texto vacío o solo espacios", () => {
    expect(() =>
      crearCuadroTexto({ ...base, caja: { x: 0, y: 0, ancho: 100, alto: 20 }, texto: "   ", tamano: 14 }),
    ).toThrow();
  });

  it("conserva saltos de línea y quita espacios del final", () => {
    const cuadro = crearCuadroTexto({ ...base, caja: { x: 0, y: 0, ancho: 100, alto: 20 }, texto: "hola\nmundo  ", tamano: 14 });
    expect(cuadro.texto).toBe("hola\nmundo");
  });
});

describe("tocaPunto / limitesDe", () => {
  const trazo = crearTrazo({ ...base, grosor: 2, puntos: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
  const marca = crearMarca({ ...base, tipo: "resaltado", rects: [{ x: 10, y: 10, ancho: 50, alto: 10 }] });

  it("un trazo se toca cerca de su línea, contando el grosor", () => {
    expect(tocaPunto(trazo, { x: 50, y: 3 }, 2)).toBe(true);
    expect(tocaPunto(trazo, { x: 50, y: 10 }, 2)).toBe(false);
  });

  it("una marca se toca dentro de alguno de sus rectángulos", () => {
    expect(tocaPunto(marca, { x: 20, y: 15 }, 0)).toBe(true);
    expect(tocaPunto(marca, { x: 5, y: 15 }, 0)).toBe(false);
    expect(tocaPunto(marca, { x: 5, y: 15 }, 6)).toBe(true);
  });

  it("limitesDe abarca toda la anotación", () => {
    expect(limitesDe(trazo)).toEqual({ x: -1, y: -1, ancho: 102, alto: 2 });
  });
});
