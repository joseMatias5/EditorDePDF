/** Raíz de composición: el único lugar que conoce a la vez la aplicación y los adaptadores concretos. */
import "./estilos/tokens.css";
import "./estilos/app.css";
import { Editor } from "./aplicacion/editor";
import { SesionDeDocumento } from "./aplicacion/sesionDeDocumento";
import { Paleta } from "./dominio/paleta";
import { archivosDeEscritorio, puenteDeEscritorio } from "./infraestructura/escritorio/archivosDeEscritorio";
import { almacenLocal } from "./infraestructura/navegador/almacenLocal";
import {
  archivoDesdeFile,
  elegirConSelectorDelSistema,
  guardadorDelNavegador,
} from "./infraestructura/navegador/archivosDelNavegador";
import { procesadorPdfLib } from "./infraestructura/pdf/procesadorPdfLib";
import { visorPdfJs } from "./infraestructura/pdfjs/visorPdfJs";
import { iniciarInterfaz } from "./presentacion/interfaz";

/** En la app de escritorio (Electron) se lee y escribe el archivo en disco; en el navegador, con lo que permita. */
const puente = puenteDeEscritorio();
const archivos = puente
  ? archivosDeEscritorio(puente)
  : { elegirArchivo: elegirConSelectorDelSistema, desdeFile: archivoDesdeFile, guardador: guardadorDelNavegador };

const editor = new Editor({
  generarId: () => crypto.randomUUID(),
  paleta: Paleta.desdeJson(almacenLocal.leer("paleta") ?? "{}"),
});
const sesion = new SesionDeDocumento({
  editor,
  procesador: procesadorPdfLib,
  visor: visorPdfJs,
  guardador: archivos.guardador,
});

iniciarInterfaz({
  editor,
  sesion,
  almacen: almacenLocal,
  elegirArchivo: archivos.elegirArchivo,
  desdeFile: (archivo) => archivos.desdeFile(archivo),
});
