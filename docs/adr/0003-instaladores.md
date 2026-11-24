# ADR 0003 — Instaladores para Windows, Linux y Mac con electron-builder y GitHub Actions

- **Estado:** aceptada · **Fecha:** 2026-11-24

## Contexto
El usuario pidió instaladores para Windows, Linux y Mac. Desde Linux solo se puede armar el de Linux: Windows (NSIS)
necesita Wine, que no está instalado, y Apple solo permite armar y firmar apps de Mac en una Mac.

## Decisión
- **electron-builder 26** (`electron-builder.yml`): Windows `.exe` (NSIS, en español, elige carpeta, accesos directos),
  Linux `.AppImage` y `.deb`, Mac `.dmg` para Intel (x64) y Apple Silicon (arm64). Ícono único `build/icon.png`
  (generado de `build/icono.svg` con `scripts/generar-icono.mjs`).
- **Cada sistema se arma en su sistema**, en GitHub Actions (`.github/workflows/instaladores.yml`). En cada uno, antes
  de subir el instalador: `npm run verificar` y **las e2e de escritorio contra la app ya empaquetada**
  (`EDITOR_PDF_EJECUTABLE`, `scripts/ejecutable-empaquetado.mjs`). Con una etiqueta `v*` se publica una Release.
- `pdf-lib` y `pdfjs-dist` pasan a `devDependencies`: Vite ya los mete en `dist/`; como dependencias, electron-builder
  los copiaría otra vez dentro del instalador (~40 MB de más).
- **Sin certificados de firma** (cuestan dinero y trámites): Windows muestra SmartScreen la primera vez; Mac usa firma
  ad-hoc (`identity: "-"`, sin hardened runtime), suficiente para que arranque en Apple Silicon, pero Gatekeeper pide
  confirmar la primera apertura. Instrucciones en el README.

## Consecuencias
- Linux se armó y probó localmente (Mint 22.3): 6/6 e2e contra `release/linux-unpacked`, 72 de 72 en 3 rondas repetidas.
  Hubo 2 fallas en una corrida anterior 4× más lenta (equipo recién salido de compilar) que no se reprodujeron con el
  diagnóstico activo; el diagnóstico (captura + estado de la selección) quedó en la prueba.
- Windows y Mac se verifican en CI; no se probaron a mano en un equipo real.
- AppImage en Ubuntu 24.04+ puede no arrancar por la restricción de AppArmor al sandbox de Chromium; el `.deb` instala
  el ayudante del sandbox con los permisos correctos. En Mint 22.3 el AppImage funciona.
- Para una versión nueva: subir `version` en `package.json`, commit, `git tag vX.Y.Z && git push --tags`.
