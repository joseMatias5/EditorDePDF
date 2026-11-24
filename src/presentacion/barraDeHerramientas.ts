import type { EstadoEditor } from "../aplicacion/editor";
import { NOMBRE_DE_ACCION, type Accion, type MapaDeAtajos } from "../dominio/atajos";
import { cssDe, nombreDeOpcion } from "../dominio/colores";
import { HERRAMIENTAS } from "../dominio/herramienta";
import { RANURAS, type Ranura } from "../dominio/paleta";
import { ICONOS } from "./iconos";

export interface AccionesDeBarra {
  abrir(): void;
  guardar(): void;
  ejecutar(accion: Accion): void;
  elegirGrosor(grosor: number): void;
  elegirTamano(tamano: number): void;
  zoom(como: "acercar" | "alejar" | "ancho"): void;
  configurarTeclas(): void;
  /** Abre las opciones de color, en la tecla indicada o en la activa. */
  configurarColores(ranura?: Ranura): void;
}

export interface EstadoDeBarra {
  readonly editor: EstadoEditor;
  readonly atajos: MapaDeAtajos;
  readonly hayDocumento: boolean;
  readonly guardando: boolean;
  readonly escala: number;
}

const GROSORES = [
  { valor: 1, nombre: "Fino" },
  { valor: 2, nombre: "Medio" },
  { valor: 4, nombre: "Grueso" },
  { valor: 8, nombre: "Marcador" },
];
const TAMANOS = [10, 12, 14, 18, 24, 32];

function boton(datos: { clase: string; etiqueta: string; icono?: string; alHacerClic: () => void }): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = datos.clase;
  b.innerHTML = `${datos.icono ?? ""}<span class="etiqueta">${datos.etiqueta}</span><kbd hidden></kbd>`;
  b.addEventListener("click", datos.alHacerClic);
  return b;
}

function selector(datos: { etiqueta: string; opciones: { valor: number; nombre: string }[]; alCambiar: (v: number) => void }) {
  const envoltura = document.createElement("label");
  envoltura.className = "selector";
  const lista = document.createElement("select");
  lista.append(...datos.opciones.map((o) => new Option(o.nombre, String(o.valor))));
  lista.addEventListener("change", () => datos.alCambiar(Number(lista.value)));
  envoltura.append(Object.assign(document.createElement("span"), { textContent: datos.etiqueta }), lista);
  return { envoltura, lista };
}

function grupo(nombre: string, ...hijos: HTMLElement[]): HTMLElement {
  const g = document.createElement("div");
  g.className = "grupo";
  g.setAttribute("role", "group");
  g.setAttribute("aria-label", nombre);
  g.append(...hijos);
  return g;
}

/** Barra superior. Se arma una vez; `actualizar` solo cambia estados (activo, teclas, deshabilitado). */
export class BarraDeHerramientas {
  readonly #porAccion = new Map<Accion, HTMLButtonElement>();
  readonly #guardar: HTMLButtonElement;
  readonly #estadoGuardado = document.createElement("span");
  readonly #grosor;
  readonly #tamano;
  readonly #zoom = document.createElement("output");
  readonly #sinDocumento: HTMLButtonElement[] = [];

  constructor(contenedor: HTMLElement, acciones: AccionesDeBarra) {
    const accion = (a: Accion, datos: { clase: string; icono?: string; etiqueta?: string }) => {
      const b = boton({ ...datos, etiqueta: datos.etiqueta ?? NOMBRE_DE_ACCION[a], alHacerClic: () => acciones.ejecutar(a) });
      this.#porAccion.set(a, b);
      return b;
    };
    const abrir = boton({ clase: "boton", etiqueta: "Abrir PDF", icono: ICONOS.abrir, alHacerClic: acciones.abrir });
    this.#guardar = boton({ clase: "boton boton-guardar", etiqueta: "Guardar", icono: ICONOS.guardar, alHacerClic: acciones.guardar });
    this.#estadoGuardado.className = "estado-guardado";
    this.#estadoGuardado.setAttribute("aria-live", "polite");

    const herramientas = HERRAMIENTAS.map((h) =>
      accion(`herramienta:${h}`, { clase: "herramienta", icono: ICONOS[h], etiqueta: NOMBRE_DE_ACCION[`herramienta:${h}`].split(" (")[0] as string }),
    );
    const colores = RANURAS.map((r) => {
      const b = accion(`color:${r}`, { clase: "muestra" });
      // Doble clic: abre las opciones de esa tecla (el primer clic ya la eligió).
      b.addEventListener("dblclick", () => acciones.configurarColores(r));
      return b;
    });
    const personalizar = boton({ clase: "boton", etiqueta: "Colores", icono: ICONOS.paleta, alHacerClic: () => acciones.configurarColores() });
    this.#grosor = selector({ etiqueta: "Grosor", opciones: GROSORES, alCambiar: acciones.elegirGrosor });
    this.#tamano = selector({
      etiqueta: "Letra",
      opciones: TAMANOS.map((t) => ({ valor: t, nombre: `${t} pt` })),
      alCambiar: acciones.elegirTamano,
    });
    const deshacer = accion("deshacer", { clase: "boton", icono: ICONOS.deshacer });
    const rehacer = accion("rehacer", { clase: "boton", icono: ICONOS.rehacer });
    const zoom = [
      boton({ clase: "boton boton-zoom", etiqueta: "Alejar", icono: "−", alHacerClic: () => acciones.zoom("alejar") }),
      this.#zoom,
      boton({ clase: "boton boton-zoom", etiqueta: "Acercar", icono: "+", alHacerClic: () => acciones.zoom("acercar") }),
      boton({ clase: "boton", etiqueta: "Ancho", alHacerClic: () => acciones.zoom("ancho") }),
    ];
    const teclas = boton({ clase: "boton", etiqueta: "Teclas", icono: ICONOS.teclado, alHacerClic: acciones.configurarTeclas });
    this.#sinDocumento.push(this.#guardar, ...zoom.filter((z): z is HTMLButtonElement => z instanceof HTMLButtonElement));

    contenedor.replaceChildren(
      grupo("Archivo", abrir, this.#guardar, this.#estadoGuardado),
      grupo("Herramientas", ...herramientas),
      grupo("Colores", ...colores, personalizar),
      grupo("Opciones", this.#grosor.envoltura, this.#tamano.envoltura),
      grupo("Historial", deshacer, rehacer),
      grupo("Zoom", ...zoom),
      grupo("Ayuda", teclas),
    );
  }

  actualizar(estado: EstadoDeBarra): void {
    const { editor, atajos } = estado;
    for (const [accion, b] of this.#porAccion) {
      const tecla = atajos.teclaDe(accion).toUpperCase();
      const kbd = b.querySelector("kbd") as HTMLElement;
      kbd.hidden = false;
      kbd.textContent = tecla;
      let nombre = NOMBRE_DE_ACCION[accion];
      if (accion.startsWith("herramienta:")) b.setAttribute("aria-pressed", String(accion === `herramienta:${editor.herramienta}`));
      if (accion.startsWith("color:")) {
        const ranura = Number(accion.slice(6)) as Ranura;
        nombre = `${nombre}: ${nombreDeOpcion(editor.paleta.opcion(ranura))}`;
        b.style.setProperty("--muestra", cssDe(editor.paleta.tinta(ranura)));
        b.setAttribute("aria-pressed", String(ranura === editor.ranura));
        b.setAttribute("aria-label", `${nombre}, tecla ${tecla}`);
        (b.querySelector(".etiqueta") as HTMLElement).textContent = nombre;
      }
      b.title = `${nombre} (tecla ${tecla})`;
      b.setAttribute("aria-keyshortcuts", tecla);
    }
    (this.#porAccion.get("deshacer") as HTMLButtonElement).disabled = !editor.puedeDeshacer;
    (this.#porAccion.get("rehacer") as HTMLButtonElement).disabled = !editor.puedeRehacer;
    for (const b of this.#sinDocumento) b.disabled = !estado.hayDocumento;
    this.#guardar.disabled = !estado.hayDocumento || estado.guardando;
    (this.#guardar.querySelector(".etiqueta") as HTMLElement).textContent = estado.guardando ? "Guardando…" : "Guardar";
    this.#estadoGuardado.textContent = estado.hayDocumento && editor.hayCambiosSinGuardar ? "Sin guardar" : "";
    this.#grosor.lista.value = String(editor.grosor);
    this.#tamano.lista.value = String(editor.tamanoTexto);
    this.#zoom.textContent = estado.hayDocumento ? `${Math.round(estado.escala * 100)} %` : "";
  }
}
