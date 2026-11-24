# ADR 0001 — Web local con TypeScript, pdf.js y pdf-lib

- **Estado:** aceptada · **Fecha:** 2026-11-24

## Contexto
Editor de anotaciones para una sola persona, sin red, en Linux (y que también sirva en Windows). Hace falta: mostrar el PDF
con texto seleccionable, dibujar encima y guardar anotaciones PDF estándar.

## Decisión
- **Navegador + Vite + TypeScript estricto.** Sin backend: no hay datos compartidos, cuentas ni concurrencia. Elegido por el usuario frente a Electron.
- **pdf.js 6** para dibujar páginas y la capa de texto (la misma que usa Firefox).
- **pdf-lib 1.17** para escribir y leer anotaciones (API de bajo nivel: diccionarios `/Annot` y apariencias `/AP`).
- **Sin base de datos.** Lo único persistente son los atajos (`localStorage`).

## Alternativas descartadas
- **Electron:** ventana propia, pero ~150 MB y empaquetado por sistema. Se puede agregar después sin tocar dominio ni aplicación.
- **Editor de anotaciones de pdf.js** (`AnnotationEditorLayer`): trae resaltado y tinta, pero sus atajos, colores e historial son internos; cambiar teclas y deshacer era justamente el requisito.
- **Aplanar las marcas en la página:** dejaría de ser editable en Edge/Acrobat (el usuario eligió anotaciones estándar).

## Enmienda (2026-11-24)
Se agregó la app de escritorio con Electron para poder guardar en el mismo archivo desde Firefox (sin File System
Access). La web sigue igual. Ver ADR 0002.

## Consecuencias
- El bundle pesa ~0,9 MB + 1,3 MB del worker de pdf.js; aceptable en local.
- pdf.js necesita recursos en tiempo de ejecución (cmaps, fuentes estándar, wasm): `scripts/copiar-recursos-pdfjs.mjs` los copia a `public/pdfjs/` en `dev` y `build`.
- Guardar sobre el mismo archivo depende de File System Access (Chrome/Edge). En Firefox se descarga.
