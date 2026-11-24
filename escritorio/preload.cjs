// Puente mínimo entre la página y el proceso principal (contextIsolation + sandbox).
// La página no recibe Node ni rutas: solo estas cuatro funciones.
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("editorEscritorio", {
  /** Diálogo nativo para abrir. → { nombre, bytes, id } o null si se canceló. */
  abrir: () => ipcRenderer.invoke("pdf:abrir"),
  /** Un PDF arrastrado a la ventana: se registra su ruta para poder guardar en el mismo archivo. → id o null. */
  registrarArrastrado: (archivo) => {
    const ruta = webUtils.getPathForFile(archivo);
    return ruta ? ipcRenderer.invoke("pdf:registrar", ruta) : Promise.resolve(null);
  },
  /** Sobrescribe el archivo abierto con ese id. */
  guardar: (id, bytes) => ipcRenderer.invoke("pdf:guardar", id, bytes),
  /** Diálogo nativo «Guardar como». → { id, nombre } o null si se canceló. */
  guardarComo: (nombre, bytes) => ipcRenderer.invoke("pdf:guardar-como", nombre, bytes),
});
