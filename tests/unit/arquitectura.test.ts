import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Pruebas de arquitectura (base de conocimiento, 02-arquitectura/04 §3 y L-101, L-130).
 * Capas: dominio ← aplicacion ← presentacion; infraestructura → aplicacion (puertos) y dominio; main.ts compone todo.
 */
const RAIZ = resolve(import.meta.dirname, "../../src");

interface Modulo {
  readonly ruta: string; // relativa a src, con "/"
  readonly capa: string;
  readonly importaciones: readonly string[]; // rutas relativas a src (internas) o nombre de paquete
  readonly importacionesDinamicas: number;
  readonly clases: number;
}

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(carpeta, e.name)) : e.name.endsWith(".ts") ? [join(carpeta, e.name)] : [],
  );
}

function resolverInterna(desde: string, especificador: string): string {
  const absoluta = resolve(dirname(desde), especificador);
  return relative(RAIZ, absoluta).replaceAll("\\", "/").replace(/\.ts$/, "") + ".ts";
}

function analizar(archivo: string): Modulo {
  const fuente = ts.createSourceFile(archivo, readFileSync(archivo, "utf8"), ts.ScriptTarget.Latest, true);
  const importaciones: string[] = [];
  let importacionesDinamicas = 0;
  let clases = 0;
  const visitar = (nodo: ts.Node): void => {
    if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier) {
      const texto = (nodo.moduleSpecifier as ts.StringLiteral).text;
      importaciones.push(texto.startsWith(".") ? resolverInterna(archivo, texto) : texto);
    }
    if (ts.isCallExpression(nodo) && nodo.expression.kind === ts.SyntaxKind.ImportKeyword) importacionesDinamicas++;
    if (ts.isClassDeclaration(nodo)) clases++;
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  const ruta = relative(RAIZ, archivo).replaceAll("\\", "/");
  return { ruta, capa: ruta.includes("/") ? (ruta.split("/")[0] as string) : ruta, importaciones, importacionesDinamicas, clases };
}

const modulos = archivos(RAIZ).map(analizar);
const capaDe = (ruta: string) => (ruta.includes("/") ? ruta.split("/")[0] : ruta);
const internas = (m: Modulo) => m.importaciones.filter((i) => i.endsWith(".ts"));
const paquetes = (m: Modulo) => m.importaciones.filter((i) => !i.endsWith(".ts"));

/** Qué capas puede importar cada capa (además de sí misma). */
const PERMITIDAS: Record<string, readonly string[]> = {
  dominio: [],
  aplicacion: ["dominio"],
  // Los adaptadores implementan los puertos de aplicacion/puertos.ts.
  infraestructura: ["dominio", "aplicacion"],
  presentacion: ["dominio", "aplicacion"],
};

describe("arquitectura", () => {
  it("encuentra los módulos (la prueba no pasa en vacío)", () => {
    for (const capa of Object.keys(PERMITIDAS)) expect(modulos.some((m) => m.capa === capa), capa).toBe(true);
  });

  it("cada capa importa solo las capas permitidas", () => {
    const violaciones = modulos.flatMap((m) => {
      const permitidas = PERMITIDAS[m.capa];
      if (permitidas === undefined) return []; // main.ts: raíz de composición
      return internas(m)
        .filter((i) => capaDe(i) !== m.capa && !permitidas.includes(capaDe(i) as string))
        .map((i) => `${m.ruta} → ${i}`);
    });
    expect(violaciones).toEqual([]);
  });

  it("el dominio y la aplicación no usan paquetes externos (ni pdf.js, ni pdf-lib, ni el DOM de terceros)", () => {
    const violaciones = modulos
      .filter((m) => m.capa === "dominio" || m.capa === "aplicacion")
      .flatMap((m) => paquetes(m).map((p) => `${m.ruta} → ${p}`));
    expect(violaciones).toEqual([]);
  });

  it("solo la infraestructura usa pdf.js y pdf-lib", () => {
    const violaciones = modulos
      .filter((m) => m.capa !== "infraestructura")
      .flatMap((m) => paquetes(m).filter((p) => /^(pdfjs-dist|pdf-lib)/.test(p)).map((p) => `${m.ruta} → ${p}`));
    expect(violaciones).toEqual([]);
  });

  it("sin importaciones dinámicas escondidas (L-130)", () => {
    expect(modulos.filter((m) => m.importacionesDinamicas > 0).map((m) => m.ruta)).toEqual([]);
  });

  it("una clase por archivo", () => {
    expect(modulos.filter((m) => m.clases > 1).map((m) => m.ruta)).toEqual([]);
  });

  it("sin ciclos de dependencias entre archivos", () => {
    const grafo = new Map(modulos.map((m) => [m.ruta, internas(m)]));
    const ciclos: string[] = [];
    const estado = new Map<string, "visitando" | "listo">();
    const recorrer = (nodo: string, camino: string[]): void => {
      if (estado.get(nodo) === "listo") return;
      if (estado.get(nodo) === "visitando") {
        ciclos.push([...camino.slice(camino.indexOf(nodo)), nodo].join(" → "));
        return;
      }
      estado.set(nodo, "visitando");
      for (const siguiente of grafo.get(nodo) ?? []) recorrer(siguiente, [...camino, nodo]);
      estado.set(nodo, "listo");
    };
    for (const nodo of grafo.keys()) recorrer(nodo, []);
    expect(ciclos).toEqual([]);
  });
});
