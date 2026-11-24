/** Íconos de trazo propio (24×24, currentColor). Decorativos: el botón lleva su nombre en texto. */
const trazo = (contenido: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;

export const ICONOS = {
  seleccionar: trazo('<path d="M5 3l14 8-6 1.5L10 19z"/>'),
  resaltar: trazo('<path d="M14 4l6 6-8 8H6v-6z"/><path d="M3 21h9"/>'),
  subrayar: trazo('<path d="M7 4v6a5 5 0 0 0 10 0V4"/><path d="M5 20h14"/>'),
  dibujar: trazo('<path d="M4 20c4-1 5-4 8-8s6-7 8-8"/><path d="M4 20l1.5-4"/>'),
  texto: trazo('<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>'),
  borrar: trazo('<path d="M8 20h12"/><path d="M5 15l9-9 5 5-8 9H9z"/>'),
  deshacer: trazo('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  rehacer: trazo('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  abrir: trazo('<path d="M3 7h6l2 2h10v10H3z"/>'),
  guardar: trazo('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>'),
  paleta: trazo('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><path d="M7.5 11h.01M9.5 7h.01M14.5 7h.01"/>'),
  teclado: trazo('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
} as const;
