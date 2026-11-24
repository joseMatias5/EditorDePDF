const DURACION_INFO_MS = 4000;

/**
 * Mensajes al pie de la barra. Un error queda visible hasta que la persona lo cierra o una acción
 * nueva suya sale bien (L-069): un redibujado de fondo nunca lo borra.
 */
export class Avisos {
  readonly #info: HTMLElement;
  readonly #error: HTMLElement;
  #temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor(contenedor: HTMLElement) {
    this.#info = Object.assign(document.createElement("p"), { className: "aviso aviso-info", hidden: true });
    this.#info.setAttribute("role", "status");
    this.#error = Object.assign(document.createElement("div"), { className: "aviso aviso-error", hidden: true });
    this.#error.setAttribute("role", "alert");
    contenedor.replaceChildren(this.#info, this.#error);
  }

  info(mensaje: string): void {
    clearTimeout(this.#temporizador);
    this.#info.textContent = mensaje;
    this.#info.hidden = false;
    this.#temporizador = setTimeout(() => (this.#info.hidden = true), DURACION_INFO_MS);
  }

  error(mensaje: string): void {
    const texto = Object.assign(document.createElement("span"), { textContent: mensaje });
    const cerrar = Object.assign(document.createElement("button"), { type: "button", className: "boton boton-chico", textContent: "Cerrar" });
    cerrar.addEventListener("click", () => this.limpiarError());
    this.#error.replaceChildren(texto, cerrar);
    this.#error.hidden = false;
  }

  limpiarError(): void {
    this.#error.hidden = true;
    this.#error.replaceChildren();
  }
}
