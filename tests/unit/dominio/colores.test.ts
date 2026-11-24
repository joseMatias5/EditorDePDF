import { describe, expect, it } from "vitest";
import {
  INTENSIDADES,
  MATICES,
  TRANSPARENCIAS,
  componentesRgb,
  esTinta,
  nombreDeOpcion,
  tintaDe,
} from "../../../src/dominio/colores";

describe("opciones de color", () => {
  it("los seis colores de Edge están, en intensidad normal, con sus valores de siempre", () => {
    const normal = (id: string) => MATICES.find((m) => m.id === id)?.tonos.normal;
    expect(["amarillo", "verde", "azul", "rosa", "rojo", "naranja"].map(normal)).toEqual([
      "#FFE14D",
      "#5CD65C",
      "#4DB8FF",
      "#FF7AC8",
      "#F03A3A",
      "#FF9A1F",
    ]);
  });

  it("cada color tiene tres intensidades distintas, de más clara a más intensa", () => {
    const luminancia = (hex: string) => componentesRgb(hex).reduce((s, c) => s + c, 0);
    for (const m of MATICES) {
      const [claro, normal, intenso] = INTENSIDADES.map((i) => luminancia(m.tonos[i]));
      expect(claro, m.id).toBeGreaterThan(normal as number);
      expect(normal, m.id).toBeGreaterThan(intenso as number);
    }
  });

  it("no hay dos opciones con el mismo color", () => {
    const todos = MATICES.flatMap((m) => INTENSIDADES.map((i) => m.tonos[i]));
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("transparencias en pasos fijos, empezando por opaco", () => {
    expect(TRANSPARENCIAS).toEqual([0, 20, 40, 60, 80]);
  });

  it("una opción se convierte en la tinta que se guarda en la anotación", () => {
    expect(tintaDe({ matiz: "verde", intensidad: "intenso", transparencia: 40 })).toEqual({ hex: "#1E9E3A", opacidad: 0.6 });
    expect(tintaDe({ matiz: "amarillo", intensidad: "normal", transparencia: 0 })).toEqual({ hex: "#FFE14D", opacidad: 1 });
  });

  it("nombre legible de una opción", () => {
    expect(nombreDeOpcion({ matiz: "azul", intensidad: "claro", transparencia: 0 })).toBe("Azul claro");
    expect(nombreDeOpcion({ matiz: "rojo", intensidad: "normal", transparencia: 60 })).toBe("Rojo, 60 % transparente");
  });

  it("convierte hex a componentes entre 0 y 1", () => {
    expect(componentesRgb("#FF8000")).toEqual([1, 128 / 255, 0]);
  });

  it("esTinta valida lo que llega de un archivo", () => {
    expect(esTinta({ hex: "#A1B2C3", opacidad: 0.5 })).toBe(true);
    for (const malo of [null, "amarillo", { hex: "rojo", opacidad: 1 }, { hex: "#FFF", opacidad: 1 }, { hex: "#FFFFFF", opacidad: 0 }, { hex: "#FFFFFF", opacidad: 1.5 }]) {
      expect(esTinta(malo), JSON.stringify(malo)).toBe(false);
    }
  });
});
