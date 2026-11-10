// Estado del editor. Fuente de verdad = archivos del proyecto; aquí vive la copia en memoria + historial (deshacer).
// Flujo de una edición: parche optimista (data + eventos) → la vista previa cambia al instante → guardado con debounce →
// `reel datos` en segundo plano regenera src/data.json con la lógica oficial → se recarga si no hubo cambios más nuevos.
import {create} from 'zustand';
import {temporal} from 'zundo';
import {useMemo} from 'react';
import type {Archivo, ProyectoInfo, Snapshot, Trabajo} from '@shared/tipos';
import type {Obj, Sel} from '@shared/elementos';
import {cuadroTrasCorte, modeloCorte, reanclar, type ModeloCorte, type Palabras, type Plan, type TramoEdl} from '@shared/cortes';
import {ir, useReloj} from './reloj';

export type Doc = 'data' | 'estilo' | 'vlog' | 'eventos' | 'plan' | 'notas' | 'proyecto' | 'edl' | 'planCortado';
export const ARCHIVO_DE: Record<Doc, Archivo> = {
  data: 'src/data.json',
  estilo: 'src/estilo.json',
  vlog: 'src/vlog.json',
  eventos: 'edicion/eventos.json',
  plan: 'edicion/plan.json',
  notas: 'edicion/notas.json',
  proyecto: 'edicion/proyecto.json',
  edl: 'edicion/edl_final.json',
  planCortado: 'edicion/plan_cortado.json',
};
const DOC_DE = Object.fromEntries(Object.entries(ARCHIVO_DE).map(([k, v]) => [v, k])) as Record<Archivo, Doc>;
// documentos que el usuario edita (con historial) y cuáles disparan `reel datos`
const EDITABLES: Doc[] = ['eventos', 'estilo', 'plan', 'notas', 'vlog'];
const REGENERAN_DATOS: Doc[] = ['eventos', 'estilo'];

type Docs = {data: Obj | null; estilo: Obj | null; vlog: Obj | null; eventos: Obj | null; plan: Obj | null; notas: Obj[] | null; proyecto: Obj | null; edl: Obj[] | null; planCortado: Obj | null};

export type Aviso = {id: number; tipo: 'ok' | 'error' | 'info'; texto: string};

type Estado = Docs & {
  info: ProyectoInfo | null;
  hashes: Partial<Record<Doc, string | null>>;
  sucios: Doc[]; // pendientes de guardar
  sel: Sel | null;
  palabras: Palabras; // transcripción de cada clip (edicion/palabras/*.json)
  aplicando: boolean; // se está regenerando el video con los recortes
  piezaAbierta: number | null; // pieza expandida en el panel Cortes
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
      planCortado: null,
      hashes: {},
      sucios: [],
      sel: null,
      palabras: {},
      aplicando: false,
      piezaAbierta: null,
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
        // proyectos cortados antes de que existiera plan_cortado.json: lo que hay al abrir cuenta como ya cortado
        docs.planCortado = docs.planCortado ?? docs.plan;
        set({...docs, info: s.info, hashes, sucios: [], sel: null, palabras: {}, aplicando: false, piezaAbierta: null, calidad: s.info.estado.proxy && prefs.calidad === 'proxy' ? 'proxy' : 'completa'});
        useEditor.temporal.getState().clear();
      },
      cerrar: () => set({info: null, data: null, eventos: null, estilo: null, plan: null, planCortado: null, notas: null, sel: null, palabras: {}}),
      editar: (cambios, opts) => {
        const docs = Object.keys(cambios) as Doc[];
        const sucios = [...new Set([...get().sucios, ...docs.filter((d) => EDITABLES.includes(d))])];
        const afecta = !opts?.sinDatos && docs.some((d) => REGENERAN_DATOS.includes(d));
        set({...(cambios as Partial<Estado>), sucios, verEdicion: get().verEdicion + (afecta ? 1 : 0)});
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
const cancelarGuardado = () => {
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
};
const programarGuardado = (datos: boolean) => {
  cancelarGuardado();
  temporizador = setTimeout(() => guardar(datos), 450);
};
let datosPendientes = false;

export const guardar = async (datos = false) => {
  cancelarGuardado();
  const s = useEditor.getState();
  if (!s.info) return;
  datosPendientes = datosPendientes || datos;
  for (const doc of s.sucios) {
    const contenido = useEditor.getState()[doc];
    const r = await window.reel.escribir(s.info.id, ARCHIVO_DE[doc], contenido, s.hashes[doc] ?? null);
    if (r.ok) {
      // si se editó otra vez mientras se escribía, sigue pendiente: el siguiente guardado lo lleva al disco
      const cambio = useEditor.getState()[doc] !== contenido;
      useEditor.setState({hashes: {...useEditor.getState().hashes, [doc]: r.hash}, sucios: cambio ? useEditor.getState().sucios : useEditor.getState().sucios.filter((d) => d !== doc)});
      if (cambio) programarGuardado(datos);
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

// ---------------------------------------------------------------- corte: lo que muestra la línea de tiempo
export const cargarPalabras = async (id: string, clips: string[]) => {
  const r: Palabras = {};
  for (const c of clips) {
    const t = await window.reel.leerTexto(id, `edicion/palabras/${c}.json`);
    if (t) r[c] = JSON.parse(t);
  }
  if (useEditor.getState().info?.id === id) useEditor.setState({palabras: r});
};

let memoM: {plan: unknown; edl: unknown; pal: unknown; m: ModeloCorte | null} = {plan: 0, edl: 0, pal: 0, m: null};
export const modeloDe = (s: Pick<Estado, 'plan' | 'edl' | 'palabras'>): ModeloCorte | null => {
  if (memoM.plan !== s.plan || memoM.edl !== s.edl || memoM.pal !== s.palabras) memoM = {plan: s.plan, edl: s.edl, pal: s.palabras, m: modeloCorte(s.plan as Plan | null, s.edl as TramoEdl[] | null, s.palabras)};
  return memoM.m;
};
export const useModeloCorte = () => {
  const plan = useEditor((s) => s.plan);
  const edl = useEditor((s) => s.edl);
  const palabras = useEditor((s) => s.palabras);
  return useMemo(() => modeloDe({plan, edl, palabras}), [plan, edl, palabras]);
};
// ¿el plan actual es distinto del que produjo public/cut.mp4?
let memoP: {a: unknown; b: unknown; r: boolean} = {a: 0, b: 0, r: false};
export const hayCortePendiente = (s: Pick<Estado, 'plan' | 'planCortado'>) => {
  if (memoP.a !== s.plan || memoP.b !== s.planCortado) memoP = {a: s.plan, b: s.planCortado, r: !!s.plan && !!s.planCortado && JSON.stringify(s.plan.piezas) !== JSON.stringify(s.planCortado.piezas)};
  return memoP.r;
};
export const useCortePendiente = () => useEditor(hayCortePendiente);

// Aplica los recortes: regenera el video y actualiza las anclas (también las del historial, para que deshacer siga siendo válido).
// El orden importa: las anclas se reescriben con el edl_final real, después de cortar y antes de `reel datos`.
export const aplicarCorte = async (op: {verificar?: boolean} = {}): Promise<boolean> => {
  const s = useEditor.getState();
  if (!s.info || s.aplicando) return false;
  const id = s.info.id;
  const viejo = s.edl as TramoEdl[] | null;
  const f0 = useReloj.getState().frame;
  const teniaProxy = s.info.estado.proxy;
  useEditor.setState({aplicando: true});
  try {
    datosPendientes = false;
    await guardar(false);
    const ok = await window.reel.cadena(id, [
      {titulo: 'Preparando', comando: ['edl']},
      {titulo: 'Cortando', comando: op.verificar ? ['cortar', '--verificar'] : ['cortar']},
    ]);
    if (!ok) return false;
    const c = await window.reel.leer(id, ARCHIVO_DE.edl);
    const nuevo = (c?.contenido ?? null) as TramoEdl[] | null;
    conPausa(() => useEditor.setState({edl: nuevo as Obj[] | null, hashes: {...useEditor.getState().hashes, edl: c?.hash ?? null}}));
    let movidas = 0;
    const ev = useEditor.getState().eventos;
    if (viejo?.length && nuevo?.length && ev) {
      const memo = new Map<unknown, Obj>();
      const convertir = (e: Obj) => {
        if (!memo.has(e)) memo.set(e, reanclar(e, viejo, nuevo).eventos);
        return memo.get(e)!;
      };
      const r = reanclar(ev, viejo, nuevo);
      movidas = r.movidas;
      memo.set(ev, r.eventos);
      const t = useEditor.temporal;
      const pasar = <T extends Partial<Estado>>(l: T[]) => l.map((x) => (x.eventos ? {...x, eventos: convertir(x.eventos)} : x));
      t.setState({pastStates: pasar(t.getState().pastStates), futureStates: pasar(t.getState().futureStates)});
      if (JSON.stringify(r.eventos) !== JSON.stringify(ev)) {
        conPausa(() => useEditor.setState({eventos: r.eventos, sucios: [...new Set([...useEditor.getState().sucios, 'eventos' as Doc])]}));
        await guardar(false);
      }
    }
    useEditor.setState({verDatosPedidos: useEditor.getState().verEdicion});
    const okDatos = await window.reel.cadena(id, [{titulo: 'Actualizando datos', comando: ['datos']}]);
    useEditor.setState({info: await window.reel.info(id), sel: null});
    for (const d of ['data', 'edl', 'planCortado', 'plan'] as Doc[]) await useEditor.getState().recargar(d);
    if (!okDatos) return false;
    if (viejo?.length && nuevo?.length) {
      const destino = cuadroTrasCorte(f0, viejo, nuevo);
      setTimeout(() => ir(destino), 60);
    }
    const dur = nuevo?.length ? (nuevo[nuevo.length - 1].start + nuevo[nuevo.length - 1].frames) / 30 : 0;
    useEditor.getState().avisar('ok', `Recortes aplicados · el video dura ${dur.toFixed(1)} s${movidas ? ` · ${movidas} elemento${movidas === 1 ? '' : 's'} se movió a la palabra más cercana` : ''}`);
    if (teniaProxy) window.reel.correr(id, 'Proxy', ['proxy']);
    return true;
  } finally {
    useEditor.setState({aplicando: false});
  }
};

export const docDeArchivo = (a: string): Doc | undefined => DOC_DE[a as Archivo];
