import { PDFDict, PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";

/**
 * PDF de dos páginas con texto y una nota ajena (de "otro programa") en la página 1,
 * para comprobar que el editor no toca lo que no es suyo.
 */
export async function crearPdfDePrueba(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  for (const texto of ["Primera página de prueba", "Segunda página de prueba"]) {
    const pagina = doc.addPage([595, 842]);
    pagina.drawText(texto, { x: 72, y: 760, size: 18, font: fuente });
  }
  const notaAjena = doc.context.obj({
    Type: "Annot",
    Subtype: "Text",
    Rect: [10, 10, 30, 30],
    Contents: PDFString.of("nota de otro programa"),
  });
  doc.getPage(0).node.addAnnot(doc.context.register(notaAjena));
  return doc.save();
}

export async function subtiposPorPagina(bytes: Uint8Array): Promise<string[][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => {
    const annots = p.node.Annots();
    if (!annots) return [];
    return annots
      .asArray()
      .map((ref) => String(doc.context.lookup(ref, PDFDict).get(PDFName.of("Subtype"))).replace("/", ""));
  });
}
