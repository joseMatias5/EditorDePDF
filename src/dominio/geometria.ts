/**
 * Geometría en coordenadas del PDF: puntos tipográficos, origen abajo a la izquierda, y crece hacia arriba.
 * Un Rect tiene (x, y) en su esquina inferior izquierda.
 */
export interface Punto {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly alto: number;
}

/** Fracción de la altura que dos rectángulos deben compartir para considerarse de la misma línea. */
const SOLAPE_MINIMO_DE_LINEA = 0.5;
/** Separación horizontal máxima, en alturas de línea, para unir dos tramos (un espacio entre palabras). */
const HUECO_MAXIMO_EN_ALTURAS = 1;

export function rectDesdeEsquinas(a: Punto, b: Punto): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), ancho: Math.abs(a.x - b.x), alto: Math.abs(a.y - b.y) };
}

/** Igualdad con tolerancia de 0,01 pt: la pantalla convierte ida y vuelta y deja decimales. */
export function mismoRect(a: Rect, b: Rect): boolean {
  const cerca = (u: number, v: number) => Math.abs(u - v) < 0.01;
  return cerca(a.x, b.x) && cerca(a.y, b.y) && cerca(a.ancho, b.ancho) && cerca(a.alto, b.alto);
}

export function tieneArea(r: Rect): boolean {
  return r.ancho > 0 && r.alto > 0;
}

export function contiene(r: Rect, p: Punto): boolean {
  return p.x >= r.x && p.x <= r.x + r.ancho && p.y >= r.y && p.y <= r.y + r.alto;
}

export function agrandar(r: Rect, margen: number): Rect {
  return { x: r.x - margen, y: r.y - margen, ancho: r.ancho + 2 * margen, alto: r.alto + 2 * margen };
}

export function rectQueAbarca(rects: readonly Rect[]): Rect {
  const izquierda = Math.min(...rects.map((r) => r.x));
  const abajo = Math.min(...rects.map((r) => r.y));
  const derecha = Math.max(...rects.map((r) => r.x + r.ancho));
  const arriba = Math.max(...rects.map((r) => r.y + r.alto));
  return { x: izquierda, y: abajo, ancho: derecha - izquierda, alto: arriba - abajo };
}

function mismaLinea(a: Rect, b: Rect): boolean {
  const solape = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y);
  return solape >= SOLAPE_MINIMO_DE_LINEA * Math.min(a.alto, b.alto);
}

function contiguos(a: Rect, b: Rect): boolean {
  const hueco = Math.max(a.x, b.x) - Math.min(a.x + a.ancho, b.x + b.ancho);
  return hueco <= HUECO_MAXIMO_EN_ALTURAS * Math.max(a.alto, b.alto);
}

/**
 * La selección del navegador devuelve un rectángulo por tramo de texto; aquí se unen los de cada línea
 * para que el resaltado sea una banda continua. Resultado ordenado de arriba hacia abajo y de izquierda a derecha.
 */
export function unirRectangulosPorLinea(rects: readonly Rect[]): Rect[] {
  const ordenados = rects.filter(tieneArea).toSorted((a, b) => b.y + b.alto - (a.y + a.alto) || a.x - b.x);
  const unidos: Rect[] = [];
  for (const rect of ordenados) {
    const indice = unidos.findIndex((u) => mismaLinea(u, rect) && contiguos(u, rect));
    if (indice === -1) unidos.push(rect);
    else unidos[indice] = rectQueAbarca([unidos[indice] as Rect, rect]);
  }
  return unidos.toSorted((a, b) => b.y + b.alto - (a.y + a.alto) || a.x - b.x);
}

function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distanciaAPoligonal(p: Punto, puntos: readonly Punto[]): number {
  if (puntos.length === 1) return Math.hypot(p.x - (puntos[0] as Punto).x, p.y - (puntos[0] as Punto).y);
  let minima = Number.POSITIVE_INFINITY;
  for (let i = 1; i < puntos.length; i++) {
    minima = Math.min(minima, distanciaASegmento(p, puntos[i - 1] as Punto, puntos[i] as Punto));
  }
  return minima;
}
