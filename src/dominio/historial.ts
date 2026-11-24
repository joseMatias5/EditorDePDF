/**
 * Historial de estados inmutables para deshacer y rehacer.
 * Guarda instantáneas (no comandos): con estados inmutables es lo más simple y no puede quedar a medias.
 */
export class Historial<T> {
  #pasados: T[] = [];
  #futuros: T[] = [];
  #actual: T;
  readonly #limite: number;

  constructor(inicial: T, opciones: { limite?: number } = {}) {
    const limite = opciones.limite ?? 500;
    if (!Number.isInteger(limite) || limite < 1) throw new RangeError("El límite del historial debe ser un entero ≥ 1");
    this.#actual = inicial;
    this.#limite = limite;
  }

  get actual(): T {
    return this.#actual;
  }

  get puedeDeshacer(): boolean {
    return this.#pasados.length > 0;
  }

  get puedeRehacer(): boolean {
    return this.#futuros.length > 0;
  }

  aplicar(nuevo: T): void {
    this.#pasados.push(this.#actual);
    if (this.#pasados.length > this.#limite) this.#pasados.shift();
    this.#actual = nuevo;
    this.#futuros = [];
  }

  deshacer(): boolean {
    const anterior = this.#pasados.pop();
    if (anterior === undefined) return false;
    this.#futuros.push(this.#actual);
    this.#actual = anterior;
    return true;
  }

  rehacer(): boolean {
    const siguiente = this.#futuros.pop();
    if (siguiente === undefined) return false;
    this.#pasados.push(this.#actual);
    this.#actual = siguiente;
    return true;
  }

  reiniciar(estado: T): void {
    this.#pasados = [];
    this.#futuros = [];
    this.#actual = estado;
  }
}
