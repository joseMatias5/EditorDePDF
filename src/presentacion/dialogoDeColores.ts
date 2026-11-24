import type { Editor } from "../aplicacion/editor";
import type { MapaDeAtajos } from "../dominio/atajos";
import {
  INTENSIDADES,
  MATICES,
  NOMBRE_DE_INTENSIDAD,
  TRANSPARENCIAS,
  cssDe,
  hexDeOpcion,
  nombreDeOpcion,
  type OpcionDeColor,
} from "../dominio/colores";
import { Paleta, RANURAS, type Ranura } from "../dominio/paleta";

interface Dependencias {
  readonly editor: Editor;
  readonly atajos: () => MapaDeAtajos;
  /** Se llama después de cada cambio de color, para guardarlo. */
  readonly alCambiar: () => void;
}

function boton(datos: { clase: string; etiqueta: string; alHacerClic: () => void }): HTMLButtonElement {
  const b = Object.assign(document.createElement("button"), { type: "button", className: datos.clase });
  b.setAttribute("aria-label", datos.etiqueta);
  b.title = datos.etiqueta;
  b.addEventListener("click", datos.alHacerClic);
  return b;
}

function seccion(titulo: string, ...hijos: HTMLElement[]): HTMLElement {
  const s = document.createElement("section");
  s.className = "seccion-colores";
  s.setAttribute("aria-label", titulo);
  s.append(Object.assign(document.createElement("h3"), { textContent: titulo }), ...hijos);
  return s;
}

/**
 * Personalizar los colores de las teclas eligiendo entre opciones (sin selector de degradé):
 * tecla → color de una grilla (11 colores × 3 intensidades) → transparencia en pasos.
 * Los cambios se aplican al instante; lo ya dibujado conserva su color.
 */
export class DialogoDeColores {
  readonly #dialogo: HTMLDialogElement;
  readonly #d: Dependencias;
  readonly #ranuras = document.createElement("div");
  readonly #grilla = document.createElement("div");
  readonly #elegido = document.createElement("p");
  readonly #transparencias = document.createElement("div");
  readonly #muestra = document.createElement("div");

  constructor(dialogo: HTMLDialogElement, dependencias: Dependencias) {
    this.#dialogo = dialogo;
    this.#d = dependencias;
    this.#armar();
    dependencias.editor.suscribir(() => {
      if (dialogo.open) this.#pintar();
    });
  }

  get abierto(): boolean {
    return this.#dialogo.open;
  }

  /** Abre en la ranura indicada (o la activa) y la deja elegida para seguir anotando con ella. */
  abrir(ranura?: Ranura): void {
    if (ranura !== undefined) this.#d.editor.ejecutar(`color:${ranura}`);
    this.#pintar();
    this.#dialogo.showModal();
    this.#ranuras.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
  }

  get #ranura(): Ranura {
    return this.#d.editor.estado.ranura;
  }

  get #opcion(): OpcionDeColor {
    return this.#d.editor.estado.paleta.opcion(this.#ranura);
  }

  #cambiar(cambios: Partial<OpcionDeColor>): void {
    this.#d.editor.cambiarColor({ ranura: this.#ranura, cambios });
    this.#d.alCambiar();
  }

  #armar(): void {
    const titulo = Object.assign(document.createElement("h2"), { id: "titulo-colores", textContent: "Colores" });
    const ayuda = Object.assign(document.createElement("p"), {
      className: "ayuda",
      textContent: "Elegí la tecla y después su color, intensidad y transparencia. Lo que ya dibujaste no cambia.",
    });
    this.#ranuras.className = "ranuras";
    this.#armarGrilla();
    this.#elegido.className = "color-elegido";
    this.#elegido.setAttribute("aria-live", "polite");
    this.#transparencias.className = "opciones-transparencia";
    for (const t of TRANSPARENCIAS) {
      // El nombre accesible contiene el texto visible (axe: label-content-name-mismatch).
      const etiqueta = t === 0 ? "Opaco, sin transparencia" : `${t} % transparente`;
      const b = boton({ clase: "boton boton-chico opcion", etiqueta, alHacerClic: () => this.#cambiar({ transparencia: t }) });
      b.textContent = t === 0 ? "Opaco" : `${t} %`;
      b.dataset.transparencia = String(t);
      this.#transparencias.append(b);
    }
    this.#muestra.className = "muestra-color";
    this.#muestra.setAttribute("aria-hidden", "true");
    this.#muestra.innerHTML = '<span class="ejemplo-resaltado">Texto de ejemplo</span><svg viewBox="0 0 120 24"><path d="M4 16 C 30 4, 50 22, 80 10 S 110 8, 116 14"/></svg>';

    const pie = document.createElement("div");
    pie.className = "pie-dialogo";
    const restablecer = Object.assign(document.createElement("button"), { type: "button", className: "boton", textContent: "Restablecer esta tecla" });
    restablecer.addEventListener("click", () => this.#cambiar(Paleta.porDefecto().opcion(this.#ranura)));
    const todas = Object.assign(document.createElement("button"), { type: "button", className: "boton", textContent: "Restablecer todas" });
    todas.addEventListener("click", () => {
      this.#d.editor.restablecerColores();
      this.#d.alCambiar();
    });
    const listo = Object.assign(document.createElement("button"), { type: "button", className: "boton", textContent: "Listo" });
    listo.addEventListener("click", () => this.#dialogo.close());
    pie.append(restablecer, todas, listo);

    this.#dialogo.setAttribute("aria-labelledby", titulo.id);
    this.#dialogo.replaceChildren(
      titulo,
      ayuda,
      seccion("Tecla", this.#ranuras),
      seccion("Color e intensidad", this.#grilla, this.#elegido),
      seccion("Transparencia", this.#transparencias, this.#muestra),
      pie,
    );
  }

  /** Columnas = colores; filas = intensidades. Cada celda es una opción concreta con nombre. */
  #armarGrilla(): void {
    this.#grilla.className = "grilla-colores";
    this.#grilla.style.setProperty("--columnas", String(MATICES.length));
    for (const intensidad of INTENSIDADES) {
      this.#grilla.append(Object.assign(document.createElement("span"), { className: "fila-intensidad", textContent: NOMBRE_DE_INTENSIDAD[intensidad] }));
      for (const m of MATICES) {
        const nombre = nombreDeOpcion({ matiz: m.id, intensidad, transparencia: 0 });
        const b = boton({ clase: "opcion-color", etiqueta: nombre, alHacerClic: () => this.#cambiar({ matiz: m.id, intensidad }) });
        b.style.setProperty("--muestra", hexDeOpcion({ matiz: m.id, intensidad }));
        b.dataset.opcion = `${m.id}-${intensidad}`;
        this.#grilla.append(b);
      }
    }
  }

  #pintar(): void {
    const { paleta } = this.#d.editor.estado;
    const atajos = this.#d.atajos();
    this.#ranuras.replaceChildren(
      ...RANURAS.map((r) => {
        const tecla = atajos.teclaDe(`color:${r}`).toUpperCase();
        const b = boton({
          clase: "muestra",
          etiqueta: `Tecla ${tecla}: ${nombreDeOpcion(paleta.opcion(r))}`,
          alHacerClic: () => this.#d.editor.ejecutar(`color:${r}`),
        });
        b.style.setProperty("--muestra", cssDe(paleta.tinta(r)));
        b.setAttribute("aria-pressed", String(r === this.#ranura));
        b.append(Object.assign(document.createElement("kbd"), { textContent: tecla }));
        return b;
      }),
    );
    const opcion = this.#opcion;
    for (const b of this.#grilla.querySelectorAll<HTMLElement>(".opcion-color")) {
      b.setAttribute("aria-pressed", String(b.dataset.opcion === `${opcion.matiz}-${opcion.intensidad}`));
    }
    for (const b of this.#transparencias.querySelectorAll<HTMLElement>("button")) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.transparencia) === opcion.transparencia));
    }
    this.#elegido.textContent = `Tecla ${atajos.teclaDe(`color:${this.#ranura}`).toUpperCase()}: ${nombreDeOpcion(opcion)}`;
    this.#muestra.style.setProperty("--tinta", cssDe(paleta.tinta(this.#ranura)));
  }
}
