// Puente tipado entre la interfaz y el proceso principal (window.reel). La interfaz no tiene acceso a Node.
import {contextBridge, ipcRenderer, type IpcRendererEvent} from 'electron';
import type {CambioArchivo, EventoClaude, ReelAPI, Trabajo} from '../shared/tipos';

const on = <T>(canal: string, fn: (x: T) => void) => {
  const h = (_e: IpcRendererEvent, x: T) => fn(x);
  ipcRenderer.on(canal, h);
  return () => ipcRenderer.removeListener(canal, h);
};

const api: ReelAPI = {
  recientes: () => ipcRenderer.invoke('recientes'),
  elegirCarpeta: (t) => ipcRenderer.invoke('elegirCarpeta', t),
  elegirArchivo: (f) => ipcRenderer.invoke('elegirArchivo', f),
  abrir: (r) => ipcRenderer.invoke('abrir', r),
  cerrar: (id) => ipcRenderer.invoke('cerrar', id),
  leer: (id, a) => ipcRenderer.invoke('leer', id, a),
  escribir: (id, a, c, h) => ipcRenderer.invoke('escribir', id, a, c, h),
  leerTexto: (id, r) => ipcRenderer.invoke('leerTexto', id, r),
  listar: (id, r) => ipcRenderer.invoke('listar', id, r),
  info: (id) => ipcRenderer.invoke('info', id),
  correr: (id, t, c) => ipcRenderer.invoke('correr', id, t, c),
  cadena: (id, p) => ipcRenderer.invoke('cadena', id, p),
  fuenteDe: (id, c) => ipcRenderer.invoke('fuenteDe', id, c),
  cancelar: (t) => ipcRenderer.invoke('cancelar', t),
  trabajos: () => ipcRenderer.invoke('trabajos'),
  herramientas: () => ipcRenderer.invoke('herramientas'),
  mostrarEnFinder: (r) => ipcRenderer.invoke('mostrarEnFinder', r),
  copiarAPublic: (id, o, d) => ipcRenderer.invoke('copiarAPublic', id, o, d),
  preferencias: () => ipcRenderer.invoke('preferencias'),
  guardarPreferencias: (p) => ipcRenderer.invoke('guardarPreferencias', p),
  buscarActualizaciones: () => ipcRenderer.invoke('buscarActualizaciones'),
  actualizarApp: () => ipcRenderer.invoke('actualizarApp'),
  repararToolkit: () => ipcRenderer.invoke('repararToolkit'),
  reiniciar: () => ipcRenderer.invoke('reiniciar'),
  estilos: () => ipcRenderer.invoke('estilos'),
  leerEstilo: (id) => ipcRenderer.invoke('leerEstilo', id),
  guardarEstilo: (id, c) => ipcRenderer.invoke('guardarEstilo', id, c),
  claude: (id, p) => ipcRenderer.invoke('claude', id, p),
  claudeCancelar: (s) => ipcRenderer.invoke('claudeCancelar', s),
  onCambio: (fn) => on<CambioArchivo>('cambio', fn),
  onTrabajo: (fn) => on<Trabajo>('trabajo', fn),
  onClaude: (fn) => on<EventoClaude>('claude', fn),
  onAbrir: (fn) => on<string>('abrir-ruta', fn),
};

contextBridge.exposeInMainWorld('reel', api);
