import { describe, expect, it } from "vitest";
import { distanciaAPoligonal, rectDesdeEsquinas, unirRectangulosPorLinea } from "../../../src/dominio/geometria";

describe("rectDesdeEsquinas", () => {
  it("normaliza esquinas en cualquier orden", () => {
    expect(rectDesdeEsquinas({ x: 10, y: 50 }, { x: 2, y: 20 })).toEqual({ x: 2, y: 20, ancho: 8, alto: 30 });
  });
});

describe("unirRectangulosPorLinea", () => {
  it("une palabras contiguas de la misma línea en un solo rectángulo", () => {
    const unidos = unirRectangulosPorLinea([
      { x: 10, y: 100, ancho: 20, alto: 10 },
      { x: 31, y: 100.5, ancho: 15, alto: 9.5 },
    ]);
    expect(unidos).toHaveLength(1);
    expect(unidos[0]).toEqual({ x: 10, y: 100, ancho: 36, alto: 10 });
  });

  it("no une líneas distintas", () => {
    const unidos = unirRectangulosPorLinea([
      { x: 10, y: 100, ancho: 50, alto: 10 },
      { x: 10, y: 86, ancho: 50, alto: 10 },
    ]);
    expect(unidos).toHaveLength(2);
  });

  it("no une dos columnas separadas de la misma altura", () => {
    const unidos = unirRectangulosPorLinea([
      { x: 10, y: 100, ancho: 50, alto: 10 },
      { x: 300, y: 100, ancho: 50, alto: 10 },
    ]);
    expect(unidos).toHaveLength(2);
  });

  it("descarta rectángulos vacíos y absorbe los repetidos", () => {
    const unidos = unirRectangulosPorLinea([
      { x: 10, y: 100, ancho: 0, alto: 10 },
      { x: 10, y: 100, ancho: 30, alto: 10 },
      { x: 12, y: 101, ancho: 10, alto: 8 },
    ]);
    expect(unidos).toEqual([{ x: 10, y: 100, ancho: 30, alto: 10 }]);
  });

  it("devuelve las líneas de arriba hacia abajo (y del PDF crece hacia arriba)", () => {
    const unidos = unirRectangulosPorLinea([
      { x: 10, y: 50, ancho: 10, alto: 10 },
      { x: 10, y: 200, ancho: 10, alto: 10 },
    ]);
    expect(unidos.map((r) => r.y)).toEqual([200, 50]);
  });
});

describe("distanciaAPoligonal", () => {
  it("mide la distancia al segmento más cercano", () => {
    const linea = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    expect(distanciaAPoligonal({ x: 5, y: 3 }, linea)).toBeCloseTo(3);
    expect(distanciaAPoligonal({ x: 13, y: 4 }, linea)).toBeCloseTo(5);
  });

  it("funciona con un solo punto", () => {
    expect(distanciaAPoligonal({ x: 3, y: 4 }, [{ x: 0, y: 0 }])).toBeCloseTo(5);
  });
});
