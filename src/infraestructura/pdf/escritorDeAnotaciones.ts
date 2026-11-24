import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString, StandardFonts } from "pdf-lib";
import { limitesDe, type Anotacion, type Marca } from "../../dominio/anotacion";
import type { Coleccion } from "../../dominio/coleccion";
import { componentesRgb } from "../../dominio/colores";
import { NOMBRE_FUENTE, comoArreglo, crearApariencia, type Recursos } from "./aparienciasPdf";
import { serializar } from "./datosDeAnotacion";
import { AUTOR, CLAVE_DATOS, PREFIJO_NOMBRE } from "./marcaDelEditor";

/** Bandera "Print" (bit 3): la anotación también se imprime, como en Edge. */
const IMPRIMIR = 4;

/** Esquinas de cada línea en el orden que usan los visores: sup-izq, sup-der, inf-izq, inf-der. */
function quadPoints(m: Marca): number[] {
  return m.rects.flatMap((r) => [r.x, r.y + r.alto, r.x + r.ancho, r.y + r.alto, r.x, r.y, r.x + r.ancho, r.y]);
}

function propiasDelTipo(a: Anotacion, recursos: Recursos): Record<string, unknown> {
  switch (a.tipo) {
    case "resaltado":
    case "subrayado":
      return { Subtype: a.tipo === "resaltado" ? "Highlight" : "Underline", QuadPoints: quadPoints(a) };
    case "trazo":
      return { Subtype: "Ink", InkList: [a.puntos.flatMap((p) => [p.x, p.y])], BS: { W: a.grosor } };
    case "texto": {
      const [r, g, b] = componentesRgb(a.color.hex);
      return {
        Subtype: "FreeText",
        Contents: PDFHexString.fromText(a.texto),
        DA: PDFString.of(`/${NOMBRE_FUENTE} ${a.tamano} Tf ${r} ${g} ${b} rg`),
        BS: { W: 0 },
        DR: { Font: { [NOMBRE_FUENTE]: recursos.fuente.ref } },
      };
    }
  }
}

function diccionarioDe(a: Anotacion, recursos: Recursos): PDFDict {
  const dict = recursos.doc.context.obj({
    Type: "Annot",
    Rect: comoArreglo(limitesDe(a)),
    C: [...componentesRgb(a.color.hex)],
    CA: a.color.opacidad,
    F: IMPRIMIR,
    NM: PDFString.of(PREFIJO_NOMBRE + a.id),
    T: PDFHexString.fromText(AUTOR),
    M: PDFString.fromDate(new Date()),
    AP: { N: crearApariencia(a, recursos) },
    ...propiasDelTipo(a, recursos),
  });
  dict.set(PDFName.of(CLAVE_DATOS), PDFHexString.fromText(serializar(a)));
  return dict;
}

/**
 * Devuelve un PDF nuevo con las anotaciones como anotaciones PDF estándar (editables en Edge/Acrobat).
 * `original` no se modifica. Debe ser el PDF SIN las anotaciones propias (ver lectorDeAnotaciones).
 */
export async function exportarConAnotaciones(original: Uint8Array, anotaciones: Coleccion): Promise<Uint8Array> {
  const doc = await PDFDocument.load(original, { updateMetadata: false });
  const recursos: Recursos = { doc, fuente: await doc.embedFont(StandardFonts.Helvetica) };
  const paginas = doc.getPages();
  for (const a of anotaciones) {
    const pagina = paginas[a.pagina];
    if (pagina === undefined) throw new RangeError(`La anotación ${a.id} apunta a la página ${a.pagina + 1}, que no existe`);
    pagina.node.addAnnot(doc.context.register(diccionarioDe(a, recursos)));
  }
  return doc.save();
}
