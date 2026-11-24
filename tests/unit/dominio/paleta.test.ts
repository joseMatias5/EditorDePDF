import { describe, expect, it } from "vitest";
import { Paleta, RANURAS } from "../../../src/dominio/paleta";

describe("Paleta (los colores de las teclas 1–6)", () => {
  const paleta = Paleta.porDefecto();

  it("por defecto son los seis colores de Edge, opacos", () => {
    expect(RANURAS.map((r) => paleta.opcion(r).matiz)).toEqual(["amarillo", "verde", "azul", "rosa", "rojo", "naranja"]);
    expect(RANURAS.every((r) => paleta.tinta(r).opacidad === 1)).toBe(true);
  });

  it("cambiar una ranura cambia solo esa y no modifica la paleta original", () => {
    const nueva = paleta.cambiar(2, { matiz: "violeta", intensidad: "intenso" });
    expect(nueva.opcion(2)).toEqual({ matiz: "violeta", intensidad: "intenso", transparencia: 0 });
    expect(nueva.opcion(1)).toEqual(paleta.opcion(1));
    expect(paleta.opcion(2).matiz).toBe("verde");
  });

  it("la transparencia se cambia aparte del color", () => {
    const nueva = paleta.cambiar(1, { transparencia: 60 });
    expect(nueva.tinta(1)).toEqual({ hex: "#FFE14D", opacidad: 0.4 });
  });

  it("restablecer una ranura vuelve a su color de fábrica", () => {
    expect(paleta.cambiar(3, { matiz: "negro" }).restablecer(3).opcion(3)).toEqual(paleta.opcion(3));
  });

  it("se guarda y se recupera igual", () => {
    const nueva = paleta.cambiar(4, { matiz: "celeste", intensidad: "claro", transparencia: 20 });
    expect(Paleta.desdeJson(nueva.aJson()).opcion(4)).toEqual(nueva.opcion(4));
  });

  it("datos guardados rotos o con valores que no existen vuelven al valor de fábrica, ranura por ranura", () => {
    expect(Paleta.desdeJson("no es json").opcion(1)).toEqual(paleta.opcion(1));
    const mezclado = JSON.stringify({
      1: { matiz: "fucsia", intensidad: "normal", transparencia: 0 },
      2: { matiz: "negro", intensidad: "intenso", transparencia: 33 },
      3: { matiz: "negro", intensidad: "intenso", transparencia: 40 },
    });
    const recuperada = Paleta.desdeJson(mezclado);
    expect(recuperada.opcion(1)).toEqual(paleta.opcion(1));
    expect(recuperada.opcion(2)).toEqual(paleta.opcion(2));
    expect(recuperada.opcion(3)).toEqual({ matiz: "negro", intensidad: "intenso", transparencia: 40 });
  });
});
