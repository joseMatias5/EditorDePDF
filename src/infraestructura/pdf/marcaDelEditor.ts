/**
 * Cómo se reconocen las anotaciones escritas por este editor dentro de un PDF.
 * Los visores ignoran las claves que no conocen; al reabrir el archivo, esta clave permite
 * recuperar la anotación exacta (y volver a borrarla o editarla) sin adivinar desde el dibujo.
 */
export const CLAVE_DATOS = "EditorPdfDatos";
export const PREFIJO_NOMBRE = "editorpdf-";
export const AUTOR = "Editor PDF";
