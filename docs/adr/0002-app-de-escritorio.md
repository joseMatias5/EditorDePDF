# ADR 0002 — App de escritorio con Electron para guardar en el mismo archivo

- **Estado:** aceptada · **Fecha:** 2026-11-24 · **Enmienda** a ADR 0001 (que descartaba Electron)

## Contexto
El usuario pidió que «Guardar» escriba sobre el mismo PDF, como Edge, sin llevarlo a otra página. Su único navegador es
**Firefox**, que no tiene File System Access: una página web no puede sobrescribir un archivo. La app caía a «descargar»
y Firefox abría la descarga en su visor de PDF (eso era la «otra página»).

## Decisión (elegida por el usuario entre tres opciones)
Ventana propia con **Electron 45**, misma interfaz y mismo código (`src/`):
- `escritorio/main.mjs` sirve `dist/` por un protocolo propio `app://editor` (con `file://` los módulos de Vite fallan por CORS, comprobado), con CSP.
- Abrir con el diálogo nativo; **Guardar sobrescribe** el archivo con escritura atómica (temporal en la misma carpeta + `fsync` + `rename`, conservando permisos). Un PDF arrastrado a la ventana también se guarda en su lugar.
- La página recibe solo un **identificador** del archivo elegido, nunca rutas: aunque se inyectara código, no puede escribir archivos que la persona no abrió. `contextIsolation` + `sandbox`, sin Node en la página, IPC con remitente validado, navegación y ventanas nuevas bloqueadas.
- Cerrar con cambios sin guardar pregunta (en Electron, `beforeunload` bloquea el cierre en silencio si no se maneja `will-prevent-unload`).
- En `src/`, `main.ts` elige el adaptador: `infraestructura/escritorio/` si existe el puente, si no el del navegador.

## Alternativas descartadas
- **Servidor local + Firefox:** más piezas expuestas (un servidor que escribe en disco necesita origen, CSRF y límites de rutas).
- **Instalar Edge/Chrome:** sin código, pero cambia el navegador del usuario.

## Consecuencias
- `npm start` compila y abre la ventana. `node_modules` suma ~250 MB (binario de Electron). No hay instalador todavía.
- La versión web sigue funcionando; en Firefox, Guardar ahora **descarga** (tipo `application/octet-stream`) sin abrir el visor.
- Pruebas: `npm run test:escritorio` (Playwright + Electron; abre ventanas reales por un momento).
