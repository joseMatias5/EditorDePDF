import type { ArchivoElegido, Guardador, ResultadoGuardado } from "../../aplicacion/puertos";

/** Lo que expone escritorio/preload.cjs en `window.editorEscritorio`. */
export interface PuenteDeEscritorio {
  abrir(): Promise<{ nombre: string; bytes: Uint8Array; id: string } | null>;
  registrarArrastrado(archivo: File): Promise<string | null>;
  guardar(id: string, bytes: Uint8Array): Promise<void>;
  guardarComo(nombre: string, bytes: Uint8Array): Promise<{ id: string; nombre: string } | null>;
}

/**
 * Manija del archivo en disco. `id` es null si no se pudo registrar (entonces Guardar pregunta dónde, una vez);
 * después de «Guardar como» queda apuntando al archivo nuevo para los siguientes guardados.
 */
interface ManijaDeEscritorio {
  id: string | null;
}

export function puenteDeEscritorio(): PuenteDeEscritorio | undefined {
  return (globalThis as { editorEscritorio?: PuenteDeEscritorio }).editorEscritorio;
}

export function archivosDeEscritorio(puente: PuenteDeEscritorio) {
  const elegirArchivo = async (): Promise<ArchivoElegido | null> => {
    const abierto = await puente.abrir();
    if (abierto === null) return null;
    const manija: ManijaDeEscritorio = { id: abierto.id };
    return { nombre: abierto.nombre, bytes: abierto.bytes, manija };
  };

  /** Arrastrado a la ventana: se registra su ruta para guardar en el mismo archivo. */
  const desdeFile = async (archivo: File): Promise<ArchivoElegido> => {
    const manija: ManijaDeEscritorio = { id: await puente.registrarArrastrado(archivo).catch(() => null) };
    return { nombre: archivo.name, bytes: new Uint8Array(await archivo.arrayBuffer()), manija };
  };

  /** Como Edge: Guardar sobrescribe el mismo archivo, sin preguntar ni abrir nada. */
  const guardador: Guardador = {
    async guardar({ nombre, bytes, manija }): Promise<ResultadoGuardado> {
      const enDisco = manija as ManijaDeEscritorio;
      if (enDisco.id !== null) {
        await puente.guardar(enDisco.id, bytes);
        return "sobrescrito";
      }
      const nuevo = await puente.guardarComo(nombre, bytes);
      if (nuevo === null) return "cancelado";
      enDisco.id = nuevo.id;
      return "sobrescrito";
    },
  };

  return { elegirArchivo, desdeFile, guardador };
}
