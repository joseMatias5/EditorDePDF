import type { AlmacenDePreferencias, Preferencia } from "../../aplicacion/puertos";

const clave = (preferencia: Preferencia) => `editor-pdf:${preferencia}`;

/** localStorage puede estar bloqueado (modo privado, políticas): entonces las preferencias duran solo la sesión. */
export const almacenLocal: AlmacenDePreferencias = {
  leer(preferencia) {
    try {
      return localStorage.getItem(clave(preferencia));
    } catch {
      return null;
    }
  },
  escribir(preferencia, json) {
    try {
      localStorage.setItem(clave(preferencia), json);
    } catch (e) {
      console.warn(`No se pudo guardar «${preferencia}» en este navegador`, e);
    }
  },
};
