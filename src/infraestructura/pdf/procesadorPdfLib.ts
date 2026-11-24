import type { ProcesadorPdf } from "../../aplicacion/puertos";
import { exportarConAnotaciones } from "./escritorDeAnotaciones";
import { separarAnotaciones } from "./lectorDeAnotaciones";

export const procesadorPdfLib: ProcesadorPdf = { separarAnotaciones, exportarConAnotaciones };
