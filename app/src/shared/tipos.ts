// Tipos compartidos entre el proceso principal (Node) y la interfaz (React).

// Archivos del proyecto que la app lee, vigila y edita (rutas relativas a proyecto_remotion/)
export const ARCHIVOS = [
  'src/data.json',
  'src/estilo.json',
  'src/vlog.json',
  'edicion/eventos.json',
  'edicion/plan.json',
  'edicion/proyecto.json',
  'edicion/notas.json',
  'edicion/edl_final.json',
  'edicion/plan_cortado.json',
] as const;
export type Archivo = (typeof ARCHIVOS)[number];

export type ContenidoArchivo = {contenido: unknown; hash: string} | null;

export type EstadoProyecto = {
  transcrito: boolean;
  plan: boolean;
  cortado: boolean;
  datos: boolean;
  borrador: boolean;
  final: boolean;
  proxy: boolean;
  componentesPropios: string[]; // componentes de src/components distintos a los de la plantilla
};

export type ProyectoInfo = {
  id: string;
  ruta: string; // carpeta proyecto_remotion
  carpeta: string; // carpeta del material (fuentes)
  nombre: string;
  estilo: string;
  base: string; // URL base de public/ para la vista previa (reel-media://p/<id>/)
  versionCorte: number; // cambia cuando se regenera el video: obliga al reproductor a pedir el archivo nuevo
  estado: EstadoProyecto;
  clips: string[]; // clips con transcripción (edicion/palabras/*.json)
};

export type Snapshot = {info: ProyectoInfo; archivos: Record<Archivo, ContenidoArchivo>};

// abierto = última vez en la app (0 si solo se ha editado con la skill) · editado = último comando de reel.py
export type Reciente = {ruta: string; nombre: string; abierto: number; editado: number; estilo?: string};

export type ResultadoEscritura = {ok: true; hash: string} | {ok: false; conflicto: true; actual: ContenidoArchivo};

// línea de salida de `reel.py --json`
export type LineaReel = {tipo: 'ok' | 'error' | 'aviso' | 'siguiente' | 'progreso' | 'info'; msg: string; pct?: number};

export type Trabajo = {
  id: string;
  proyecto: string;
  titulo: string;
  comando: string[];
  estado: 'en_cola' | 'corriendo' | 'ok' | 'error' | 'cancelado';
  pct?: number;
  ultimo?: string;
  lineas: LineaReel[];
  inicio?: number;
  fin?: number;
};

export type CambioArchivo = {proyecto: string; archivo: Archivo | 'public/cut.mp4'; hash: string | null};

export type Herramientas = {python: string; reel: string; skill: string; toolkit: boolean; detalles: string[]};

export type Preferencias = {skill: string; python: string; tema: 'oscuro' | 'claro'; calidad: 'proxy' | 'completa'};

export type EstadoActualizacion = {repo: string; rama: string; atras: number; adelante: number; cambiosLocales: boolean; ultimo: string; error?: string};

// API que el preload expone en window.reel
export type ReelAPI = {
  recientes: () => Promise<Reciente[]>;
  miniatura: (ruta: string) => Promise<string | null>;
  buscarProyectos: (carpeta: string) => Promise<string>;
  onRecientes: (fn: () => void) => () => void;
  elegirCarpeta: (titulo?: string) => Promise<string | null>;
  elegirArchivo: (filtros?: {name: string; extensions: string[]}[]) => Promise<string | null>;
  abrir: (ruta: string) => Promise<Snapshot>;
  cerrar: (id: string) => Promise<void>;
  leer: (id: string, archivo: Archivo) => Promise<ContenidoArchivo>;
  escribir: (id: string, archivo: Archivo, contenido: unknown, hashPrevio: string | null) => Promise<ResultadoEscritura>;
  leerTexto: (id: string, rel: string) => Promise<string | null>;
  listar: (id: string, rel: string) => Promise<string[]>;
  info: (id: string) => Promise<ProyectoInfo>;
  correr: (id: string, titulo: string, comando: string[]) => Promise<string>;
  cadena: (id: string, pasos: {titulo: string; comando: string[]}[]) => Promise<boolean>;
  fuenteDe: (id: string, clip: string) => Promise<string | null>;
  cancelar: (trabajo: string) => Promise<void>;
  trabajos: () => Promise<Trabajo[]>;
  herramientas: () => Promise<Herramientas>;
  mostrarEnFinder: (ruta: string) => Promise<void>;
  copiarAPublic: (id: string, origen: string, destinoRel: string) => Promise<string>;
  preferencias: () => Promise<Preferencias>;
  guardarPreferencias: (p: Partial<Preferencias>) => Promise<Preferencias>;
  buscarActualizaciones: () => Promise<EstadoActualizacion>;
  actualizarApp: () => Promise<string>;
  repararToolkit: () => Promise<string>;
  probarToolkit: () => Promise<string>;
  reiniciar: () => Promise<void>;
  estilos: () => Promise<{estilos: {id: string; nombre: string; descripcion?: string}[]; marcas: {id: string; nombre: string}[]}>;
  leerEstilo: (id: string) => Promise<unknown>;
  guardarEstilo: (id: string, contenido: unknown) => Promise<void>;
  claude: (id: string, prompt: string) => Promise<string>;
  copiar: (texto: string) => Promise<void>;
  publicarRevision: (id: string) => Promise<string>;
  claudeCancelar: (sesion: string) => Promise<void>;
  onCambio: (fn: (c: CambioArchivo) => void) => () => void;
  onTrabajo: (fn: (t: Trabajo) => void) => () => void;
  onClaude: (fn: (e: EventoClaude) => void) => () => void;
  onAbrir: (fn: (ruta: string) => void) => () => void;
};

export type EventoClaude = {sesion: string; tipo: 'texto' | 'herramienta' | 'fin' | 'error'; texto: string};
