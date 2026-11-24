import { describe, expect, it } from "vitest";
import { Editor } from "../../../src/aplicacion/editor";
import type { ArchivoElegido, DocumentoVisible, Guardador, ProcesadorPdf } from "../../../src/aplicacion/puertos";
import { ErrorDeDocumento } from "../../../src/aplicacion/errorDeDocumento";
import { SesionDeDocumento } from "../../../src/aplicacion/sesionDeDocumento";
import type { Anotacion } from "../../../src/dominio/anotacion";

const marca: Anotacion = { id: "m1", pagina: 0, color: { hex: "#4DB8FF", opacidad: 1 }, tipo: "resaltado", rects: [{ x: 1, y: 1, ancho: 5, alto: 5 }] };

/** Dobles simples (fakes) de los puertos: registran lo que reciben. */
function armar(opciones: { falla?: "abrir" | "guardar" | "cancela" } = {}) {
  const registro = { cerrados: 0, guardados: [] as { nombre: string; manija: unknown }[], exportadoCon: [] as Anotacion[][] };
  const procesador: ProcesadorPdf = {
    separarAnotaciones: async (bytes) => ({ limpio: new Uint8Array([...bytes, 0]), anotaciones: [marca] }),
    exportarConAnotaciones: async (limpio, anotaciones) => {
      registro.exportadoCon.push([...anotaciones]);
      return new Uint8Array([...limpio, anotaciones.length]);
    },
  };
  const documento: DocumentoVisible = {
    numeroDePaginas: 2,
    pagina: async () => {
      throw new Error("no se usa");
    },
    cerrar: async () => {
      registro.cerrados++;
    },
  };
  const visor = {
    abrir: async () => {
      if (opciones.falla === "abrir") throw new Error("Invalid PDF structure");
      return documento;
    },
  };
  const guardador: Guardador = {
    guardar: async ({ nombre, manija }) => {
      if (opciones.falla === "guardar") throw new Error("disco lleno");
      if (opciones.falla === "cancela") return "cancelado";
      registro.guardados.push({ nombre, manija });
      return manija === null ? "descargado" : "sobrescrito";
    },
  };
  let n = 0;
  const editor = new Editor({ generarId: () => `id${++n}` });
  const sesion = new SesionDeDocumento({ editor, procesador, visor, guardador });
  return { sesion, editor, registro };
}

const archivo: ArchivoElegido = { nombre: "apuntes.pdf", bytes: new Uint8Array([1, 2]), manija: "manija-1" };

describe("SesionDeDocumento", () => {
  it("abrir carga en el editor las anotaciones propias del archivo, sin cambios pendientes", async () => {
    const { sesion, editor } = armar();
    const doc = await sesion.abrir(archivo);
    expect(doc.numeroDePaginas).toBe(2);
    expect(editor.estado.anotaciones).toEqual([marca]);
    expect(editor.estado.hayCambiosSinGuardar).toBe(false);
    expect(sesion.nombre).toBe("apuntes.pdf");
  });

  it("guardar exporta sobre el PDF limpio con las anotaciones actuales y marca guardado", async () => {
    const { sesion, editor, registro } = armar();
    await sesion.abrir(archivo);
    editor.marcarTexto({ pagina: 1, rects: [{ x: 1, y: 1, ancho: 9, alto: 9 }] });
    expect(await sesion.guardar()).toBe("sobrescrito");
    expect(registro.exportadoCon[0]).toHaveLength(2);
    expect(registro.guardados).toEqual([{ nombre: "apuntes.pdf", manija: "manija-1" }]);
    expect(editor.estado.hayCambiosSinGuardar).toBe(false);
  });

  it("si guardar falla, el error es legible y los cambios siguen pendientes", async () => {
    const { sesion, editor } = armar({ falla: "guardar" });
    await sesion.abrir(archivo);
    editor.marcarTexto({ pagina: 0, rects: [{ x: 1, y: 1, ancho: 9, alto: 9 }] });
    await expect(sesion.guardar()).rejects.toThrow(ErrorDeDocumento);
    await expect(sesion.guardar()).rejects.toThrow(/No se pudo guardar/);
    expect(editor.estado.hayCambiosSinGuardar).toBe(true);
  });

  it("cancelar el diálogo de guardar no marca guardado", async () => {
    const { sesion, editor } = armar({ falla: "cancela" });
    await sesion.abrir(archivo);
    editor.marcarTexto({ pagina: 0, rects: [{ x: 1, y: 1, ancho: 9, alto: 9 }] });
    expect(await sesion.guardar()).toBe("cancelado");
    expect(editor.estado.hayCambiosSinGuardar).toBe(true);
  });

  it("un archivo que no es PDF da un error legible y no cambia el documento abierto", async () => {
    const { sesion, editor } = armar({ falla: "abrir" });
    await expect(sesion.abrir(archivo)).rejects.toThrow(/No se pudo abrir «apuntes.pdf»/);
    expect(sesion.nombre).toBeNull();
    expect(editor.estado.anotaciones).toEqual([]);
  });

  it("abrir otro documento cierra el anterior", async () => {
    const { sesion, registro } = armar();
    await sesion.abrir(archivo);
    await sesion.abrir({ ...archivo, nombre: "otro.pdf" });
    expect(registro.cerrados).toBe(1);
  });

  it("guardar sin documento abierto es un error legible", async () => {
    const { sesion } = armar();
    await expect(sesion.guardar()).rejects.toThrow(/Abrí un PDF/);
  });
});
