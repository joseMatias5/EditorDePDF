import type { Editor } from "./editor";
import { ErrorDeDocumento } from "./errorDeDocumento";
import type {
  AbridorDeVisor,
  ArchivoElegido,
  DocumentoVisible,
  Guardador,
  ProcesadorPdf,
  ResultadoGuardado,
} from "./puertos";

interface Dependencias {
  readonly editor: Editor;
  readonly procesador: ProcesadorPdf;
  readonly visor: AbridorDeVisor;
  readonly guardador: Guardador;
}

interface Abierto {
  readonly archivo: ArchivoElegido;
  /** El PDF sin las anotaciones propias: lo que se muestra y sobre lo que se exporta. */
  readonly limpio: Uint8Array;
  readonly visible: DocumentoVisible;
}

const detalle = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Caso de uso: abrir un PDF para anotarlo y guardarlo. Una sola responsabilidad: el ciclo de vida del archivo. */
export class SesionDeDocumento {
  readonly #d: Dependencias;
  #abierto: Abierto | null = null;

  constructor(dependencias: Dependencias) {
    this.#d = dependencias;
  }

  get nombre(): string | null {
    return this.#abierto?.archivo.nombre ?? null;
  }

  async abrir(archivo: ArchivoElegido): Promise<DocumentoVisible> {
    let limpio: Uint8Array;
    let anotaciones;
    let visible: DocumentoVisible;
    try {
      ({ limpio, anotaciones } = await this.#d.procesador.separarAnotaciones(archivo.bytes));
      // pdf.js se queda con el búfer que recibe: se le pasa una copia para conservar `limpio`.
      visible = await this.#d.visor.abrir(limpio.slice());
    } catch (e) {
      throw new ErrorDeDocumento(
        `No se pudo abrir «${archivo.nombre}». Comprobá que sea un PDF válido y sin contraseña. (${detalle(e)})`,
        { cause: e },
      );
    }
    await this.#abierto?.visible.cerrar();
    this.#abierto = { archivo, limpio, visible };
    this.#d.editor.cargar(anotaciones);
    return visible;
  }

  async guardar(): Promise<ResultadoGuardado> {
    const abierto = this.#abierto;
    if (abierto === null) throw new ErrorDeDocumento("Abrí un PDF antes de guardar.");
    const anotaciones = this.#d.editor.estado.anotaciones;
    try {
      const bytes = await this.#d.procesador.exportarConAnotaciones(abierto.limpio, anotaciones);
      const resultado = await this.#d.guardador.guardar({ nombre: abierto.archivo.nombre, bytes, manija: abierto.archivo.manija });
      if (resultado !== "cancelado") this.#d.editor.marcarGuardado(anotaciones);
      return resultado;
    } catch (e) {
      throw new ErrorDeDocumento(`No se pudo guardar «${abierto.archivo.nombre}». Tus anotaciones siguen acá; probá de nuevo. (${detalle(e)})`, {
        cause: e,
      });
    }
  }
}
