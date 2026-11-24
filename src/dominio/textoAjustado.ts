export interface OpcionesDeAjuste {
  readonly anchoMaximo: number;
  /** Ancho que ocupa un texto con la letra y tamaño elegidos. */
  readonly medir: (texto: string) => number;
}

function cortarPalabraLarga(palabra: string, opciones: OpcionesDeAjuste): string[] {
  const trozos: string[] = [];
  let trozo = "";
  for (const caracter of palabra) {
    if (trozo !== "" && opciones.medir(trozo + caracter) > opciones.anchoMaximo) {
      trozos.push(trozo);
      trozo = "";
    }
    trozo += caracter;
  }
  if (trozo !== "") trozos.push(trozo);
  return trozos;
}

function ajustarParrafo(parrafo: string, opciones: OpcionesDeAjuste): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of parrafo.split(" ")) {
    const candidata = actual === "" ? palabra : `${actual} ${palabra}`;
    if (opciones.medir(candidata) <= opciones.anchoMaximo) {
      actual = candidata;
      continue;
    }
    if (actual !== "") lineas.push(actual);
    const trozos = cortarPalabraLarga(palabra, opciones);
    actual = trozos.pop() ?? "";
    lineas.push(...trozos);
  }
  lineas.push(actual);
  return lineas;
}

/** Parte un texto en líneas que entran en el ancho dado; respeta los saltos de línea escritos. */
export function ajustarLineas(texto: string, opciones: OpcionesDeAjuste): string[] {
  return texto.split("\n").flatMap((parrafo) => ajustarParrafo(parrafo, opciones));
}
