import { describe, expect, it } from "vitest";
import { Historial } from "../../../src/dominio/historial";

describe("Historial (deshacer / rehacer)", () => {
  it("empieza sin nada que deshacer ni rehacer", () => {
    const h = new Historial<number[]>([]);
    expect(h.actual).toEqual([]);
    expect(h.puedeDeshacer).toBe(false);
    expect(h.puedeRehacer).toBe(false);
  });

  it("deshace y rehace en orden", () => {
    const h = new Historial<number[]>([]);
    h.aplicar([1]);
    h.aplicar([1, 2]);

    expect(h.deshacer()).toBe(true);
    expect(h.actual).toEqual([1]);
    expect(h.deshacer()).toBe(true);
    expect(h.actual).toEqual([]);
    expect(h.deshacer()).toBe(false);

    expect(h.rehacer()).toBe(true);
    expect(h.actual).toEqual([1]);
  });

  it("un cambio nuevo después de deshacer borra lo que se podía rehacer", () => {
    const h = new Historial<number[]>([]);
    h.aplicar([1]);
    h.deshacer();
    h.aplicar([9]);
    expect(h.puedeRehacer).toBe(false);
    expect(h.rehacer()).toBe(false);
    expect(h.actual).toEqual([9]);
  });

  it("respeta el límite de pasos guardados y descarta los más viejos", () => {
    const h = new Historial<number>(0, { limite: 3 });
    for (let i = 1; i <= 5; i++) h.aplicar(i);
    let pasos = 0;
    while (h.deshacer()) pasos++;
    expect(pasos).toBe(3);
    expect(h.actual).toBe(2);
  });

  it("reiniciar deja un estado nuevo sin historia", () => {
    const h = new Historial<number>(0);
    h.aplicar(1);
    h.reiniciar(7);
    expect(h.actual).toBe(7);
    expect(h.puedeDeshacer).toBe(false);
  });

  it("rechaza un límite menor que 1", () => {
    expect(() => new Historial(0, { limite: 0 })).toThrow(RangeError);
  });
});
