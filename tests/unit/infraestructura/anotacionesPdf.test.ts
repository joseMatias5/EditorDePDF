import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import type { Anotacion } from "../../../src/dominio/anotacion";
import { CLAVE_DATOS } from "../../../src/infraestructura/pdf/marcaDelEditor";
import { exportarConAnotaciones } from "../../../src/infraestructura/pdf/escritorDeAnotaciones";
import { separarAnotaciones } from "../../../src/infraestructura/pdf/lectorDeAnotaciones";
import { crearPdfDePrueba, subtiposPorPagina } from "../../ayudas/pdfDePrueba";

const anotaciones: Anotacion[] = [
  { id: "r1", pagina: 0, color: { hex: "#FFE14D", opacidad: 1 }, tipo: "resaltado", rects: [{ x: 72, y: 756, ancho: 200, alto: 20 }] },
  { id: "s1", pagina: 0, color: { hex: "#4DB8FF", opacidad: 1 }, tipo: "subrayado", rects: [{ x: 72, y: 700, ancho: 100, alto: 14 }] },
  {
    id: "t1",
    pagina: 1,
    color: { hex: "#6A2FD1", opacidad: 0.6 }, // violeta intenso, 40 % transparente
    tipo: "trazo",
    grosor: 3,
    puntos: [
      { x: 100, y: 100 },
      { x: 150, y: 160 },
      { x: 200, y: 120 },
    ],
  },
  {
    id: "x1",
    pagina: 1,
    color: { hex: "#5CD65C", opacidad: 1 },
    tipo: "texto",
    caja: { x: 300, y: 500, ancho: 150, alto: 40 },
    texto: "Revisar acá: año 2026 ✓",
    tamano: 14,
  },
];

async function anotacionesSegunPdfJs(bytes: Uint8Array) {
  const carga = getDocument({ data: bytes.slice(), verbosity: 0 });
  const pdf = await carga.promise;
  const resultado = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    resultado.push(await pagina.getAnnotations());
  }
  await carga.destroy();
  return resultado;
}

describe("exportarConAnotaciones", () => {
  it("escribe anotaciones PDF estándar y conserva las ajenas", async () => {
    const original = await crearPdfDePrueba();
    const exportado = await exportarConAnotaciones(original, anotaciones);
    expect(await subtiposPorPagina(exportado)).toEqual([
      ["Text", "Highlight", "Underline"],
      ["Ink", "FreeText"],
    ]);
  });

  it("un visor real (pdf.js) las reconoce con su color, contenido y apariencia", async () => {
    const exportado = await exportarConAnotaciones(await crearPdfDePrueba(), anotaciones);
    const [pagina1, pagina2] = await anotacionesSegunPdfJs(exportado);

    const resaltado = pagina1?.find((a) => a.subtype === "Highlight");
    expect(resaltado?.color).toEqual(new Uint8ClampedArray([0xff, 0xe1, 0x4d]));
    expect(resaltado?.hasAppearance).toBe(true);

    const texto = pagina2?.find((a) => a.subtype === "FreeText");
    expect(texto?.contentsObj?.str).toBe("Revisar acá: año 2026 ✓");
    expect(texto?.hasAppearance).toBe(true);

    const trazo = pagina2?.find((a) => a.subtype === "Ink");
    expect(trazo?.hasAppearance).toBe(true);
    expect(trazo?.borderStyle?.width).toBe(3);
    expect(trazo?.color).toEqual(new Uint8ClampedArray([0x6a, 0x2f, 0xd1]));
    expect(trazo?.opacity).toBeCloseTo(0.6);
    expect(resaltado?.opacity).toBe(1);
  });

  it("la transparencia también va en la apariencia (como la escribe pdf.js), y no la hay si es opaca", async () => {
    const exportado = await exportarConAnotaciones(await crearPdfDePrueba(), anotaciones);
    const doc = await PDFDocument.load(exportado);
    const opacidadDeApariencia = (pagina: number, indice: number) => {
      const annot = doc.context.lookup(doc.getPage(pagina).node.Annots()?.asArray()[indice], PDFDict);
      const ap = doc.context.lookup(annot.lookup(PDFName.of("AP"), PDFDict).get(PDFName.of("N"))) as unknown as { dict: PDFDict };
      const gs = ap.dict.lookup(PDFName.of("Resources"), PDFDict).lookup(PDFName.of("ExtGState"), PDFDict);
      const estado = gs.lookup(PDFName.of("GS0"), PDFDict);
      return [estado.get(PDFName.of("ca"))?.toString(), estado.get(PDFName.of("CA"))?.toString()];
    };
    expect(opacidadDeApariencia(1, 0)).toEqual(["0.6", "0.6"]); // trazo
    expect(opacidadDeApariencia(0, 1)).toEqual(["1", "1"]); // resaltado opaco
  });

  it("no modifica los bytes de entrada", async () => {
    const original = await crearPdfDePrueba();
    const copia = original.slice();
    await exportarConAnotaciones(original, anotaciones);
    expect(original).toEqual(copia);
  });
});

describe("separarAnotaciones (reabrir un PDF guardado por la app)", () => {
  it("recupera las anotaciones propias tal como estaban y deja el PDF sin ellas", async () => {
    const exportado = await exportarConAnotaciones(await crearPdfDePrueba(), anotaciones);
    const { limpio, anotaciones: recuperadas } = await separarAnotaciones(exportado);

    expect(recuperadas).toEqual(anotaciones);
    expect(await subtiposPorPagina(limpio)).toEqual([["Text"], []]);
  });

  it("guardar dos veces seguidas no duplica nada", async () => {
    const primera = await exportarConAnotaciones(await crearPdfDePrueba(), anotaciones);
    const { limpio, anotaciones: recuperadas } = await separarAnotaciones(primera);
    const segunda = await exportarConAnotaciones(limpio, recuperadas);
    expect(await subtiposPorPagina(segunda)).toEqual(await subtiposPorPagina(primera));
  });

  it("un PDF sin anotaciones propias vuelve igual y sin anotaciones", async () => {
    const original = await crearPdfDePrueba();
    const { anotaciones: recuperadas } = await separarAnotaciones(original);
    expect(recuperadas).toEqual([]);
  });

  it("un PDF guardado con la versión anterior (color por nombre) se reabre con ese color, opaco", async () => {
    const exportado = await exportarConAnotaciones(await crearPdfDePrueba(), [anotaciones[0] as Anotacion]);
    const doc = await PDFDocument.load(exportado);
    const ref = doc.getPage(0).node.Annots()?.asArray()[1];
    const viejo = '{"id":"r1","pagina":0,"color":"verde","tipo":"resaltado","rects":[{"x":1,"y":1,"ancho":5,"alto":5}]}';
    doc.context.lookup(ref, PDFDict).set(PDFName.of(CLAVE_DATOS), PDFHexString.fromText(viejo));
    const { anotaciones: recuperadas } = await separarAnotaciones(await doc.save());
    expect(recuperadas.map((a) => a.color)).toEqual([{ hex: "#5CD65C", opacidad: 1 }]);
  });

  it.each([
    ["JSON roto", "{no es json"],
    ["sin área", '{"id":"r1","pagina":0,"color":{"hex":"#FFE14D","opacidad":1},"tipo":"resaltado","rects":[]}'],
    ["color que no es una tinta", '{"id":"r1","pagina":0,"color":"violeta","tipo":"resaltado","rects":[{"x":1,"y":1,"ancho":5,"alto":5}]}'],
    ["opacidad imposible", '{"id":"r1","pagina":0,"color":{"hex":"#FFE14D","opacidad":7},"tipo":"resaltado","rects":[{"x":1,"y":1,"ancho":5,"alto":5}]}'],
    ["tipo desconocido", '{"id":"r1","pagina":0,"color":{"hex":"#FFE14D","opacidad":1},"tipo":"sello"}'],
    ["página que no es la suya", '{"id":"r1","pagina":7,"color":{"hex":"#FFE14D","opacidad":1},"tipo":"resaltado","rects":[{"x":1,"y":1,"ancho":5,"alto":5}]}'],
  ])("datos propios alterados (%s) no se importan: la anotación queda como ajena", async (_caso, datos) => {
    const exportado = await exportarConAnotaciones(await crearPdfDePrueba(), [anotaciones[0] as Anotacion]);
    const doc = await PDFDocument.load(exportado);
    const ref = doc.getPage(0).node.Annots()?.asArray()[1];
    doc.context.lookup(ref, PDFDict).set(PDFName.of(CLAVE_DATOS), PDFHexString.fromText(datos));
    const alterado = await doc.save();

    const { limpio, anotaciones: recuperadas } = await separarAnotaciones(alterado);
    expect(recuperadas).toEqual([]);
    expect(await subtiposPorPagina(limpio)).toEqual([["Text", "Highlight"], []]);
  });
});
