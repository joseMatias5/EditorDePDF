import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString, type PDFObject } from "pdf-lib";
import type { Anotacion } from "../../dominio/anotacion";
import { reconstruir } from "./datosDeAnotacion";
import { CLAVE_DATOS } from "./marcaDelEditor";

function anotacionPropia(dict: PDFDict | undefined, pagina: number): Anotacion | null {
  const datos = dict?.get(PDFName.of(CLAVE_DATOS));
  if (!(datos instanceof PDFHexString || datos instanceof PDFString)) return null;
  return reconstruir(datos.decodeText(), pagina);
}

/** Quita del archivo el diccionario de la anotación y su apariencia, para que no crezca en cada guardado. */
function borrarObjetos(doc: PDFDocument, entrada: PDFObject, dict: PDFDict): void {
  const apariencia = dict.lookupMaybe(PDFName.of("AP"), PDFDict)?.get(PDFName.of("N"));
  if (apariencia instanceof PDFRef) doc.context.delete(apariencia);
  if (entrada instanceof PDFRef) doc.context.delete(entrada);
}

/**
 * Al abrir un PDF guardado por esta app: saca las anotaciones propias para que vuelvan a ser
 * editables (borrar, deshacer) y devuelve el PDF sin ellas, que es lo que se muestra y sobre lo que se exporta.
 * Las anotaciones de otros programas se dejan intactas.
 */
export async function separarAnotaciones(bytes: Uint8Array): Promise<{ limpio: Uint8Array; anotaciones: Anotacion[] }> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const encontradas: Anotacion[] = [];
  doc.getPages().forEach((pagina, indice) => {
    const annots = pagina.node.Annots();
    if (annots === undefined) return;
    const quedan: PDFObject[] = [];
    for (const entrada of annots.asArray()) {
      const dict = doc.context.lookupMaybe(entrada, PDFDict);
      const propia = anotacionPropia(dict, indice);
      if (propia === null || dict === undefined) {
        quedan.push(entrada);
        continue;
      }
      encontradas.push(propia);
      borrarObjetos(doc, entrada, dict);
    }
    if (quedan.length !== annots.size()) pagina.node.set(PDFName.of("Annots"), doc.context.obj(quedan));
  });
  if (encontradas.length === 0) return { limpio: bytes, anotaciones: [] };
  return { limpio: await doc.save(), anotaciones: encontradas };
}
