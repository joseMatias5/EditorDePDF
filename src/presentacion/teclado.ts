import type { Editor } from "../aplicacion/editor";
import type { MapaDeAtajos } from "../dominio/atajos";

/** Mientras se escribe, las teclas son texto, no atajos. */
function esCampoDeEscritura(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof HTMLElement)) return false;
  return objetivo.isContentEditable || objetivo.matches("input, textarea, select");
}

/**
 * Atajos globales sin modificadores: la tecla sola (1–6, Z, Y…). Con Ctrl/Cmd/Alt no se toca nada,
 * así Ctrl+C, Ctrl+P o los atajos del navegador siguen funcionando.
 */
export function conectarTeclado(deps: { editor: Editor; atajos: () => MapaDeAtajos; pausado: () => boolean }): void {
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (deps.pausado() || esCampoDeEscritura(e.target)) return;
    const accion = deps.atajos().accionPara(e.key);
    if (accion === null) return;
    e.preventDefault();
    deps.editor.ejecutar(accion);
  });
}
