import { describe, expect, it } from "vitest";
import { ajustarLineas } from "../../../src/dominio/textoAjustado";

// Medida simple: cada carácter mide 1 unidad.
const medir = (t: string) => t.length;

describe("ajustarLineas", () => {
  it("parte por palabras sin pasar el ancho", () => {
    expect(ajustarLineas("uno dos tres cuatro", { anchoMaximo: 8, medir })).toEqual(["uno dos", "tres", "cuatro"]);
  });

  it("respeta los saltos de línea escritos", () => {
    expect(ajustarLineas("a\n\nb", { anchoMaximo: 10, medir })).toEqual(["a", "", "b"]);
  });

  it("corta una palabra más larga que el ancho", () => {
    expect(ajustarLineas("abcdefghij", { anchoMaximo: 4, medir })).toEqual(["abcd", "efgh", "ij"]);
  });
});
