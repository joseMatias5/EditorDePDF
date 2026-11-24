# Decisiones (Fase 0)

Fecha: 2026-11-24. Las preguntas que cambiaban el diseño se hicieron en una tanda (L-055); el resto son valores por defecto anotados.

## Preguntadas al usuario

| Pregunta | Respuesta | Consecuencia |
|---|---|---|
| ¿Dónde corre? | Web local en el navegador | Sin servidor propio ni instalador; Vite sirve archivos estáticos. Ver ADR 0001 |
| ¿Cómo se guarda? | Anotaciones PDF estándar | Highlight, Underline, Ink y FreeText con apariencia propia (`/AP`): se ven y se editan en Edge/Acrobat |
| ¿Cómo se resalta? | Seleccionando texto, como Edge | Capa de texto de pdf.js; en páginas escaneadas (sin texto) se arrastra un rectángulo |
| Teclas por defecto | 1–6 colores, Z deshacer | Y rehacer; H resaltar, U subrayar, D dibujar, T texto, B borrador, V seleccionar. Todas reasignables |

## Colores personalizables (pedido del 2026-11-24)

Pedido: cambiar los colores en tipo e intensidad, y la transparencia, **eligiendo opciones** (sin selector de degradé).

- Las teclas 1–6 son **ranuras**; cada una tiene una opción: color (11: los 6 de Edge + violeta, celeste, marrón, gris, negro) × intensidad (claro, normal, intenso) × transparencia (0, 20, 40, 60, 80 %). La intensidad «normal» de los 6 de Edge es exactamente el color anterior.
- Cada anotación guarda su **tinta** (color + opacidad), no la ranura: cambiar la paleta después no altera lo ya dibujado (como Edge).
- Cambiar colores no es un paso de deshacer. Se guarda en el navegador (`localStorage`, clave `editor-pdf:paleta`); un valor guardado roto vuelve al de fábrica, ranura por ranura.
- En el PDF la opacidad va en `/CA` y en la apariencia (`ca`/`CA` del ExtGState), igual que guarda pdf.js. El resaltado sigue multiplicando.
- Compatibilidad: los atajos guardados como `color:amarillo`… pasan a `color:1`…; los PDF guardados con el color por nombre se reabren con ese color, opaco.
- Acceso: botón «Colores» en la barra o doble clic sobre una muestra. Con la ventana abierta, las teclas no son atajos.

## Guardar en el mismo archivo (pedido del 2026-11-24)

Pedido: «al guardar, que se guarde en el mismo documento y no me redirija», como Edge. Causa: el usuario usa Firefox, sin
File System Access. Preguntado: eligió **app de escritorio** (Electron) entre escritorio, servidor local o instalar Edge/Chrome.
Detalle y seguridad en `docs/adr/0002-app-de-escritorio.md`. En el navegador, Guardar descarga sin abrir el visor.

## Instaladores (pedido del 2026-11-24)

Windows `.exe`, Linux `.AppImage`/`.deb`, Mac `.dmg` (Intel y Apple Silicon), armados cada uno en su sistema en GitHub
Actions y probados ya empaquetados antes de publicarse. Sin firma de pago (avisos de primera apertura en el README).
`CLAUDE.md` y `TESTING.md` quedan solo en el equipo (fuera del repo, en `.gitignore`), a pedido del usuario. Ver ADR 0003.

## Por defecto (no preguntadas)

- **Atajos sin modificadores.** Con Ctrl/Cmd/Alt apretados no se interpreta nada (Ctrl+C, Ctrl+P siguen siendo del navegador). Ctrl+Z **no** deshace, a pedido.
- **Mientras se escribe en un cuadro de texto, las teclas son texto.** Esc o un clic afuera confirman el cuadro.
- **Reasignar a una tecla ocupada intercambia** las dos acciones y lo avisa: nunca hay dos acciones en la misma tecla. Escape, Tab y Enter no se pueden asignar. Se guardan en `localStorage`.
- **Deshacer guarda instantáneas** del estado (inmutable), hasta 500 pasos. Cambiar color o herramienta no es un paso.
- **Reabrir un PDF guardado por la app** recupera sus anotaciones como editables (borrar, deshacer). Se reconocen por la clave `/EditorPdfDatos`; las de otros programas se dejan intactas.
- **Guardar:** en Chrome/Edge, si se abrió con el selector del sistema, sobrescribe el mismo archivo; si no (Firefox, arrastrar), descarga con el mismo nombre.
- **Resaltado = multiplicar** (como un resaltador): el texto sigue legible. Igual en pantalla y en el PDF.
- **Texto:** Helvetica estándar del PDF. Tildes y ñ se ven; caracteres fuera de WinAnsi (emojis) se guardan en el contenido pero se dibujan como «?».
- **Diseño:** tokens «Naranja señal» de la base (`src/estilos/tokens.css`); un acento: la barra de la herramienta activa.
