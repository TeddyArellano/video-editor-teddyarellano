// Acciones de edición sobre la línea de tiempo (las usan la barra y los atajos). Recortan el plan: la vista previa se salta lo
// quitado al instante y "Aplicar recortes" regenera el video.
import {bloqueEn, corteVecino, dividirEn, moverPieza, quitarRango, rangoAPalabras, recortarHasta, restaurarRango, type Plan, type TramoEdl} from '@shared/cortes';
import {aplicarTiempo, bloques, duplicarEvento, quitarEvento} from '@shared/elementos';
import {aplicarCorte, modeloDe, useEditor} from '@/store';
import {ir, useReloj} from '@/reloj';
import {useVista} from './vista';

const ctx = () => {
  const s = useEditor.getState();
  const m = modeloDe(s);
  const plan = s.plan as Plan | null;
  return m && plan ? {s, m, plan, f: useReloj.getState().frame} : null;
};
const setPlan = (p: Plan | null, siNo: string) => {
  if (p) useEditor.getState().editar({plan: p});
  else useEditor.getState().avisar('info', siNo);
};
const bloqueSel = () => {
  const s = useEditor.getState();
  return s.sel && s.data ? bloques(s.data).find((b) => b.sel.lista === s.sel!.lista && b.sel.i === s.sel!.i) : undefined;
};
const moverSel = (a: number, b: number) => {
  const s = useEditor.getState();
  if (!s.sel || !s.data) return;
  const r = aplicarTiempo(s.data, s.eventos ?? {}, s.sel, a, b, false);
  s.editar({data: r.data, eventos: r.eventos});
};

export const dividir = (frame?: number) => {
  const c = ctx();
  if (c) setPlan(dividirEn(c.plan, c.m, frame ?? c.f), 'Aquí ya hay un corte: mueve el cabezal dentro de un tramo.');
};

// Q / W: con un elemento seleccionado mueve su inicio o su final al cabezal; si no, recorta el tramo del corte hasta el cabezal
export const recortar = (lado: 'ini' | 'fin') => {
  const b = bloqueSel();
  const f = useReloj.getState().frame;
  if (b) {
    if (lado === 'ini' && f < b.b - 2) moverSel(f, b.b);
    if (lado === 'fin' && f > b.a + 2) moverSel(b.a, f);
    return;
  }
  const c = ctx();
  if (c) setPlan(recortarHasta(c.plan, c.m, c.f, lado), 'No hay nada que recortar en este punto.');
};

export const quitarSeleccion = () => {
  const {rango, set} = useVista.getState();
  const c = ctx();
  if (rango && c) {
    set({rango: null});
    return setPlan(quitarRango(c.plan, c.m, rango.a, rango.b), '');
  }
  const s = useEditor.getState();
  if (s.sel && s.data) {
    const r = quitarEvento(s.data, s.eventos ?? {}, s.sel);
    s.seleccionar(null);
    s.editar({data: r.data, eventos: r.eventos});
  }
};

export const restaurarSeleccion = () => {
  const c = ctx();
  if (!c || !c.s.edl) return;
  const {rango, set} = useVista.getState();
  const b = bloqueEn(c.m, c.f);
  const objetivo = rango ?? (b?.quitada ? {a: b.a, b: b.b} : null);
  if (!objetivo) return c.s.avisar('info', 'Selecciona una parte tachada para recuperarla.');
  set({rango: null});
  c.s.editar({plan: restaurarRango(c.plan, c.m, c.s.edl as TramoEdl[], c.s.palabras, objetivo.a, objetivo.b)});
};

export const marcar = (lado: 'a' | 'b') => {
  const c = ctx();
  if (!c) return;
  const {rango, set} = useVista.getState();
  const a = lado === 'a' ? c.f : (rango?.a ?? 0);
  const b = lado === 'b' ? c.f + 1 : (rango?.b ?? c.m.total);
  if (b <= a) return set({rango: lado === 'a' ? {a, b: c.m.total} : {a: 0, b}});
  const [x, y] = rangoAPalabras(c.m, a, b);
  set({rango: {a: x, b: y}});
};

export const irCorte = (dir: -1 | 1) => {
  const c = ctx();
  if (c) ir(corteVecino(c.m, c.f, dir));
};

// mover la pieza seleccionada un lugar en el orden del video
export const moverSeleccion = (dir: -1 | 1) => {
  const c = ctx();
  const r = useVista.getState().rango;
  if (!c || !r) return;
  const b = bloqueEn(c.m, r.a);
  if (!b || b.quitada) return;
  useVista.getState().set({rango: null});
  c.s.editar({plan: moverPieza(c.plan, b.pieza, dir)});
};

export const empujarElemento = (d: number) => {
  const b = bloqueSel();
  if (b) moverSel(b.a + d, b.b + d);
};

export const duplicarElemento = () => {
  const s = useEditor.getState();
  if (!s.sel || !s.data) return;
  const r = duplicarEvento(s.data, s.eventos ?? {}, s.sel);
  if (!r) return s.avisar('info', 'Este elemento no se puede duplicar.');
  s.editar({data: r.data, eventos: r.eventos});
  s.seleccionar(r.sel);
};

export const aplicar = () => aplicarCorte();
