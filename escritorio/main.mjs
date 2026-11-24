// Proceso principal de la app de escritorio: ventana, diálogos nativos y escritura del PDF en su lugar.
// Seguridad según https://www.electronjs.org/docs/latest/tutorial/security: aislamiento + sandbox, sin Node en
// la página, protocolo propio con CSP, navegación y ventanas nuevas bloqueadas, y validación del remitente IPC.
import { BrowserWindow, app, dialog, ipcMain, protocol } from "electron";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { RegistroDeArchivos, escribirAtomico, leerPdf, validarPdf } from "./archivosEnDisco.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIST = join(AQUI, "..", "dist");
const ORIGEN = "app://editor";
/** Tope de tamaño de lo que la página puede pedir escribir (un PDF muy grande, no un disco lleno). */
const MAXIMO_BYTES = 1024 * 1024 * 1024;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const registro = new RegistroDeArchivos();

/** Sirve dist/ por app://editor/… (file:// bloquea los módulos de Vite por CORS). Nada fuera de dist/. */
async function servir(pedido) {
  const ruta = normalize(join(DIST, decodeURIComponent(new URL(pedido.url).pathname)));
  if (!ruta.startsWith(DIST + sep)) return new Response("Prohibido", { status: 403 });
  try {
    const cuerpo = await readFile(ruta);
    const tipo = TIPOS[extname(ruta).toLowerCase()] ?? "application/octet-stream";
    return new Response(cuerpo, { headers: { "content-type": tipo, "content-security-policy": CSP } });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}

/** Solo la página propia puede pedir abrir o guardar archivos. */
function validarRemitente(evento) {
  const url = evento.senderFrame?.url ?? "";
  if (!url.startsWith(`${ORIGEN}/`)) throw new Error("Pedido de un origen no permitido");
}

function validarBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAXIMO_BYTES) {
    throw new Error("Los datos a guardar no son un PDF válido");
  }
}

function ventanaDe(evento) {
  return BrowserWindow.fromWebContents(evento.sender) ?? undefined;
}

const FILTRO_PDF = [{ name: "PDF", extensions: ["pdf"] }];

function registrarCanales() {
  ipcMain.handle("pdf:abrir", async (evento) => {
    validarRemitente(evento);
    const { canceled, filePaths } = await dialog.showOpenDialog(ventanaDe(evento), {
      title: "Abrir PDF",
      properties: ["openFile"],
      filters: FILTRO_PDF,
    });
    const [ruta] = filePaths;
    if (canceled || ruta === undefined) return null;
    await validarPdf(ruta);
    return { ...(await leerPdf(ruta)), id: registro.registrar(ruta) };
  });

  ipcMain.handle("pdf:registrar", async (evento, ruta) => {
    validarRemitente(evento);
    if (typeof ruta !== "string") throw new Error("Ruta inválida");
    await validarPdf(ruta);
    return registro.registrar(ruta);
  });

  ipcMain.handle("pdf:guardar", async (evento, id, bytes) => {
    validarRemitente(evento);
    validarBytes(bytes);
    await escribirAtomico(registro.ruta(String(id)), bytes);
  });

  ipcMain.handle("pdf:guardar-como", async (evento, nombre, bytes) => {
    validarRemitente(evento);
    validarBytes(bytes);
    const { canceled, filePath } = await dialog.showSaveDialog(ventanaDe(evento), {
      title: "Guardar PDF",
      defaultPath: join(app.getPath("documents"), String(nombre || "documento.pdf")),
      filters: FILTRO_PDF,
    });
    if (canceled || !filePath) return null;
    const ruta = extname(filePath).toLowerCase() === ".pdf" ? filePath : `${filePath}.pdf`;
    await escribirAtomico(ruta, bytes);
    return { id: registro.registrar(ruta), nombre: ruta.split(sep).at(-1) };
  });
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: "Editor PDF",
    webPreferences: {
      preload: join(AQUI, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  ventana.once("ready-to-show", () => ventana.show());
  ventana.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  ventana.webContents.on("will-navigate", (evento, url) => {
    if (!url.startsWith(`${ORIGEN}/`)) evento.preventDefault();
  });
  // La página avisa (beforeunload) si hay anotaciones sin guardar; en Electron eso bloquea el cierre en silencio.
  ventana.webContents.on("will-prevent-unload", (evento) => {
    const eleccion = dialog.showMessageBoxSync(ventana, {
      type: "question",
      buttons: ["Salir sin guardar", "Cancelar"],
      defaultId: 1,
      cancelId: 1,
      title: "Anotaciones sin guardar",
      message: "Hay anotaciones sin guardar. ¿Salir igual?",
    });
    if (eleccion === 0) evento.preventDefault();
  });
  ventana.loadURL(`${ORIGEN}/index.html`);
  return ventana;
}

app.whenReady().then(() => {
  protocol.handle("app", servir);
  registrarCanales();
  crearVentana();
});

app.on("window-all-closed", () => app.quit());
