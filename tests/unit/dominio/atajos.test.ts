import { describe, expect, it } from "vitest";
import { ATAJOS_POR_DEFECTO, MapaDeAtajos, normalizarTecla } from "../../../src/dominio/atajos";

describe("normalizarTecla", () => {
  it("pasa letras a minúscula para que Mayús no cambie el atajo", () => {
    expect(normalizarTecla("Z")).toBe("z");
    expect(normalizarTecla("z")).toBe("z");
  });

  it("acepta dígitos y signos de una sola tecla", () => {
    expect(normalizarTecla("1")).toBe("1");
    expect(normalizarTecla("ñ")).toBe("ñ");
    expect(normalizarTecla("-")).toBe("-");
  });

  it("acepta teclas de función", () => {
    expect(normalizarTecla("F2")).toBe("F2");
  });

  it("rechaza modificadores, espacio y teclas reservadas", () => {
    for (const tecla of ["Shift", "Control", "Alt", "Meta", " ", "Escape", "Tab", "Enter", "Dead", "Unidentified", ""]) {
      expect(normalizarTecla(tecla), tecla).toBeNull();
    }
  });
});

describe("MapaDeAtajos", () => {
  const mapa = MapaDeAtajos.porDefecto();

  it("por defecto: 1–6 colores, Z deshacer, Y rehacer", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) expect(mapa.accionPara(String(n))).toBe(`color:${n}`);
    expect(mapa.accionPara("z")).toBe("deshacer");
    expect(mapa.accionPara("Z")).toBe("deshacer");
    expect(mapa.accionPara("y")).toBe("rehacer");
  });

  it("los atajos por defecto no repiten teclas", () => {
    const teclas = Object.values(ATAJOS_POR_DEFECTO);
    expect(new Set(teclas).size).toBe(teclas.length);
  });

  it("una tecla sin asignar no dispara nada", () => {
    expect(mapa.accionPara("q")).toBeNull();
    expect(mapa.accionPara("Shift")).toBeNull();
  });

  it("reasignar a una tecla libre deja la anterior libre", () => {
    const { mapa: nuevo, intercambiadaCon } = mapa.reasignar("deshacer", "0");
    expect(intercambiadaCon).toBeNull();
    expect(nuevo.accionPara("0")).toBe("deshacer");
    expect(nuevo.accionPara("z")).toBeNull();
    expect(mapa.accionPara("z")).toBe("deshacer"); // inmutable
  });

  it("reasignar a una tecla ocupada intercambia las dos acciones", () => {
    const { mapa: nuevo, intercambiadaCon } = mapa.reasignar("deshacer", "1");
    expect(intercambiadaCon).toBe("color:1");
    expect(nuevo.accionPara("1")).toBe("deshacer");
    expect(nuevo.accionPara("z")).toBe("color:1");
  });

  it("rechaza una tecla no válida", () => {
    expect(() => mapa.reasignar("deshacer", "Shift")).toThrow(/tecla/i);
  });

  it("se guarda y se recupera igual", () => {
    const { mapa: nuevo } = mapa.reasignar("rehacer", "x");
    const recuperado = MapaDeAtajos.desdeJson(nuevo.aJson());
    expect(recuperado.teclaDe("rehacer")).toBe("x");
    expect(recuperado.teclaDe("deshacer")).toBe("z");
  });

  it("atajos guardados con la versión anterior (color:amarillo…) se conservan en su ranura", () => {
    const viejo = MapaDeAtajos.desdeJson('{"color:amarillo":"a","color:naranja":"n"}');
    expect(viejo.teclaDe("color:1")).toBe("a");
    expect(viejo.teclaDe("color:6")).toBe("n");
  });

  it("un JSON roto, viejo o con teclas repetidas vuelve a valores seguros", () => {
    expect(MapaDeAtajos.desdeJson("no es json").teclaDe("deshacer")).toBe("z");
    expect(MapaDeAtajos.desdeJson('{"deshacer":"Shift"}').teclaDe("deshacer")).toBe("z");
    expect(MapaDeAtajos.desdeJson('{"accionInventada":"q"}').accionPara("q")).toBeNull();

    const repetido = MapaDeAtajos.desdeJson('{"deshacer":"1","rehacer":"1"}');
    const teclas = Object.values(JSON.parse(repetido.aJson()) as Record<string, string>);
    expect(new Set(teclas).size).toBe(teclas.length);
  });
});
