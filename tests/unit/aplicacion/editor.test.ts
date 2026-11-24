import { describe, expect, it } from "vitest";
import { Editor } from "../../../src/aplicacion/editor";
import type { CuadroTexto } from "../../../src/dominio/anotacion";
import { Paleta } from "../../../src/dominio/paleta";

function nuevoEditor() {
  let n = 0;
  return new Editor({ generarId: () => `id${++n}` });
}

const linea = [{ x: 10, y: 100, ancho: 50, alto: 10 }];

describe("Editor", () => {
  it("arranca con resaltar y el color 1 (amarillo), como Edge", () => {
    const e = nuevoEditor();
    expect(e.estado.herramienta).toBe("resaltar");
    expect(e.estado.ranura).toBe(1);
    expect(e.estado.tinta).toEqual({ hex: "#FFE14D", opacidad: 1 });
  });

  it("las acciones de color eligen la ranura y lo que se crea después usa su tinta", () => {
    const e = nuevoEditor();
    e.ejecutar("color:2");
    e.marcarTexto({ pagina: 0, rects: linea });
    e.ejecutar("color:5");
    e.marcarTexto({ pagina: 0, rects: linea });
    expect(e.estado.anotaciones.map((a) => a.color.hex)).toEqual(["#5CD65C", "#F03A3A"]);
  });

  it("cambiar de color no es un paso que se deshace", () => {
    const e = nuevoEditor();
    e.ejecutar("color:3");
    e.cambiarColor({ ranura: 3, cambios: { transparencia: 40 } });
    expect(e.estado.puedeDeshacer).toBe(false);
  });

  it("personalizar una ranura cambia lo nuevo, no lo que ya estaba dibujado", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    e.cambiarColor({ ranura: 1, cambios: { matiz: "violeta", intensidad: "intenso", transparencia: 40 } });
    e.marcarTexto({ pagina: 0, rects: linea });
    expect(e.estado.anotaciones.map((a) => a.color)).toEqual([
      { hex: "#FFE14D", opacidad: 1 },
      { hex: "#6A2FD1", opacidad: 0.6 },
    ]);
  });

  it("arranca con la paleta guardada que se le pasa", () => {
    let n = 0;
    const paleta = Paleta.porDefecto().cambiar(1, { matiz: "negro" });
    const e = new Editor({ generarId: () => `id${++n}`, paleta });
    expect(e.estado.tinta.hex).toBe(paleta.tinta(1).hex);
  });

  it("resaltar o subrayar según la herramienta activa", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    e.ejecutar("herramienta:subrayar");
    e.marcarTexto({ pagina: 1, rects: linea });
    expect(e.estado.anotaciones.map((a) => a.tipo)).toEqual(["resaltado", "subrayado"]);
  });

  it("marcarTexto con otra herramienta no hace nada (devuelve false)", () => {
    const e = nuevoEditor();
    e.ejecutar("herramienta:dibujar");
    expect(e.marcarTexto({ pagina: 0, rects: linea })).toBe(false);
    expect(e.estado.anotaciones).toHaveLength(0);
  });

  it("deshacer con la acción asignada quita lo último y rehacer lo devuelve", () => {
    const e = nuevoEditor();
    e.ejecutar("herramienta:dibujar");
    e.dibujar({ pagina: 0, puntos: [{ x: 0, y: 0 }, { x: 5, y: 5 }] });
    e.dibujar({ pagina: 0, puntos: [{ x: 9, y: 9 }, { x: 5, y: 5 }] });
    e.ejecutar("deshacer");
    expect(e.estado.anotaciones.map((a) => a.id)).toEqual(["id1"]);
    e.ejecutar("rehacer");
    expect(e.estado.anotaciones.map((a) => a.id)).toEqual(["id1", "id2"]);
  });

  it("dibujar usa el grosor elegido", () => {
    const e = nuevoEditor();
    e.ejecutar("herramienta:dibujar");
    e.elegirGrosor(6);
    e.dibujar({ pagina: 0, puntos: [{ x: 0, y: 0 }] });
    expect(e.estado.anotaciones[0]).toMatchObject({ tipo: "trazo", grosor: 6 });
  });

  it("escribir, editar y vaciar un cuadro de texto son pasos que se deshacen", () => {
    const e = nuevoEditor();
    e.ejecutar("herramienta:texto");
    const caja = { x: 0, y: 0, ancho: 100, alto: 20 };
    e.escribirTexto({ pagina: 0, caja, texto: "hola" });
    e.editarTexto({ id: "id1", texto: "chau" });
    expect((e.estado.anotaciones[0] as CuadroTexto).texto).toBe("chau");

    e.editarTexto({ id: "id1", texto: "  " }); // vaciar = borrar
    expect(e.estado.anotaciones).toHaveLength(0);

    e.deshacer();
    expect((e.estado.anotaciones[0] as CuadroTexto).texto).toBe("chau");
    e.deshacer();
    expect((e.estado.anotaciones[0] as CuadroTexto).texto).toBe("hola");
  });

  it("editar un texto sin cambios no agrega un paso", () => {
    const e = nuevoEditor();
    e.ejecutar("herramienta:texto");
    e.escribirTexto({ pagina: 0, caja: { x: 0, y: 0, ancho: 100, alto: 20 }, texto: "hola" });
    e.editarTexto({ id: "id1", texto: "hola" });
    e.editarTexto({ id: "id1", texto: "hola", caja: { x: 0, y: 0.001, ancho: 100, alto: 20 } }); // misma caja, otro objeto
    e.deshacer();
    expect(e.estado.anotaciones).toHaveLength(0);
  });

  it("el borrador quita la anotación de arriba que toca, solo en esa página", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    e.marcarTexto({ pagina: 0, rects: linea });
    e.marcarTexto({ pagina: 1, rects: linea });
    e.ejecutar("herramienta:borrar");
    expect(e.borrarEn({ pagina: 0, punto: { x: 20, y: 105 } })).toBe(true);
    expect(e.estado.anotaciones.map((a) => a.id)).toEqual(["id1", "id3"]);
    expect(e.borrarEn({ pagina: 0, punto: { x: 500, y: 500 } })).toBe(false);
  });

  it("avisa a los suscriptores en cada cambio y permite desuscribirse", () => {
    const e = nuevoEditor();
    let avisos = 0;
    const cancelar = e.suscribir(() => avisos++);
    e.ejecutar("color:4");
    e.marcarTexto({ pagina: 0, rects: linea });
    cancelar();
    e.ejecutar("color:5");
    expect(avisos).toBe(2);
  });

  it("cargar un documento reemplaza las anotaciones, sin historia y sin cambios pendientes", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    expect(e.estado.hayCambiosSinGuardar).toBe(true);
    e.cargar([]);
    expect(e.estado.anotaciones).toHaveLength(0);
    expect(e.estado.puedeDeshacer).toBe(false);
    expect(e.estado.hayCambiosSinGuardar).toBe(false);
  });

  it("si se siguió anotando mientras se guardaba, siguen habiendo cambios pendientes", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    const exportada = e.estado.anotaciones;
    e.marcarTexto({ pagina: 0, rects: linea });
    e.marcarGuardado(exportada);
    expect(e.estado.hayCambiosSinGuardar).toBe(true);
    e.deshacer();
    expect(e.estado.hayCambiosSinGuardar).toBe(false);
  });

  it("marcar como guardado y luego deshacer vuelve a haber cambios pendientes", () => {
    const e = nuevoEditor();
    e.marcarTexto({ pagina: 0, rects: linea });
    e.marcarGuardado();
    expect(e.estado.hayCambiosSinGuardar).toBe(false);
    e.deshacer();
    expect(e.estado.hayCambiosSinGuardar).toBe(true);
  });
});
