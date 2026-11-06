// Estado del editor. Fuente de verdad = archivos del proyecto; aquí vive la copia en memoria + historial (deshacer).
// Flujo de una edición: parche optimista (data + eventos) → la vista previa cambia al instante → guardado con debounce →
// `reel datos` en segundo plano regenera src/data.json con la lógica oficial → se recarga si no hubo cambios más nuevos.
import {create} from 'zustand';
import {temporal} from 'zundo';
import type {Archivo, ProyectoInfo, Snapshot, Trabajo} from '@shared/tipos';
import type {Obj, Sel} from '@shared/elementos';

export type Doc = 'data' | 'estilo' | 'vlog' | 'eventos' | 'plan' | 'notas' | 'proyecto' | 'edl';
export const ARCHIVO_DE: Record<Doc, Archivo> = {
  data: 'src/data.json',
  estilo: 'src/estilo.json',
  vlog: 'src/vlog.json',
  eventos: 'edicion/eventos.json',
  plan: 'edicion/plan.json',
  notas: 'edicion/notas.json',
  proyecto: 'edicion/proyecto.json',
  edl: 'edicion/edl_final.json',
};
const DOC_DE = Object.fromEntries(Object.entries(ARCHIVO_DE).map(([k, v]) => [v, k])) as Record<Archivo, Doc>;
// documentos que el usuario edita (con historial) y cuáles disparan `reel datos`
const EDITABLES: Doc[] = ['eventos', 'estilo', 'plan', 'notas', 'vlog'];
const REGENERAN_DATOS: Doc[] = ['eventos', 'estilo'];

type Docs = {data: Obj | null; estilo: Obj | null; vlog: Obj | null; eventos: Obj | null; plan: Obj | null; notas: Obj[] | null; proyecto: Obj | null; edl: Obj[] | null};

export type Aviso = {id: number; tipo: 'ok' | 'error' | 'info'; texto: string};

type Estado = Docs & {
  info: ProyectoInfo | null;
  hashes: Partial<Record<Doc, string | null>>;
  sucios: Doc[]; // pendientes de guardar
  sel: Sel | null;
  corteDesactualizado: boolean;
  calidad: 'proxy' | 'completa';
  panel: string;
  avisos: Aviso[];
  trabajos: Trabajo[];
  verEdicion: number; // sube con cada cambio que afecta data
  verDatosPedidos: number; // verEdicion del último `reel datos` pedido
  cargar: (s: Snapshot) => void;
  cerrar: () => void;
  editar: (cambios: Partial<Docs>, opts?: {sinDatos?: boolean}) => void;
  seleccionar: (s: Sel | null) => void;
  recargar: (doc: Doc) => Promise<void>;
  avisar: (tipo: Aviso['tipo'], texto: string) => void;
  set: (p: Partial<Estado>) => void;
};

let idAviso = 0;
// calidad preferida al abrir un proyecto (Preferencias)
export const prefs = {calidad: 'proxy' as 'proxy' | 'completa'};
let temporizador: ReturnType<typeof setTimeout> | null = null;

export const useEditor = create<Estado>()(
  temporal(
    (set, get) => ({
      info: null,
      data: null,
      estilo: null,
      vlog: null,
      eventos: null,
      plan: null,
      notas: null,
      proyecto: null,
      edl: null,
      hashes: {},
      sucios: [],
      sel: null,
      corteDesactualizado: false,
      calidad: 'proxy',
      panel: 'inspector',
      avisos: [],
      trabajos: [],
      verEdicion: 0,
      verDatosPedidos: 0,
      cargar: (s) => {
        const docs = {} as Docs;
        const hashes: Partial<Record<Doc, string | null>> = {};
        for (const [doc, arch] of Object.entries(ARCHIVO_DE) as [Doc, Archivo][]) {
          const c = s.archivos[arch];
          (docs as Obj)[doc] = c?.contenido ?? (doc === 'eventos' ? {} : doc === 'notas' ? [] : null);
          hashes[doc] = c?.hash ?? null;
        }
        set({...docs, info: s.info, hashes, sucios: [], sel: null, corteDesactualizado: false, calidad: s.info.estado.proxy && prefs.calidad === 'proxy' ? 'proxy' : 'completa'});
        useEditor.temporal.getState().clear();
      },
      cerrar: () => set({info: null, data: null, eventos: null, estilo: null, plan: null, notas: null, sel: null}),
      editar: (cambios, opts) => {
        const docs = Object.keys(cambios) as Doc[];
        const sucios = [...new Set([...get().sucios, ...docs.filter((d) => EDITABLES.includes(d))])];
        const afecta = !opts?.sinDatos && docs.some((d) => REGENERAN_DATOS.includes(d));
        set({...(cambios as Partial<Estado>), sucios, verEdicion: get().verEdicion + (afecta ? 1 : 0), corteDesactualizado: get().corteDesactualizado || docs.includes('plan')});
        programarGuardado(afecta);
      },
      seleccionar: (sel) => set({sel}),
      recargar: async (doc) => {
        const info = get().info;
        if (!info || get().sucios.includes(doc)) return; // cambios propios sin guardar: no se pisan
        const c = await window.reel.leer(info.id, ARCHIVO_DE[doc]);
        if (c && c.contenido === null) return; // a medio escribir: llegará otro aviso
        conPausa(() => set({[doc]: c?.contenido ?? null, hashes: {...get().hashes, [doc]: c?.hash ?? null}} as Partial<Estado>));
      },
      avisar: (tipo, texto) => {
        const id = ++idAviso;
        set({avisos: [...get().avisos, {id, tipo, texto}]});
        setTimeout(() => set({avisos: useEditor.getState().avisos.filter((a) => a.id !== id)}), tipo === 'error' ? 9000 : 3500);
      },
      set: (p) => set(p),
    }),
    {
      // solo lo que el usuario edita entra al historial
      partialize: (s) => ({data: s.data, eventos: s.eventos, estilo: s.estilo, plan: s.plan, notas: s.notas, vlog: s.vlog}),
      equality: (a, b) => a.data === b.data && a.eventos === b.eventos && a.estilo === b.estilo && a.plan === b.plan && a.notas === b.notas && a.vlog === b.vlog,
      limit: 200,
    },
  ),
);

// cambios que vienen de fuera (reel datos, Claude): no entran al historial de deshacer
export const conPausa = (fn: () => void) => {
  const t = useEditor.temporal.getState();
  t.pause();
  try {
    fn();
  } finally {
    t.resume();
  }
};

// ---------------------------------------------------------------- guardado
const programarGuardado = (datos: boolean) => {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => guardar(datos), 450);
};
let datosPendientes = false;

export const guardar = async (datos = false) => {
  temporizador = null;
  const s = useEditor.getState();
  if (!s.info) return;
  datosPendientes = datosPendientes || datos;
  for (const doc of s.sucios) {
    const contenido = useEditor.getState()[doc];
    const r = await window.reel.escribir(s.info.id, ARCHIVO_DE[doc], contenido, s.hashes[doc] ?? null);
    if (r.ok) {
      useEditor.setState({hashes: {...useEditor.getState().hashes, [doc]: r.hash}, sucios: useEditor.getState().sucios.filter((d) => d !== doc)});
    } else {
      // alguien más (Claude, reel.py) lo cambió: gana lo del disco y se avisa
      conPausa(() => useEditor.setState({[doc]: r.actual?.contenido ?? null, hashes: {...useEditor.getState().hashes, [doc]: r.actual?.hash ?? null}, sucios: useEditor.getState().sucios.filter((d) => d !== doc)} as Partial<Estado>));
      s.avisar('error', `${ARCHIVO_DE[doc]} cambió fuera de la app (¿Claude?). Se recargó la versión del disco; repite tu último cambio si hace falta.`);
    }
  }
  if (datosPendientes && useEditor.getState().sucios.length === 0 && useEditor.getState().data) {
    datosPendientes = false;
    pedirDatos();
  }
};

export const pedirDatos = async () => {
  const s = useEditor.getState();
  if (!s.info || !s.info.estado.cortado) return;
  useEditor.setState({verDatosPedidos: s.verEdicion});
  await window.reel.correr(s.info.id, 'Actualizar datos', ['datos']);
};

// ¿hay un `reel datos` en cola o corriendo para este proyecto?
export const datosEnCurso = () => {
  const s = useEditor.getState();
  return s.trabajos.some((t) => t.proyecto === s.info?.id && t.comando[0] === 'datos' && (t.estado === 'en_cola' || t.estado === 'corriendo'));
};

// data.json nuevo en disco: se acepta solo si no hay ediciones más nuevas esperando su propio `reel datos`
export const aceptarDataExterna = () => {
  const s = useEditor.getState();
  if (s.sucios.length || temporizador || datosEnCurso() || s.verDatosPedidos < s.verEdicion) return false;
  return true;
};

export const docDeArchivo = (a: string): Doc | undefined => DOC_DE[a as Archivo];
