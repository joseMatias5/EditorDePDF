# Editor PDF

Resaltá, subrayá, dibujá y escribí sobre un PDF, como en Microsoft Edge, con los seis colores de Edge
(amarillo, verde, azul, rosa, rojo, naranja) y **todo en teclas que podés reasignar**, sin Ctrl.
Funciona sin internet: el PDF nunca sale de tu equipo.

**Recomendado: la app de escritorio** (`npm start`). «Guardar» escribe sobre el mismo PDF, como en Edge, sin abrir nada más.
También corre en el navegador (`npm run dev`), pero ahí depende de lo que permita cada navegador (ver «Guardar»).

## Teclas por defecto

| Tecla | Acción | Tecla | Acción |
|---|---|---|---|
| `1` … `6` | Colores 1 a 6 (por defecto amarillo, verde, azul, rosa, rojo, naranja; se cambian en «Colores») | `H` | Resaltar (seleccionando texto) |
| `Z` | Deshacer | `U` | Subrayar |
| `Y` | Rehacer | `D` | Dibujar |
| `V` | Seleccionar (sin anotar, para copiar texto) | `T` | Cuadro de texto |
| | | `B` | Borrador |

- Se cambian con el botón **Teclas** → «Cambiar» → presionar la tecla nueva. Si ya era de otra acción, se intercambian (te avisa). Quedan guardadas en el navegador.
- No funcionan con Ctrl/Alt apretados (así Ctrl+C, Ctrl+P siguen siendo del navegador) ni mientras escribís en un cuadro de texto. **Esc** o un clic afuera confirman el cuadro.
- En páginas escaneadas (sin texto), Resaltar y Subrayar se hacen arrastrando un rectángulo.

## Elegir colores

Botón **Colores** (o doble clic sobre un color de la barra):

1. **Tecla:** cuál de los seis colores cambiás (1–6).
2. **Color e intensidad:** una grilla de opciones con nombre: amarillo, verde, azul, rosa, rojo, naranja, violeta, celeste, marrón, gris y negro, cada uno en claro, normal o intenso.
3. **Transparencia:** opaco, 20 %, 40 %, 60 % u 80 %. Abajo se ve una muestra de cómo queda el resaltado y el trazo.

Se aplica al instante a lo próximo que anotes; **lo que ya dibujaste conserva su color**. Queda guardado en el navegador.
«Restablecer esta tecla» o «Restablecer todas» vuelven a los colores de Edge.

## Guardar

Las marcas se guardan como **anotaciones PDF estándar**: se ven en Edge, Acrobat, Firefox o Chrome, y ahí se pueden mover o borrar.
Si volvés a abrir el archivo en esta app, tus marcas vuelven a ser editables (borrar, deshacer).

- **App de escritorio:** «Guardar» sobrescribe el mismo archivo, cada vez, sin preguntar (también si lo arrastraste a la ventana). Se escribe primero en un temporal y después se reemplaza, así un corte no deja el PDF roto. Si cerrás con cambios sin guardar, pregunta.
- **Chrome / Edge (web):** si abriste con «Abrir PDF», «Guardar» sobrescribe el mismo archivo (el navegador pide permiso la primera vez).
- **Firefox (web):** no permite que una página escriba en tus archivos: «Guardar» lo **descarga** con el mismo nombre (a Descargas), sin abrir el visor de PDF.

## Puesta en marcha

Requisitos: Node 22.13 o la LTS vigente (probado con Node 26.13 en Linux Mint 22.3).

```bash
npm install
npm start            # app de escritorio (compila y abre la ventana)
npm run dev          # versión web en http://localhost:5173
```

Para la versión web sin la terminal de desarrollo: `npm run build` y servir la carpeta `dist/` con cualquier servidor estático
(`npm run preview` → http://localhost:4173). Abrir `dist/index.html` con doble clic **no** funciona: en `file://` el navegador bloquea los scripts de módulo y el CSS por CORS (comprobado en Chromium, la pantalla queda sin barra).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run verificar` | Tipos + ESLint + pruebas unitarias + build |
| `npm test` | Pruebas unitarias y de arquitectura (Vitest) |
| `npm run test:e2e` | Punta a punta en Chromium, escritorio y móvil (hace build antes). Primera vez: `npx playwright install chromium` |
| `npm run test:escritorio` | Punta a punta de la app de escritorio (Electron): guardar en el mismo archivo, seguridad, cierre. Abre ventanas un momento |

## Estructura

```
src/dominio/          colores y paleta, pluma, anotaciones, geometría, historial, atajos (sin dependencias)
src/aplicacion/       Editor (anotaciones y deshacer), SesionDeDocumento (abrir/guardar), puertos
src/infraestructura/  pdf.js (mostrar), pdf-lib (escribir/leer anotaciones), navegador y escritorio (archivos), localStorage
src/presentacion/     barra, páginas, puntero, selección de texto, teclado, ventanas de teclas y colores
src/main.ts           composición (elige escritorio o navegador)
escritorio/           proceso principal de Electron: ventana, diálogos nativos, escritura atómica en disco
docs/                 decisiones, ADR, deuda técnica, lecciones
```

## Limitaciones conocidas

- Las marcas propias no se pueden **mover** ni cambiar de color después de creadas (borrar y rehacer).
- Los colores se eligen solo entre las opciones de la grilla (a propósito: no hay selector libre de color).
- En el celular las opciones de color miden unos 20 px, menos que los 44 px recomendados para tocar con el dedo.
- Las anotaciones hechas con otros programas se ven y se conservan al guardar, pero no se editan aquí.
- Si movés en Edge una marca hecha con esta app y la reabrís aquí, vuelve a su posición original (se usan los datos propios guardados).
- Texto de cuadros: Helvetica estándar del PDF; los emojis se guardan en el contenido pero se dibujan como «?».
- En páginas rotadas, los cuadros de texto no se rotan.
- La app de escritorio se probó en Linux (Mint 22.3, X11). No hay instalador (`.deb`/`.exe`) todavía: se abre con `npm start`.
- Las e2e web corren en Chromium. En Firefox no hay pruebas automáticas; el guardado sobre el mismo archivo en Chrome/Edge (File System Access) se probó solo por código.
