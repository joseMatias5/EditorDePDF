# Deuda técnica

Hallazgos de la revisión de responsabilidades (base: `02-arquitectura/04-revision-de-responsabilidades.md`) que no se corrigieron, con motivo y fecha de revisión. «No corregir» lo decide el dueño del producto.

| Fecha | Dónde | Señal | Motivo para no corregir hoy | Revisar |
|---|---|---|---|---|
| — | — | — | Sin deuda abierta | — |

## Saldada

| Registrada | Saldada | Qué | Cómo |
|---|---|---|---|
| 2026-11-24 | 2026-11-24 | `Editor` mezclaba preferencias de la «pluma» (herramienta, color, grosor, letra) con las operaciones sobre anotaciones (señal 1) | Al agregar la paleta de colores (la «próxima preferencia» que fijaba el registro) se extrajo `dominio/pluma.ts` (objeto de valor inmutable, 4 pruebas). `Editor` solo delega |
| 2026-11-24 | 2026-11-24 | `iniciarInterfaz` mezclaba entrada de archivos, guardar y refresco | Extraído a `presentacion/entradaDeArchivos.ts` |
| 2026-11-24 | 2026-11-24 | `ErrorDeDocumento` compartía archivo con `SesionDeDocumento` | Separado (lo detectó la prueba de arquitectura) |
