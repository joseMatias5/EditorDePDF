import { ACCIONES, MapaDeAtajos, NOMBRE_DE_ACCION, normalizarTecla, type Accion } from "../dominio/atajos";

interface Dependencias {
  readonly atajos: () => MapaDeAtajos;
  readonly cambiar: (mapa: MapaDeAtajos) => void;
}

const mostrarTecla = (t: string) => t.toUpperCase();

/** Ventana para reasignar teclas. Si la tecla elegida ya era de otra acción, se intercambian y se avisa. */
export class DialogoDeAtajos {
  readonly #dialogo: HTMLDialogElement;
  readonly #d: Dependencias;
  readonly #cuerpo = document.createElement("tbody");
  readonly #mensaje = document.createElement("p");
  #esperando: Accion | null = null;

  constructor(dialogo: HTMLDialogElement, dependencias: Dependencias) {
    this.#dialogo = dialogo;
    this.#d = dependencias;
    this.#armar();
    dialogo.addEventListener("keydown", (e) => this.#alPresionar(e), { capture: true });
    // Esc mientras se espera una tecla cancela la espera, no cierra la ventana.
    dialogo.addEventListener("cancel", (e) => {
      if (this.#esperando === null) return;
      e.preventDefault();
      this.#esperar(null, "Cambio cancelado.");
    });
    dialogo.addEventListener("close", () => this.#esperar(null, ""));
  }

  get abierto(): boolean {
    return this.#dialogo.open;
  }

  abrir(): void {
    this.#pintar();
    this.#dialogo.showModal();
  }

  #armar(): void {
    const titulo = Object.assign(document.createElement("h2"), { id: "titulo-atajos", textContent: "Teclas" });
    const ayuda = Object.assign(document.createElement("p"), {
      className: "ayuda",
      textContent: "Elegí «Cambiar» y presioná la tecla nueva. Funcionan sin Ctrl y no se activan mientras escribís en un cuadro de texto.",
    });
    const tabla = document.createElement("table");
    tabla.innerHTML = '<thead><tr><th scope="col">Acción</th><th scope="col">Tecla</th><th scope="col"><span class="solo-lector">Cambiar</span></th></tr></thead>';
    tabla.append(this.#cuerpo);
    this.#mensaje.className = "mensaje-atajos";
    this.#mensaje.setAttribute("role", "status");
    const pie = document.createElement("div");
    pie.className = "pie-dialogo";
    const restablecer = Object.assign(document.createElement("button"), { type: "button", className: "boton", textContent: "Restablecer teclas" });
    restablecer.addEventListener("click", () => {
      this.#d.cambiar(MapaDeAtajos.porDefecto());
      this.#esperar(null, "Se restablecieron las teclas por defecto.");
    });
    const cerrar = Object.assign(document.createElement("button"), { type: "button", className: "boton", textContent: "Cerrar" });
    cerrar.addEventListener("click", () => this.#dialogo.close());
    pie.append(restablecer, cerrar);
    this.#dialogo.setAttribute("aria-labelledby", titulo.id);
    this.#dialogo.replaceChildren(titulo, ayuda, tabla, this.#mensaje, pie);
  }

  #pintar(): void {
    const mapa = this.#d.atajos();
    this.#cuerpo.replaceChildren(
      ...ACCIONES.map((accion) => {
        const fila = document.createElement("tr");
        const esperando = this.#esperando === accion;
        fila.innerHTML = `<th scope="row"></th><td><kbd></kbd></td><td></td>`;
        (fila.querySelector("th") as HTMLElement).textContent = NOMBRE_DE_ACCION[accion];
        (fila.querySelector("kbd") as HTMLElement).textContent = esperando ? "…" : mostrarTecla(mapa.teclaDe(accion));
        const cambiar = Object.assign(document.createElement("button"), {
          type: "button",
          className: "boton boton-chico",
          textContent: esperando ? "Presioná una tecla" : "Cambiar",
        });
        cambiar.setAttribute("aria-label", `Cambiar la tecla de ${NOMBRE_DE_ACCION[accion]}`);
        cambiar.dataset.accion = accion;
        cambiar.addEventListener("click", () => this.#esperar(accion, `Presioná la tecla para «${NOMBRE_DE_ACCION[accion]}» (Esc cancela).`));
        (fila.lastElementChild as HTMLElement).append(cambiar);
        return fila;
      }),
    );
  }

  #esperar(accion: Accion | null, mensaje: string): void {
    this.#esperando = accion;
    this.#mensaje.textContent = mensaje;
    this.#pintar();
    if (accion !== null) this.#cuerpo.querySelector<HTMLElement>(`[data-accion="${accion}"]`)?.focus();
  }

  #alPresionar(e: KeyboardEvent): void {
    const accion = this.#esperando;
    if (accion === null || e.key === "Escape") return;
    if (e.key === "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (normalizarTecla(e.key) === null) {
      this.#mensaje.textContent = `La tecla «${e.key}» no se puede usar. Probá con una letra, un número o F1–F12.`;
      return;
    }
    const { mapa, intercambiadaCon } = this.#d.atajos().reasignar(accion, e.key);
    this.#d.cambiar(mapa);
    const aviso = `«${NOMBRE_DE_ACCION[accion]}» ahora usa ${mostrarTecla(mapa.teclaDe(accion))}.`;
    const extra = intercambiadaCon ? ` «${NOMBRE_DE_ACCION[intercambiadaCon]}» pasó a ${mostrarTecla(mapa.teclaDe(intercambiadaCon))}.` : "";
    this.#esperar(null, aviso + extra);
  }
}
