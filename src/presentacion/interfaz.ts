import type { Editor } from "../aplicacion/editor";
import type { AlmacenDePreferencias, ArchivoElegido } from "../aplicacion/puertos";
import type { SesionDeDocumento } from "../aplicacion/sesionDeDocumento";
import { ACCIONES, MapaDeAtajos, NOMBRE_DE_ACCION } from "../dominio/atajos";
import { Avisos } from "./avisos";
import { BarraDeHerramientas } from "./barraDeHerramientas";
import { DialogoDeAtajos } from "./dialogoDeAtajos";
import { DialogoDeColores } from "./dialogoDeColores";
import { conectarEntradaDeArchivos } from "./entradaDeArchivos";
import { conectarPuntero } from "./punteroEnPagina";
import { conectarSeleccion } from "./seleccionDeTexto";
import { conectarTeclado } from "./teclado";
import { VistaDocumento } from "./vistaDocumento";

export interface DependenciasDeInterfaz {
  readonly editor: Editor;
  readonly sesion: SesionDeDocumento;
  readonly almacen: AlmacenDePreferencias;
  /** undefined = no hay selector del sistema (usar el <input>); null = canceló. */
  readonly elegirArchivo: () => Promise<ArchivoElegido | null | undefined>;
  readonly desdeFile: (archivo: File) => Promise<ArchivoElegido>;
}

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "Ocurrió un error inesperado.");

function elemento<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`Falta #${id} en index.html`);
  return el as T;
}

/** Arma la pantalla y conecta los eventos con el editor y la sesión. */
export function iniciarInterfaz(d: DependenciasDeInterfaz): void {
  const { editor, sesion } = d;
  let atajos = MapaDeAtajos.desdeJson(d.almacen.leer("atajos") ?? "{}");
  let guardando = false;
  const avisos = new Avisos(elemento("avisos"));
  const vista = new VistaDocumento(elemento("paginas"), (e) => avisos.error(`No se pudo dibujar una página. (${mensajeDe(e)})`));
  const vacio = elemento("vacio");
  const dialogo = new DialogoDeAtajos(elemento<HTMLDialogElement>("dialogo-atajos"), {
    atajos: () => atajos,
    cambiar: (mapa) => {
      atajos = mapa;
      d.almacen.escribir("atajos", mapa.aJson());
      refrescar();
    },
  });
  const colores = new DialogoDeColores(elemento<HTMLDialogElement>("dialogo-colores"), {
    editor,
    atajos: () => atajos,
    alCambiar: () => d.almacen.escribir("paleta", editor.estado.paleta.aJson()),
  });

  async function abrir(archivo: ArchivoElegido): Promise<void> {
    const nombreActual = sesion.nombre;
    if (nombreActual && editor.estado.hayCambiosSinGuardar && !confirm(`«${nombreActual}» tiene anotaciones sin guardar. ¿Abrir otro PDF y descartarlas?`)) return;
    try {
      const documento = await sesion.abrir(archivo);
      await vista.mostrar(documento);
      for (const v of vista.vistas) conectarPuntero(v, editor);
      vacio.hidden = true;
      document.title = `${archivo.nombre} · Editor PDF`;
      avisos.limpiarError();
      refrescar();
    } catch (e) {
      avisos.error(mensajeDe(e));
    }
  }

  const elegirYAbrir = conectarEntradaDeArchivos({
    elegirArchivo: d.elegirArchivo,
    desdeFile: d.desdeFile,
    alElegir: abrir,
    alFallar: (mensaje) => avisos.error(mensaje),
  });

  async function guardar(): Promise<void> {
    if (guardando || sesion.nombre === null) return;
    guardando = true;
    refrescar();
    try {
      const resultado = await sesion.guardar();
      avisos.limpiarError();
      if (resultado === "sobrescrito") avisos.info(`Guardado en «${sesion.nombre}».`);
      if (resultado === "descargado") avisos.info(`Se descargó «${sesion.nombre}» con las anotaciones.`);
    } catch (e) {
      avisos.error(mensajeDe(e));
    } finally {
      guardando = false;
      refrescar();
    }
  }

  function pintarResumenDeTeclas(): void {
    elemento("resumen-teclas").replaceChildren(
      ...ACCIONES.map((accion) => {
        const fila = document.createElement("div");
        const tecla = Object.assign(document.createElement("kbd"), { textContent: atajos.teclaDe(accion).toUpperCase() });
        const dt = document.createElement("dt");
        dt.append(tecla);
        fila.append(dt, Object.assign(document.createElement("dd"), { textContent: NOMBRE_DE_ACCION[accion] }));
        return fila;
      }),
    );
  }

  function refrescar(): void {
    const estado = editor.estado;
    document.body.dataset.herramienta = estado.herramienta;
    document.body.style.setProperty("--color-activo", estado.tinta.hex);
    if (!vacio.hidden) pintarResumenDeTeclas();
    barra.actualizar({ editor: estado, atajos, hayDocumento: sesion.nombre !== null, guardando, escala: vista.escala });
    vista.pintar(estado.anotaciones);
  }

  const barra = new BarraDeHerramientas(elemento("barra"), {
    abrir: () => void elegirYAbrir(),
    guardar: () => void guardar(),
    ejecutar: (accion) => editor.ejecutar(accion),
    elegirGrosor: (g) => editor.elegirGrosor(g),
    elegirTamano: (t) => editor.elegirTamanoTexto(t),
    zoom: (como) => {
      if (como === "acercar") vista.acercar();
      else if (como === "alejar") vista.alejar();
      else vista.ajustarAlAncho();
      refrescar();
    },
    configurarTeclas: () => dialogo.abrir(),
    configurarColores: (ranura) => colores.abrir(ranura),
  });

  elemento("boton-abrir-vacio").addEventListener("click", () => void elegirYAbrir());

  window.addEventListener("beforeunload", (e) => {
    if (editor.estado.hayCambiosSinGuardar) e.preventDefault();
  });

  editor.suscribir(refrescar);
  conectarTeclado({ editor, atajos: () => atajos, pausado: () => dialogo.abierto || colores.abierto });
  conectarSeleccion({ editor, vistas: () => vista.vistas });
  refrescar();
}
