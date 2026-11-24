import { describe, expect, it } from "vitest";
import { Paleta } from "../../../src/dominio/paleta";
import { Pluma } from "../../../src/dominio/pluma";

describe("Pluma (con qué se anota)", () => {
  const pluma = Pluma.inicial();

  it("arranca con resaltar, color 1, grosor 2 y letra de 14 pt", () => {
    expect([pluma.herramienta, pluma.ranura, pluma.grosor, pluma.tamanoTexto]).toEqual(["resaltar", 1, 2, 14]);
    expect(pluma.tinta).toEqual({ hex: "#FFE14D", opacidad: 1 });
  });

  it("la tinta es la de la ranura elegida en la paleta actual", () => {
    const otra = pluma.con({ ranura: 3 }).conColor(3, { intensidad: "intenso", transparencia: 20 });
    expect(otra.tinta).toEqual({ hex: "#0A6FD6", opacidad: 0.8 });
    expect(pluma.tinta.hex).toBe("#FFE14D"); // inmutable
  });

  it("ignora grosores o tamaños no positivos", () => {
    expect(pluma.con({ grosor: 0, tamanoTexto: -3 }).grosor).toBe(2);
    expect(pluma.con({ grosor: 0, tamanoTexto: -3 }).tamanoTexto).toBe(14);
  });

  it("se puede reemplazar la paleta entera (restablecer colores)", () => {
    const cambiada = pluma.conColor(1, { matiz: "negro" });
    expect(cambiada.conPaleta(Paleta.porDefecto()).tinta.hex).toBe("#FFE14D");
  });
});
